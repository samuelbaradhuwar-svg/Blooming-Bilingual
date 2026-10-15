import { useEffect } from 'react';
import { BRAND, BUSINESS } from '../data/brand';
import { BrandMark } from './ui/Brand';
import Icon from './ui/Icon';

const METHODS = { paypal: 'PayPal', stripe: 'Card', payfast: 'PayFast' };
const fullDate = (iso) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
const money = (cents, code) => `${code === 'USD' ? '$' : ''}${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${code === 'USD' ? '' : ` ${code}`}`;

// A stable receipt number made from the payment date and the order id, e.g. BB-20261015-3F2A9C1D.
export const receiptNumber = (o) => `BB-${new Date(o.paid_at || o.created_at).toISOString().slice(0, 10).replace(/-/g, '')}-${String(o.id).replace(/-/g, '').slice(0, 8).toUpperCase()}`;

/**
 * A printable receipt for one paid order. `student` is { name, email }.
 * "Print or save as PDF" uses the browser's own print dialog, so every language and name prints correctly.
 */
export default function Receipt({ order, student }) {
  const code = String(order.currency || 'usd').toUpperCase();
  const unit = order.credits ? order.amount_cents / order.credits : order.amount_cents;
  const issuer = [BUSINESS.address, BUSINESS.email, BUSINESS.vatNumber && `VAT number: ${BUSINESS.vatNumber}`, BUSINESS.registration && `Registration: ${BUSINESS.registration}`].filter(Boolean);

  // While the print dialog is open, the page hides everything except the receipt (see .printing-receipt in the stylesheet).
  useEffect(() => {
    const done = () => document.body.classList.remove('printing-receipt');
    window.addEventListener('afterprint', done);
    return () => { window.removeEventListener('afterprint', done); done(); };
  }, []);
  const print = () => { document.body.classList.add('printing-receipt'); window.print(); };

  return (
    <div>
      <article className="receipt-sheet" aria-label={`Receipt ${receiptNumber(order)}`}>
        <header className="receipt-head">
          <div className="receipt-brand"><BrandMark size={40} /><div><strong>{BUSINESS.legalName}</strong><span>{BUSINESS.owner}</span></div></div>
          <div className="receipt-title"><h2>Receipt</h2><span className="receipt-paid"><Icon name="check" weight="bold" /> Paid</span></div>
        </header>

        <dl className="receipt-meta">
          <div><dt>Receipt number</dt><dd>{receiptNumber(order)}</dd></div>
          <div><dt>Date paid</dt><dd>{fullDate(order.paid_at || order.created_at)}</dd></div>
          <div><dt>Payment method</dt><dd>{METHODS[order.provider] || order.provider}</dd></div>
          {order.provider_ref && <div><dt>{order.provider === 'paypal' ? 'PayPal order reference' : 'Payment reference'}</dt><dd>{order.provider_ref}</dd></div>}
        </dl>

        <div className="receipt-parties">
          <div><h3>Billed to</h3><p>{student.name || 'Student'}</p>{student.email && <p>{student.email}</p>}</div>
          <div><h3>Issued by</h3><p>{BUSINESS.legalName}</p>{issuer.map(l => <p key={l}>{l}</p>)}<p>{BRAND.site}</p></div>
        </div>

        <table className="receipt-lines">
          <thead><tr><th>Description</th><th className="num">Qty</th><th className="num">Unit price</th><th className="num">Amount</th></tr></thead>
          <tbody>
            <tr>
              <td>Lesson credits<small>1 credit = one 45-minute online English lesson</small></td>
              <td className="num">{order.credits}</td>
              <td className="num">{money(unit, code)}</td>
              <td className="num">{money(order.amount_cents, code)}</td>
            </tr>
          </tbody>
          <tfoot><tr><td colSpan="3">Total paid</td><td className="num">{money(order.amount_cents, code)}</td></tr></tfoot>
        </table>

        <p className="receipt-thanks">Thank you for learning with {BRAND.name}. Questions about this receipt? Use the Contact page at {BRAND.site}.</p>
      </article>

      <div className="receipt-actions">
        <button type="button" className="btn btn-primary btn-full" onClick={print}><Icon name="download" /> Print or save as PDF</button>
        <p className="fine-print" style={{ textAlign: 'center', marginTop: 8 }}>In the print window, choose “Save as PDF” as the destination.</p>
      </div>
    </div>
  );
}
