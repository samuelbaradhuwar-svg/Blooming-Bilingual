import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-meet`;
const SCOPES = 'https://www.googleapis.com/auth/calendar.events openid email';

const MESSAGES = {
  connected: ['Google Calendar connected. New lessons will get a Meet link automatically.', 'success'],
  denied: ['Google access was not granted. Nothing was connected.', 'error'],
  expired: ['That connection attempt expired. Please try again.', 'error'],
  failed: ['Google could not be connected. Please try again, or ask for help.', 'error'],
};

// Neeliën's one-time "Connect Google Calendar" step. Meet links are then created for every booking.
export default function GoogleConnect() {
  const { showToast } = useApp();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('admin_google_status');
    setStatus(error ? { error: true } : data?.[0] ?? { connected: false });
  }, []);

  useEffect(() => {
    load();
    // Google sends her back here with ?google=connected (or an error).
    const url = new URL(window.location.href);
    const result = url.searchParams.get('google');
    if (result) {
      const [msg, type] = MESSAGES[result] || MESSAGES.failed;
      showToast(msg, type);
      url.searchParams.delete('google');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  }, [load, showToast]);

  const connect = async () => {
    setBusy(true);
    const { data: nonce, error } = await supabase.rpc('admin_start_google_connect');
    if (error) { setBusy(false); showToast(error.message, 'error'); return; }
    const params = new URLSearchParams({
      client_id: CLIENT_ID, redirect_uri: FUNCTION_URL, response_type: 'code', scope: SCOPES,
      access_type: 'offline', prompt: 'consent', state: nonce,
    });
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  };

  const disconnect = async () => {
    if (!window.confirm('Stop creating Google Meet links for new lessons?')) return;
    const { error } = await supabase.rpc('admin_disconnect_google');
    if (error) showToast(error.message, 'error'); else { showToast('Google disconnected.', 'info'); load(); }
  };

  return (
    <div className="card card-pad" style={{ marginBottom: 16 }}>
      <div className="card-title" style={{ marginBottom: 4 }}>🎥 Google Meet</div>
      {status === null ? <p style={{ fontSize: '.85rem' }}>Loading…</p> : status.connected ? (
        <>
          <p style={{ fontSize: '.85rem', color: 'var(--ink-soft)', marginBottom: 12 }}>
            ✅ Connected{status.account_email ? ` as ${status.account_email}` : ''}. Every new lesson gets a Meet link and a calendar invite for the student.
          </p>
          <button className="btn btn-ghost btn-sm" onClick={disconnect}>Disconnect</button>
        </>
      ) : (
        <>
          <p style={{ fontSize: '.85rem', color: 'var(--ink-soft)', marginBottom: 12 }}>
            Connect your Google account once. After that, every booked lesson automatically gets a Meet link on your Google Calendar, and the student gets an invite.
          </p>
          {CLIENT_ID
            ? <button className="btn btn-primary btn-sm" disabled={busy} onClick={connect}>{busy ? 'Opening Google…' : 'Connect Google Calendar'}</button>
            : <p style={{ fontSize: '.8rem', color: 'var(--red)' }}>Not set up yet: the site needs VITE_GOOGLE_CLIENT_ID.</p>}
        </>
      )}
    </div>
  );
}
