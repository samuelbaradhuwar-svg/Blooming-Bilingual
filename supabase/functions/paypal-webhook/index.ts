// Supabase Edge Function: paypal-webhook   (deploy with "Verify JWT" OFF — PayPal calls it directly)
//
// The safety net for PayPal payments. If a student pays but never makes it back to the site (closed tab,
// lost signal), PayPal tells THIS function instead, and the credits are still added — exactly once.
//
//   CHECKOUT.ORDER.APPROVED   → the buyer approved the payment: take it (capture), then add the credits
//   PAYMENT.CAPTURE.COMPLETED → money has been taken: add the credits (if not already added)
//
// Every message is checked with PayPal's signature verification before anything happens.
//
// Secrets (Edge Functions → Secrets): PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_ENV, PAYPAL_WEBHOOK_ID.
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const env = (k: string) => Deno.env.get(k) ?? '';
const PAYPAL_BASE = env('PAYPAL_ENV').trim().toLowerCase() === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

const admin = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });

const money = (cents: number) => (cents / 100).toFixed(2);
const ok = (body: unknown = { ok: true }) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
const fail = (status: number, error: string) => new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json' } });

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
  if (!res.ok) throw new Error(`PayPal sign-in failed (${data.error ?? res.status})`);
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
  try { data = text ? JSON.parse(text) : {}; } catch { /* non-JSON body */ }
  return { ok: res.ok, status: res.status, data };
}

// Is this message really from PayPal? PayPal checks its own signature for us.
async function signatureIsValid(req: Request, event: unknown, token: string): Promise<boolean> {
  const h = (n: string) => req.headers.get(n) ?? '';
  const res = await paypal(token, 'POST', '/v1/notifications/verify-webhook-signature', {
    auth_algo: h('paypal-auth-algo'),
    cert_url: h('paypal-cert-url'),
    transmission_id: h('paypal-transmission-id'),
    transmission_sig: h('paypal-transmission-sig'),
    transmission_time: h('paypal-transmission-time'),
    webhook_id: env('PAYPAL_WEBHOOK_ID').trim(),
    webhook_event: event,
  });
  return res.ok && res.data.verification_status === 'SUCCESS';
}

type Order = { id: string; credits: number; amount_cents: number; currency: string; status: string; provider_ref: string | null };

// Does a capture match what we asked for? (same order, same amount, same currency, money really taken)
function captureMatches(order: Order, cap: any, reference: string | undefined): boolean {
  return cap?.status === 'COMPLETED'
    && reference === order.id
    && cap.amount?.value === money(order.amount_cents)
    && String(cap.amount?.currency_code).toUpperCase() === order.currency.toUpperCase();
}

async function grantCredits(order: Order) {
  // Idempotent: fulfill_order only adds credits the first time, however many times (or from where) it is called.
  const { data, error } = await admin.rpc('fulfill_order', { p_order_id: order.id, p_provider_ref: order.provider_ref });
  if (error) throw new Error(`fulfill_order failed: ${error.message}`);
  return data as boolean;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return fail(405, 'method not allowed');
  try {
    const raw = await req.text();
    let event: any;
    try { event = JSON.parse(raw); } catch { return fail(400, 'invalid JSON'); }

    const token = await paypalToken();
    if (!env('PAYPAL_WEBHOOK_ID').trim()) { console.error('PAYPAL_WEBHOOK_ID is not set'); return fail(500, 'not configured'); }
    if (!(await signatureIsValid(req, event, token))) {
      console.error('Rejected a webhook message: PayPal signature check failed', event?.event_type);
      return fail(403, 'bad signature');
    }

    // ───────── the buyer approved the payment: take it ─────────
    if (event.event_type === 'CHECKOUT.ORDER.APPROVED') {
      const ppOrderId: string | undefined = event.resource?.id;
      if (!ppOrderId) return ok({ ignored: 'no order id' });
      const { data: order } = await admin.from('orders')
        .select('id, credits, amount_cents, currency, status, provider_ref')
        .eq('provider', 'paypal').eq('provider_ref', ppOrderId).maybeSingle();
      if (!order) return ok({ ignored: 'not one of our orders' });
      if (order.status === 'paid') return ok({ already: true });

      // Same request id as the website's own capture, so PayPal treats both as one capture.
      let pp = await paypal(token, 'POST', `/v2/checkout/orders/${ppOrderId}/capture`, {}, `capture-${order.id}`);
      if (!pp.ok && JSON.stringify(pp.data).includes('ORDER_ALREADY_CAPTURED')) {
        pp = await paypal(token, 'GET', `/v2/checkout/orders/${ppOrderId}`);
      }
      if (!pp.ok) { console.error('Webhook capture failed', JSON.stringify(pp.data)); return fail(500, 'capture failed'); }

      const unit = pp.data.purchase_units?.[0];
      const cap = unit?.payments?.captures?.[0];
      const reference = cap?.custom_id ?? unit?.custom_id ?? unit?.reference_id;
      if (pp.data.status !== 'COMPLETED' || !captureMatches(order, cap, reference)) {
        console.error('Webhook: payment did not match the order', JSON.stringify({ orderStatus: pp.data.status, captureStatus: cap?.status, reference, amount: cap?.amount }));
        return ok({ ignored: 'payment does not match' });   // 200: retrying would not change the result
      }
      return ok({ credited: await grantCredits(order) });
    }

    // ───────── money has been taken ─────────
    if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
      const cap = event.resource;
      const orderId: string | undefined = cap?.custom_id;
      if (!orderId) return ok({ ignored: 'no reference' });
      const { data: order } = await admin.from('orders')
        .select('id, credits, amount_cents, currency, status, provider_ref').eq('id', orderId).eq('provider', 'paypal').maybeSingle();
      if (!order) return ok({ ignored: 'not one of our orders' });
      if (order.status === 'paid') return ok({ already: true });
      if (!captureMatches(order, cap, cap.custom_id)) {
        console.error('Webhook: capture did not match the order', JSON.stringify({ status: cap?.status, amount: cap?.amount }));
        return ok({ ignored: 'capture does not match' });
      }
      return ok({ credited: await grantCredits(order) });
    }

    return ok({ ignored: event.event_type });   // any other event type: nothing to do
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    return fail(500, 'error');                    // 500 makes PayPal try again later
  }
});
