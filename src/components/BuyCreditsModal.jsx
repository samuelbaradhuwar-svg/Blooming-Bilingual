import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PACKS, packPrice, packPerCredit } from '../data/constants';

export default function BuyCreditsModal({ onClose }) {
  const { addCredits, showToast } = useApp();
  const [selected, setSelected] = useState('B');
  const [method, setMethod] = useState('stripe');
  const rate = 12;

  const pack = PACKS.find(p => p.id === selected);
  const price = packPrice(pack.credits, pack.discount, rate);
  const per = packPerCredit(pack.discount, rate);
  const saved = Math.round(rate * pack.credits * pack.discount);

  const complete = () => {
    addCredits(pack.credits);
    showToast(`${pack.credits} credits added! Invoice sent.`, 'success');
    onClose();
  };

  return (
    <div>
      <p style={{ fontSize: '.85rem', color: 'var(--ink-muted)', marginBottom: 18, fontWeight: 300 }}>
        Each credit = one 45-minute lesson. Credits never expire.
      </p>

      {/* Pack grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
        {PACKS.map(p => {
          const isSelected = p.id === selected;
          const pr = packPrice(p.credits, p.discount, rate);
          const sv = Math.round(rate * p.credits * p.discount);
          return (
            <div
              key={p.id}
              onClick={() => setSelected(p.id)}
              style={{
                border: `2px solid ${isSelected ? 'var(--blue)' : 'var(--border)'}`,
                background: isSelected ? 'rgba(212,96,138,0.06)' : 'white',
                borderRadius: 'var(--radius-sm)', padding: 14, textAlign: 'center',
                cursor: 'pointer', transition: 'all .15s', position: 'relative',
              }}
            >
              {p.badge && (
                <div style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', background: p.id === 'B' ? 'var(--blue)' : 'var(--orange)', color: 'white', fontSize: '.58rem', fontWeight: 700, padding: '2px 8px', borderRadius: 50, whiteSpace: 'nowrap', textTransform: 'uppercase' }}>
                  {p.badge}
                </div>
              )}
              <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.4rem', fontWeight: 700, color: 'var(--navy)' }}>
                {p.credits} credit{p.credits > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--blue)', marginTop: 2 }}>€{pr}</div>
              {p.discount > 0
                ? <div style={{ fontSize: '.65rem', fontWeight: 600, color: 'var(--green)', background: 'var(--green-bg)', padding: '2px 6px', borderRadius: 50, display: 'inline-block', marginTop: 3 }}>Save €{sv}</div>
                : <div style={{ height: 18 }} />
              }
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div style={{ background: 'var(--off-white)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: 16, fontSize: '.82rem', color: 'var(--ink-soft)' }}>
        Selected: <strong>{pack.credits} credit{pack.credits > 1 ? 's' : ''}</strong> — €{price} (€{per}/credit{pack.discount > 0 ? ` · save €${saved}` : ''})
      </div>

      {/* Payment */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--ink-soft)', display: 'block', marginBottom: 8 }}>Payment Method</label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn btn-sm ${method === 'stripe' ? 'btn-outline' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => setMethod('stripe')}>💳 Stripe (International)</button>
          <button className={`btn btn-sm ${method === 'payfast' ? 'btn-outline' : 'btn-ghost'}`} style={{ flex: 1 }} onClick={() => setMethod('payfast')}>🏦 PayFast (SA)</button>
        </div>
      </div>

      <button className="btn btn-primary btn-full" onClick={complete}>
        Buy Credits — Secure Checkout →
      </button>
      <p style={{ fontSize: '.72rem', color: 'var(--ink-muted)', textAlign: 'center', marginTop: 8 }}>
        🔒 Stripe & PayFast · Credits added instantly after payment
      </p>
    </div>
  );
}
