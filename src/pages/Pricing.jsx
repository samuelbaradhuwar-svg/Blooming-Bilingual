import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PACKS, CURRENCY_SYMBOL, packPrice, packPerCredit } from '../data/constants';

const RATE = 12;

const FAQS = [
  { q: 'Do credits expire?', a: 'No — credits never expire. Buy at your own pace and use them whenever you\'re ready.' },
  { q: 'How do I book after buying?', a: 'After purchase, your credits appear in your student dashboard. Go to "Book a Lesson", pick a date and time, and confirm — 1 credit is held.' },
  { q: 'What payment methods are accepted?', a: 'Payments are taken securely through PayPal. You can pay with your PayPal balance or, where PayPal offers it, with a debit or credit card.' },
  { q: 'How many credits can I buy at once?', a: `Between 1 and 28 at a time. Buying in bulk gives you a better per-credit rate — down to ${CURRENCY_SYMBOL}9/credit for 28 credits.` },
];

export default function Pricing() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <div className="section-label">Credits & Pricing</div>
          <h1 className="section-title">One credit.<br />One 45-minute lesson.</h1>
          <p className="section-sub">Buy as few as 1 or as many as 28. The more you buy, the better your rate. Credits never expire.</p>
        </div>
      </div>

      <section className="section">
        <div className="section-inner">
          {/* Pricing cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 14, marginBottom: 28 }}>
            {PACKS.map(p => {
              const price = packPrice(p.credits, p.discount, RATE);
              const per = packPerCredit(p.discount, RATE);
              const saved = Math.round(RATE * p.credits * p.discount);
              const isFeat = p.id === 'B';
              return (
                <div key={p.id} style={{
                  background: isFeat ? 'linear-gradient(135deg,var(--navy) 0%,#6B2045 100%)' : 'white',
                  border: isFeat ? 'none' : '1px solid var(--border-soft)',
                  borderRadius: 'var(--radius)', padding: '24px 18px', textAlign: 'center',
                  boxShadow: isFeat ? 'var(--shadow-lg)' : 'var(--shadow-sm)', position: 'relative',
                }}>
                  {p.badge && (
                    <div style={{ position: 'absolute', top: -9, left: '50%', transform: 'translateX(-50%)', background: isFeat ? '#E8829F' : 'var(--orange)', color: 'white', fontSize: '.6rem', fontWeight: 700, padding: '2px 9px', borderRadius: 50, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{p.badge}</div>
                  )}
                  <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '2rem', fontWeight: 700, color: isFeat ? 'white' : 'var(--navy)' }}>{p.credits}</div>
                  <div style={{ fontSize: '.65rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: isFeat ? 'rgba(255,255,255,.55)' : 'var(--ink-muted)', marginBottom: 10 }}>credit{p.credits > 1 ? 's' : ''}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: isFeat ? '#E8829F' : 'var(--blue)' }}>{CURRENCY_SYMBOL}{price}</div>
                  <div style={{ fontSize: '.7rem', color: isFeat ? 'rgba(255,255,255,.5)' : 'var(--ink-muted)', marginBottom: p.discount > 0 ? 4 : 18 }}>{CURRENCY_SYMBOL}{per}/credit</div>
                  {p.discount > 0 && <div style={{ fontSize: '.65rem', fontWeight: 600, background: 'var(--green-bg)', color: 'var(--green)', padding: '2px 8px', borderRadius: 50, display: 'inline-block', marginBottom: 14 }}>Save {CURRENCY_SYMBOL}{saved}</div>}
                  {p.features.map(f => (
                    <div key={f} style={{ fontSize: '.72rem', color: isFeat ? 'rgba(255,255,255,.7)' : 'var(--ink-soft)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, textAlign: 'left' }}>
                      <span style={{ color: isFeat ? '#E8829F' : 'var(--green)' }}>✓</span>{f}
                    </div>
                  ))}
                  <button
                    onClick={() => navigate('/register')}
                    style={{ marginTop: 12, width: '100%', padding: 10, borderRadius: 50, border: isFeat ? 'none' : '1.5px solid var(--blue)', background: isFeat ? 'rgba(255,255,255,.12)' : 'transparent', color: isFeat ? 'white' : 'var(--blue)', fontSize: '.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans',sans-serif" }}
                  >Buy {p.credits} Credit{p.credits > 1 ? 's' : ''}</button>
                </div>
              );
            })}
          </div>

          {/* Reschedule policy */}
          <div style={{ background: 'linear-gradient(120deg,#FFFBEB,#FEF3C7)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 'var(--radius-sm)', padding: '18px 22px', marginBottom: 28, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>⏰</span>
            <div>
              <strong style={{ fontSize: '.875rem', color: 'var(--navy)', display: 'block', marginBottom: 3 }}>Flexible reschedule policy</strong>
              <span style={{ fontSize: '.82rem', color: 'var(--ink-soft)', fontWeight: 300, lineHeight: 1.65 }}>Reschedule <strong>more than 2 hours before</strong> your lesson — credit returned immediately. Less than 2 hours or no-show — credit is consumed. Neeliën cancels? Credit always returned.</span>
            </div>
          </div>

          {/* FAQ */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ fontSize: '.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-muted)', marginBottom: 12 }}>Common questions</div>
            <div className="faq-list" style={{ marginTop: 0, maxWidth: '100%' }}>
              {FAQS.map((faq, i) => (
                <div key={i} className="faq-item">
                  <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                    {faq.q}
                    <span className="faq-ico" style={{ transform: openFaq === i ? 'rotate(45deg)' : 'none' }}>+</span>
                  </button>
                  <div className="faq-a" style={{ maxHeight: openFaq === i ? 200 : 0 }}>
                    <div className="faq-a-inner">{faq.a}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div style={{ background: 'linear-gradient(130deg,var(--navy) 0%,#6B2045 100%)', borderRadius: 'var(--radius)', padding: 36, textAlign: 'center', color: 'white' }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.6rem', fontWeight: 700, marginBottom: 8 }}>Ready to start?</h3>
            <p style={{ fontSize: '.875rem', opacity: .75, marginBottom: 22, fontWeight: 300 }}>Create your free account and buy your first credits.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-sm" style={{ background: '#E8829F', color: 'white' }} onClick={() => navigate('/register')}>🌸 Create Account</button>
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,.1)', color: 'white', border: '1px solid rgba(255,255,255,.2)' }} onClick={() => navigate('/login')}>Already a student? Log in →</button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
