import { useEffect, useState } from 'react';
import DashHeader from '../../../components/dashboard/DashHeader';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import { formatMoney } from '../../../data/constants';
import Icon from '../../../components/ui/Icon';
import EmptyState from '../../../components/ui/EmptyState';
import Skeleton, { SkeletonRows } from '../../../components/ui/Skeleton';
import Receipt, { receiptNumber } from '../../../components/Receipt';

const REASONS = { purchase: 'Purchased credits', booking: 'Booked a lesson', refund: 'Credit refunded', adjustment: 'Adjusted by Neeliën' };
const METHODS = { paypal: 'PayPal', stripe: 'Card', payfast: 'PayFast' };
const when = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export default function StudentCredits({ onBuyCredits }) {
  const { currentUser, refreshCredits, showToast, openModal } = useApp();
  const [orders, setOrders] = useState(null);
  const [ledger, setLedger] = useState(null);

  useEffect(() => {
    refreshCredits?.();
    (async () => {
      const [o, l] = await Promise.all([
        supabase.from('orders').select('id, credits, amount_cents, currency, provider, provider_ref, status, paid_at, created_at')
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
  const credits = currentUser?.credits ?? 0;

  return (
    <>
      <DashHeader title="Credits & Billing">
        <button className="btn btn-primary btn-sm" onClick={onBuyCredits}><Icon name="credits" /> Buy Credits</button>
      </DashHeader>
      <div className="dash-main">
        <section className="balance" aria-label="Credit balance">
          <div>
            <div className="balance-label">Available credits</div>
            <div className="balance-num">{credits}</div>
            <div className="balance-sub">Each credit is one 45-minute lesson. Credits never expire.</div>
          </div>
          <button className="btn btn-light" onClick={onBuyCredits}><Icon name="credits" /> Buy more credits</button>
        </section>

        <div className="dash-grid-4" style={{ marginBottom: 20, gridTemplateColumns: undefined }}>
          <div className="stat-card"><div className="stat-num">{orders ? orders.length : <Skeleton w={40} h={30} />}</div><div className="stat-label">Payments made</div></div>
          <div className="stat-card"><div className="stat-num">{orders ? formatMoney(spent, 2) : <Skeleton w={80} h={30} />}</div><div className="stat-label">Total paid</div></div>
        </div>

        <div className="card card-pad" style={{ marginBottom: 20 }}>
          <div className="card-title" style={{ marginBottom: 12 }}><Icon name="card" /> Payment history</div>
          {orders === null ? <SkeletonRows rows={2} h={48} /> : orders.length === 0 ? (
            <EmptyState compact title="No payments yet" action={<button className="btn btn-primary btn-sm" onClick={onBuyCredits}>Buy your first credits</button>}>
              Receipts for your credit purchases will appear here.
            </EmptyState>
          ) : (
            <div className="table-scroll">
              <table className="data-table stack-table">
                <thead><tr><th>Date</th><th>Credits</th><th>Method</th><th>Amount</th><th>Status</th><th>Receipt</th></tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td data-label="Date">{when(o.paid_at || o.created_at)}</td>
                      <td data-label="Credits">{o.credits} {o.credits === 1 ? 'credit' : 'credits'}</td>
                      <td data-label="Method">{METHODS[o.provider] || o.provider}</td>
                      <td data-label="Amount"><strong>{formatMoney(o.amount_cents, 2)}</strong></td>
                      <td data-label="Status"><span className="chip chip-green">Paid</span></td>
                      <td data-label="Receipt">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => openModal(`Receipt ${receiptNumber(o)}`, <Receipt order={o} student={{ name: currentUser?.name, email: currentUser?.email }} />)}>
                          <Icon name="receipt" /> Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card card-pad">
          <div className="card-title" style={{ marginBottom: 6 }}><Icon name="receipt" /> Credit history</div>
          {ledger === null ? <SkeletonRows rows={3} h={44} /> : ledger.length === 0 ? (
            <EmptyState compact title="Nothing yet">Every credit you buy or use is recorded here.</EmptyState>
          ) : ledger.map(r => (
            <div key={r.id} className="hw-item">
              <div className="hw-info">
                <strong>{REASONS[r.reason] || r.reason}</strong>
                <span>{when(r.created_at)}{r.note ? ` · ${r.note}` : ''}</span>
              </div>
              <strong className={`delta ${r.delta > 0 ? 'is-in' : ''}`}>{r.delta > 0 ? `+${r.delta}` : r.delta}</strong>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
