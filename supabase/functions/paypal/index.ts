// Supabase Edge Function: paypal  (keep "Verify JWT" ON — only signed-in students may call it)
//
//   POST {action:'create',  pack_id}   → creates a PayPal order at the server-side price, returns {url} to send the student to PayPal
//   POST {action:'capture', order_id}  → after PayPal sends the student back: takes the payment, checks it, then adds the credits
//
// Secrets (Edge Functions → Secrets): PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENV ("sandbox" or "live"), SITE_URL.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const env = (k: string) => Deno.env.get(k) ?? '';
const SUPABASE_URL = env('SUPABASE_URL');
const SITE_URL = env('SITE_URL').replace(/\/$/, '');
const PAYPAL_BASE = env('PAYPAL_ENV').trim().toLowerCase() === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const admin = createClient(SUPABASE_URL, env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function paypalToken(): Promise<string> {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${env('PAYPAL_CLIENT_ID').trim()}:${env('PAYPAL_CLIENT_SECRET').trim()}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`PayPal sign-in failed (${data.error ?? res.status}): ${data.error_description ?? ''}`);
  return data.access_token;
}

async function paypal(token: string, method: string, path: string, body?: unknown, requestId?: string) {
  const res = await fetch(`${PAYPAL_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(requestId ? { 'PayPal-Request-Id': requestId } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { /* non-JSON error body */ }
  return { ok: res.ok, status: res.status, data };
}

const money = (cents: number) => (cents / 100).toFixed(2);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  try {
    // Who is calling? The student's own sign-in is used for everything they may do themselves.
    const auth = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, req.headers.get('apikey') || env('SUPABASE_ANON_KEY'), {
      auth: { persistSession: false },
      global: { headers: { Authorization: auth } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) return json({ error: 'Please sign in again.' }, 401);

    const body = await req.json();

    // ───────── create ─────────
    if (body.action === 'create') {
      // create_order() uses the server-side pack price; the browser never sends an amount.
      const { data: orderId, error } = await userClient.rpc('create_order', { p_pack_id: String(body.pack_id), p_provider: 'paypal' });
      if (error) return json({ error: error.message }, 400);

      const { data: order } = await admin.from('orders').select('id, credits, amount_cents, currency').eq('id', orderId).single();
      if (!order) return json({ error: 'Order not found' }, 500);

      const token = await paypalToken();
      const pp = await paypal(token, 'POST', '/v2/checkout/orders', {
        intent: 'CAPTURE',
        purchase_units: [{
          reference_id: order.id,
          custom_id: order.id,
          description: `${order.credits} lesson credit${order.credits > 1 ? 's' : ''} — The Blooming Bilingual`,
          amount: { currency_code: order.currency.toUpperCase(), value: money(order.amount_cents) },
        }],
        payment_source: {
          paypal: {
            experience_context: {
              brand_name: 'The Blooming Bilingual',
              user_action: 'PAY_NOW',
              shipping_preference: 'NO_SHIPPING',
              return_url: `${SITE_URL}/payment/return?order=${order.id}`,
              cancel_url: `${SITE_URL}/payment/cancelled?order=${order.id}`,
            },
          },
        },
      }, order.id);
      if (!pp.ok) { console.error('PayPal create failed', JSON.stringify(pp.data)); return json({ error: 'PayPal could not start the payment.' }, 502); }

      const link = (pp.data.links ?? []).find((l: any) => l.rel === 'payer-action' || l.rel === 'approve');
      if (!link) return json({ error: 'PayPal did not return a payment link.' }, 502);
      await admin.from('orders').update({ provider_ref: pp.data.id }).eq('id', order.id);
      return json({ url: link.href });
    }

    // ───────── capture ─────────
    if (body.action === 'capture') {
      // RLS: a student can only read their own orders.
      const { data: order } = await userClient.from('orders')
        .select('id, student_id, credits, amount_cents, currency, status, provider_ref').eq('id', String(body.order_id)).maybeSingle();
      if (!order) return json({ error: 'Order not found.' }, 404);
      if (order.status === 'paid') return json({ ok: true, credits: order.credits, already: true });
      if (!order.provider_ref) return json({ error: 'This order was never sent to PayPal.' }, 400);

      const token = await paypalToken();
      let pp = await paypal(token, 'POST', `/v2/checkout/orders/${order.provider_ref}/capture`, {}, `capture-${order.id}`);
      // Already captured (for example the page was reloaded): read the order instead.
      if (!pp.ok && JSON.stringify(pp.data).includes('ORDER_ALREADY_CAPTURED')) {
        pp = await paypal(token, 'GET', `/v2/checkout/orders/${order.provider_ref}`);
      }
      if (!pp.ok) { console.error('PayPal capture failed', JSON.stringify(pp.data)); return json({ error: 'PayPal could not confirm the payment. You have not been charged unless PayPal says so.' }, 502); }

      const unit = pp.data.purchase_units?.[0];
      const cap = unit?.payments?.captures?.[0];
      const valid = pp.data.status === 'COMPLETED' && cap?.status === 'COMPLETED'
        && unit?.custom_id === order.id
        && cap.amount?.value === money(order.amount_cents)
        && String(cap.amount?.currency_code).toUpperCase() === order.currency.toUpperCase();
      if (!valid) {
        console.error('PayPal payment did not match the order', JSON.stringify({ status: pp.data.status, cap }));
        return json({ error: 'The payment is not complete or does not match this order. No credits were added.' }, 400);
      }

      // Idempotent: credits are only granted once, however many times this runs.
      const { error } = await admin.rpc('fulfill_order', { p_order_id: order.id, p_provider_ref: order.provider_ref });
      if (error) { console.error(error.message); return json({ error: 'Payment received but credits could not be added. Please contact Neeliën.' }, 500); }
      return json({ ok: true, credits: order.credits });
    }

    return json({ error: 'unknown action' }, 400);
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    return json({ error: 'Something went wrong. Please try again.' }, 500);
  }
});
