import { useEffect, useState } from 'react';
import DashHeader from '../../../components/dashboard/DashHeader';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import { formatMoney } from '../../../data/constants';

const eur = (c) => formatMoney(c, 2);

export default function AdminBilling() {
  const { showToast } = useApp();
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    supabase.from('orders')
      .select('id, credits, amount_cents, provider, status, created_at, paid_at, profiles(full_name, email)')
      .order('created_at', { ascending: false }).limit(200)
      .then(({ data, error }) => {
        if (error) { showToast('Could not load payments.', 'error'); setOrders([]); } else setOrders(data);
      });
  }, [showToast]);

  const paid = (orders || []).filter(o => o.status === 'paid');
  const total = paid.reduce((s, o) => s + o.amount_cents, 0);

  return (
    <>
      <DashHeader title="Invoices & Billing" />
      <div className="dash-main">
        <div className="dash-grid-4" style={{ marginBottom: 16 }}>
          <div className="stat-card"><div className="stat-num">{eur(total)}</div><div className="stat-label">Total received</div></div>
          <div className="stat-card"><div className="stat-num">{paid.length}</div><div className="stat-label">Paid orders</div></div>
        </div>
        <div className="card card-pad">
          {orders === null ? <p style={{ fontSize: '.85rem' }}>Loading…</p> : orders.length === 0 ? (
            <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>No payments yet. Orders will appear here once online payments are switched on.</p>
          ) : orders.map(o => (
            <div key={o.id} className="hw-item" style={{ flexWrap: 'wrap' }}>
              <div className="hw-info" style={{ flex: 1, minWidth: 200 }}>
                <strong>{o.profiles?.full_name || 'Student'} · {o.credits} credits</strong>
                <span>{new Date(o.created_at).toLocaleDateString()} · {o.provider}</span>
              </div>
              <strong>{eur(o.amount_cents)}</strong>
              <span style={{ fontSize: '.7rem', fontWeight: 600, padding: '3px 10px', borderRadius: 50, background: o.status === 'paid' ? 'var(--green-bg)' : 'var(--off-white)', color: o.status === 'paid' ? '#15803d' : 'var(--ink-muted)' }}>{o.status}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
