import { useEffect, useState } from 'react';
import DashHeader from '../../../components/dashboard/DashHeader';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import { formatMoney } from '../../../data/constants';

const REASONS = { purchase: 'Purchased credits', booking: 'Booked a lesson', refund: 'Refund', adjustment: 'Adjusted by Neeliën' };
const when = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function StudentCredits({ onBuyCredits }) {
  const { currentUser, refreshCredits, showToast } = useApp();
  const [orders, setOrders] = useState(null);
  const [ledger, setLedger] = useState(null);

  useEffect(() => {
    refreshCredits?.();
    (async () => {
      const [o, l] = await Promise.all([
        supabase.from('orders').select('id, credits, amount_cents, provider, status, paid_at, created_at')
          .eq('status', 'paid').order('paid_at', { ascending: false }).limit(100),
        supabase.from('credit_ledger').select('id, delta, reason, note, created_at')
          .order('created_at', { ascending: false }).limit(100),
      ]);
      if (o.error || l.error) showToast('Could not load your payment history.', 'error');
      setOrders(o.data || []);
      setLedger(l.data || []);
    })();
  }, []);

  const spent = (orders || []).reduce((s, o) => s + o.amount_cents, 0);

  return (
    <>
      <DashHeader title="Credits & Billing">
        <button className="btn btn-primary btn-sm" onClick={onBuyCredits}>🎟 Buy Credits</button>
      </DashHeader>
      <div className="dash-main">
        <div className="dash-grid-4" style={{ marginBottom: 16 }}>
          <div className="stat-card"><div className="stat-num">{currentUser?.credits ?? 0}</div><div className="stat-label">Credits available</div></div>
          <div className="stat-card"><div className="stat-num">{orders ? orders.length : '–'}</div><div className="stat-label">Payments made</div></div>
          <div className="stat-card"><div className="stat-num">{orders ? formatMoney(spent, 2) : '–'}</div><div className="stat-label">Total paid</div></div>
        </div>

        <div className="dash-grid">
          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom: 10 }}>💳 Payments</div>
            {orders === null ? <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>Loading…</p>
              : orders.length === 0 ? <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>No payments yet. When you buy credits, your receipts appear here.</p>
              : orders.map(o => (
                <div key={o.id} className="hw-item" style={{ flexWrap: 'wrap' }}>
                  <div className="hw-info" style={{ flex: 1, minWidth: 160 }}>
                    <strong>{o.credits} {o.credits === 1 ? 'credit' : 'credits'}</strong>
                    <span>{when(o.paid_at || o.created_at)} · {o.provider === 'paypal' ? 'PayPal' : o.provider}</span>
                  </div>
                  <strong>{formatMoney(o.amount_cents, 2)}</strong>
                  <span style={{ fontSize: '.7rem', fontWeight: 600, padding: '3px 10px', borderRadius: 50, background: 'var(--green-bg)', color: '#15803d' }}>Paid</span>
                </div>
              ))}
          </div>

          <div className="card card-pad">
            <div className="card-title" style={{ marginBottom: 10 }}>🎟 Credit history</div>
            {ledger === null ? <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>Loading…</p>
              : ledger.length === 0 ? <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>Nothing yet.</p>
              : ledger.map(r => (
                <div key={r.id} className="hw-item">
                  <div className="hw-info">
                    <strong>{REASONS[r.reason] || r.reason}</strong>
                    <span>{when(r.created_at)}{r.note ? ` · ${r.note}` : ''}</span>
                  </div>
                  <strong style={{ color: r.delta > 0 ? '#15803d' : 'var(--ink-soft)' }}>{r.delta > 0 ? `+${r.delta}` : r.delta}</strong>
                </div>
              ))}
          </div>
        </div>
      </div>
    </>
  );
}
