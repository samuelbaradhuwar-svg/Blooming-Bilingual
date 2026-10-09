import { supabase } from './supabase';

// Calls the `paypal` Edge Function as the signed-in student. Its address is stored in the database
// (app_secrets: paypal_function_url) and fetched through an RPC, so the site never hard-codes it.
async function callPayments(payload) {
  const { data: url, error } = await supabase.rpc('payment_function_url');
  if (error || !url) throw new Error('Online payments are not switched on yet.');
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Please sign in again.');

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

// Starts a PayPal checkout for a pack; resolves to the PayPal address to send the student to.
export const startCheckout = (packId) => callPayments({ action: 'create', pack_id: packId }).then(d => d.url);

// Confirms a payment after PayPal sends the student back; the server adds the credits.
export const captureOrder = (orderId) => callPayments({ action: 'capture', order_id: orderId });
