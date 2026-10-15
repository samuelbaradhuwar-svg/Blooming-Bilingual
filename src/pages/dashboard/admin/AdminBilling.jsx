import { useEffect, useState } from 'react';
import DashHeader from '../../../components/dashboard/DashHeader';
import { useApp } from '../../../context/AppContext';
import { supabase } from '../../../lib/supabase';
import { formatMoney } from '../../../data/constants';
import EmptyState from '../../../components/ui/EmptyState';
import Skeleton, { SkeletonRows } from '../../../components/ui/Skeleton';
import Receipt, { receiptNumber } from '../../../components/Receipt';
import Icon from '../../../components/ui/Icon';

const eur = (c) => formatMoney(c, 2);
const METHODS = { paypal: 'PayPal', stripe: 'Card', payfast: 'PayFast' };
const STATUS = { paid: ['Paid', 'chip-green'], pending: ['Pending', 'chip-orange'], failed: ['Failed', 'chip-red'], refunded: ['Refunded', 'chip-blue'] };

export default function AdminBilling() {
  const { showToast, openModal } = useApp();
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    supabase.from('orders')
      .select('id, credits, amount_cents, currency, provider, provider_ref, status, created_at, paid_at, profiles(full_name, email)')
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
        <div className="dash-grid-4" style={{ marginBottom: 20 }}>
          <div className="stat-card"><div className="stat-num">{orders ? eur(total) : <Skeleton w={90} h={30} />}</div><div className="stat-label">Total received</div></div>
          <div className="stat-card"><div className="stat-num">{orders ? paid.length : <Skeleton w={40} h={30} />}</div><div className="stat-label">Paid orders</div></div>
        </div>
        <div className="card card-pad">
          {orders === null ? <SkeletonRows rows={3} h={48} /> : orders.length === 0 ? (
            <EmptyState compact title="No payments yet">Orders appear here as soon as a student buys credits.</EmptyState>
          ) : (
            <div className="table-scroll">
              <table className="data-table stack-table">
                <thead><tr><th>Date</th><th>Student</th><th>Credits</th><th>Method</th><th>Amount</th><th>Status</th><th>Receipt</th></tr></thead>
                <tbody>
                  {orders.map(o => {
                    const [label, cls] = STATUS[o.status] || [o.status, 'chip-blue'];
                    return (
                      <tr key={o.id}>
                        <td data-label="Date">{new Date(o.paid_at || o.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td data-label="Student">{o.profiles?.full_name || o.profiles?.email || 'Student'}</td>
                        <td data-label="Credits">{o.credits}</td>
                        <td data-label="Method">{METHODS[o.provider] || o.provider}</td>
                        <td data-label="Amount"><strong>{eur(o.amount_cents)}</strong></td>
                        <td data-label="Status"><span className={`chip ${cls}`}>{label}</span></td>
                        <td data-label="Receipt">
                          {o.status === 'paid' ? (
                            <button type="button" className="btn btn-ghost btn-sm" onClick={() => openModal(`Receipt ${receiptNumber(o)}`, <Receipt order={o} student={{ name: o.profiles?.full_name, email: o.profiles?.email }} />)}>
                              <Icon name="receipt" /> Receipt
                            </button>
                          ) : <span className="fine-print" style={{ margin: 0 }}>–</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
