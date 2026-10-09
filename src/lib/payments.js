import { supabase } from './supabase';

// Calls the `paypal` Edge Function as the signed-in student. Its address is stored in the database
// (app_secrets: paypal_function_url) and fetched through an RPC, so the site never hard-codes it.
async function callPayments(payload) {
  const { data: url, error } = await supabase.rpc('payment_function_url');
  if (error || !url) throw new Error('Online payments are not switched on yet.');

  const send = async (accessToken) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  };

  let { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in again.');
  let { res, data } = await send(session.access_token);

  // The sign-in token may just have expired: refresh it once and try again.
  if (res.status === 401) {
    const refreshed = await supabase.auth.refreshSession();
    session = refreshed.data.session;
    if (!session) throw new Error('Please sign in again.');
    ({ res, data } = await send(session.access_token));
  }
  if (!res.ok) throw new Error(data.error || data.message || 'Something went wrong. Please try again.');
  return data;
}

// Starts a PayPal checkout for a pack; resolves to the PayPal address to send the student to.
export const startCheckout = (packId) => callPayments({ action: 'create', pack_id: packId }).then(d => d.url);

// Confirms a payment after PayPal sends the student back; the server adds the credits.
export const captureOrder = (orderId) => callPayments({ action: 'capture', order_id: orderId });
