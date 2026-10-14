import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PACKS, CURRENCY_SYMBOL, packPrice, packPerCredit } from '../data/constants';
import Icon from '../components/ui/Icon';

const RATE = 12;

const FAQS = [
  { q: 'Do credits expire?', a: 'No. Credits never expire. Buy at your own pace and use them whenever you’re ready.' },
  { q: 'How do I book after buying?', a: 'After purchase, your credits appear in your student dashboard. Go to “Book a Lesson”, pick a date and time, and confirm. One credit is held.' },
  { q: 'What payment methods are accepted?', a: 'Payments are taken securely through PayPal. You can pay with your PayPal balance or, where PayPal offers it, with a debit or credit card.' },
  { q: 'How many credits can I buy at once?', a: `Between 1 and 28 at a time. Buying in bulk gives you a better per-credit rate, down to ${CURRENCY_SYMBOL}9 per credit for 28 credits.` },
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
          <div className="pricing-grid">
            {PACKS.map(p => {
              const price = packPrice(p.credits, p.discount, RATE);
              const per = packPerCredit(p.discount, RATE);
              const saved = Math.round(RATE * p.credits * p.discount);
              const featured = p.id === 'B';
              return (
                <article key={p.id} className={`price-card ${featured ? 'featured' : ''}`}>
                  {p.badge && <div className="price-badge">{p.badge}</div>}
                  <div className="price-label">{p.label}</div>
                  <div className="price-credits"><strong>{p.credits}</strong><span>credit{p.credits > 1 ? 's' : ''}</span></div>
                  <div className="price-amount">{CURRENCY_SYMBOL}{price}</div>
                  <div className="price-per">{CURRENCY_SYMBOL}{per} per credit</div>
                  {p.discount > 0 && <div className="price-save">Save {CURRENCY_SYMBOL}{saved}</div>}
                  <ul className="price-features">
                    {p.features.map(f => (
                      <li key={f}><Icon name="check" weight="bold" />{f}</li>
                    ))}
                  </ul>
                  <button className={`btn ${featured ? '' : 'btn-outline'}`} onClick={() => navigate('/register')}>
                    Buy {p.credits} Credit{p.credits > 1 ? 's' : ''}
                  </button>
                </article>
              );
            })}
          </div>

          {/* Reschedule policy */}
          <div className="notice notice-warn">
            <Icon name="clock" className="notice-icon" />
            <div>
              <strong className="notice-title">Flexible reschedule policy</strong>
              <p>Reschedule <strong>more than 2 hours before</strong> your lesson and your credit is returned immediately. Less than 2 hours or no-show: the credit is used. If Neeliën cancels, your credit is always returned.</p>
            </div>
          </div>

          {/* FAQ */}
          <div style={{ marginBottom: 28 }}>
            <h2 className="faq-heading">Common questions</h2>
            <div className="faq-list" style={{ marginTop: 0, maxWidth: '100%' }}>
              {FAQS.map((faq, i) => (
                <div key={faq.q} className="faq-item">
                  <h3>
                    <button className="faq-q" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i} aria-controls={`faq-${i}`}>
                      {faq.q}
                      <span className="faq-ico" aria-hidden="true" style={{ transform: openFaq === i ? 'rotate(45deg)' : 'none' }}>+</span>
                    </button>
                  </h3>
                  <div id={`faq-${i}`} className="faq-a" style={{ maxHeight: openFaq === i ? 240 : 0 }} role="region" aria-hidden={openFaq !== i}>
                    <div className="faq-a-inner">{faq.a}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="cta-band">
            <h2>Ready to start?</h2>
            <p>Create your free account and buy your first credits.</p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn btn-sm" style={{ background: '#F7C6D6', color: '#4a1630' }} onClick={() => navigate('/register')}>Create Account</button>
              <button className="btn btn-sm" style={{ background: 'rgba(255,255,255,.12)', color: 'white', border: '1px solid rgba(255,255,255,.3)' }} onClick={() => navigate('/login')}>Already a student? Log in</button>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
