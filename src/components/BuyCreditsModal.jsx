import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { PACKS, CURRENCY_SYMBOL, packPrice, packPerCredit } from '../data/constants';
import { startCheckout } from '../lib/payments';

export default function BuyCreditsModal({ onClose }) {
  const { showToast } = useApp();
  const [selected, setSelected] = useState('B');
  const [busy, setBusy] = useState(false);
  const rate = 12;

  const pack = PACKS.find(p => p.id === selected);
  const price = packPrice(pack.credits, pack.discount, rate);
  const per = packPerCredit(pack.discount, rate);
  const saved = Math.round(rate * pack.credits * pack.discount);

  const complete = async () => {
    setBusy(true);
    try {
      const url = await startCheckout(selected);
      window.location.href = url;            // PayPal takes it from here and sends the student back afterwards
    } catch (e) {
      setBusy(false);
      showToast(e.message, 'error');
    }
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
              <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--blue)', marginTop: 2 }}>{CURRENCY_SYMBOL}{pr}</div>
              {p.discount > 0
                ? <div style={{ fontSize: '.65rem', fontWeight: 600, color: 'var(--green)', background: 'var(--green-bg)', padding: '2px 6px', borderRadius: 50, display: 'inline-block', marginTop: 3 }}>Save {CURRENCY_SYMBOL}{sv}</div>
                : <div style={{ height: 18 }} />
              }
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div style={{ background: 'var(--off-white)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: 16, fontSize: '.82rem', color: 'var(--ink-soft)' }}>
        Selected: <strong>{pack.credits} credit{pack.credits > 1 ? 's' : ''}</strong> — {CURRENCY_SYMBOL}{price} ({CURRENCY_SYMBOL}{per}/credit{pack.discount > 0 ? ` · save ${CURRENCY_SYMBOL}${saved}` : ''})
      </div>

      <button className="btn btn-primary btn-full" disabled={busy} onClick={complete}>
        {busy ? 'Taking you to PayPal…' : 'Pay with PayPal →'}
      </button>
      <p style={{ fontSize: '.72rem', color: 'var(--ink-muted)', textAlign: 'center', marginTop: 8 }}>
        🔒 Secure payment by PayPal (you can pay with a card there too) · Credits are added as soon as payment is confirmed
      </p>
    </div>
  );
}
