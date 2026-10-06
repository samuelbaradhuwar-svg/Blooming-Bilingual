import { useState } from 'react';
import { useApp } from '../context/AppContext';

const INFO = [
  { icon: '✉️', bg: 'rgba(212,96,138,0.08)', label: 'Email',         value: 'hello@bloomingbilingual.com' },
  { icon: '💬', bg: 'var(--green-bg)',         label: 'WhatsApp',     value: 'For enrolled students' },
  { icon: '⏰', bg: 'var(--orange-bg)',         label: 'Response time',value: 'Within 24 hours (Mon–Fri)' },
  { icon: '🌍', bg: '#FAE4EB',                 label: 'Timezone',     value: 'SAST (UTC+2) · All zones welcome' },
];

export default function Contact() {
  const { showToast } = useApp();
  const [form, setForm] = useState({ first: '', last: '', email: '', subject: 'General enquiry', message: '' });
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    showToast('Message sent! Neeliën will reply within 24 hours. 📨', 'success');
    setForm({ first: '', last: '', email: '', subject: 'General enquiry', message: '' });
  };

  return (
    <>
      <div className="page-hero">
        <div className="page-hero-inner">
          <div className="section-label">Contact</div>
          <h1 className="section-title">Let's talk.</h1>
          <p className="section-sub">Questions before booking? Reach out and I'll reply within 24 hours.</p>
        </div>
      </div>

      <section className="section section-alt">
        <div className="section-inner contact-layout">
          {/* Info */}
          <div>
            <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', color: 'var(--navy)', marginBottom: 20 }}>Contact info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
              {INFO.map(i => (
                <div key={i.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, minWidth: 42, borderRadius: 'var(--radius-sm)', background: i.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>{i.icon}</div>
                  <div><strong style={{ fontSize: '.875rem', display: 'block' }}>{i.label}</strong><span style={{ fontSize: '.8rem', color: 'var(--ink-muted)' }}>{i.value}</span></div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: 'var(--ink-muted)', marginBottom: 10 }}>Follow along</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['📸 Instagram','📘 Facebook','💼 LinkedIn'].map(s => (
                <a key={s} href="#" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'white', border: '1px solid var(--border)', borderRadius: 50, fontSize: '.78rem', color: 'var(--ink-soft)', textDecoration: 'none' }}>{s}</a>
              ))}
            </div>
          </div>

          {/* Form */}
          <div style={{ background: 'white', borderRadius: 'var(--radius)', border: '1px solid var(--border-soft)', padding: 'clamp(20px,4vw,36px)', boxShadow: 'var(--shadow-sm)' }}>
            <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', color: 'var(--navy)', marginBottom: 22 }}>Send a message</h3>
            <form onSubmit={submit}>
              <div className="form-row">
                <div className="form-group"><label>First Name</label><input value={form.first} onChange={set('first')} placeholder="Sofia" /></div>
                <div className="form-group"><label>Last Name</label><input value={form.last} onChange={set('last')} placeholder="Lindqvist" /></div>
              </div>
              <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={set('email')} placeholder="sofia@example.com" /></div>
              <div className="form-group">
                <label>Subject</label>
                <select value={form.subject} onChange={set('subject')}>
                  <option>General enquiry</option>
                  <option>Lesson booking question</option>
                  <option>Pricing question</option>
                  <option>Technical issue</option>
                </select>
              </div>
              <div className="form-group"><label>Message</label><textarea value={form.message} onChange={set('message')} placeholder="Hi Neeliën, I'm interested in…" /></div>
              <button type="submit" className="btn btn-primary btn-full">Send Message →</button>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
