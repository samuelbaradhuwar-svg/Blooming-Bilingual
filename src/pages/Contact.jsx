import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';

const INFO = [
  { icon: '✉️', bg: 'rgba(212,96,138,0.08)', label: 'Reply by email', value: "I'll write back to the address you enter" },
  { icon: '⏰', bg: 'var(--orange-bg)',        label: 'Response time',  value: 'Within 24 hours (Mon–Fri)' },
  { icon: '🌍', bg: '#FAE4EB',                 label: 'Timezone',       value: 'SAST (UTC+2) · All zones welcome' },
];

const BLANK = { first: '', last: '', email: '', subject: 'General enquiry', message: '', website: '' };

export default function Contact() {
  const { showToast } = useApp();
  const [form, setForm] = useState(BLANK);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.rpc('send_contact_message', {
      p_name: `${form.first} ${form.last}`.trim(),
      p_email: form.email,
      p_subject: form.subject,
      p_message: form.message,
      p_website: form.website,
    });
    setBusy(false);
    if (error) { showToast(error.message || 'Could not send your message. Please try again.', 'error'); return; }
    setSent(true);
    setForm(BLANK);
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {INFO.map(i => (
                <div key={i.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, minWidth: 42, borderRadius: 'var(--radius-sm)', background: i.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>{i.icon}</div>
                  <div><strong style={{ fontSize: '.875rem', display: 'block' }}>{i.label}</strong><span style={{ fontSize: '.8rem', color: 'var(--ink-muted)' }}>{i.value}</span></div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div style={{ background: 'white', borderRadius: 'var(--radius)', border: '1px solid var(--border-soft)', padding: 'clamp(20px,4vw,36px)', boxShadow: 'var(--shadow-sm)' }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: '2.4rem', marginBottom: 10 }}>📨</div>
                <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.3rem', color: 'var(--navy)', marginBottom: 8 }}>Message sent</h3>
                <p style={{ fontSize: '.9rem', color: 'var(--ink-soft)', marginBottom: 18 }}>Thank you! Neeliën will reply to your email within 24 hours.</p>
                <button className="btn btn-outline btn-sm" onClick={() => setSent(false)}>Send another message</button>
              </div>
            ) : (
              <>
                <h3 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: '1.1rem', color: 'var(--navy)', marginBottom: 22 }}>Send a message</h3>
                <form onSubmit={submit}>
                  <div className="form-row">
                    <div className="form-group"><label>First Name</label><input required maxLength={50} value={form.first} onChange={set('first')} placeholder="Sofia" /></div>
                    <div className="form-group"><label>Last Name</label><input maxLength={50} value={form.last} onChange={set('last')} placeholder="Lindqvist" /></div>
                  </div>
                  <div className="form-group"><label>Email</label><input required type="email" maxLength={200} value={form.email} onChange={set('email')} placeholder="sofia@example.com" /></div>
                  <div className="form-group">
                    <label>Subject</label>
                    <select value={form.subject} onChange={set('subject')}>
                      <option>General enquiry</option>
                      <option>Lesson booking question</option>
                      <option>Pricing question</option>
                      <option>Technical issue</option>
                    </select>
                  </div>
                  <div className="form-group"><label>Message</label><textarea required minLength={5} maxLength={4000} value={form.message} onChange={set('message')} placeholder="Hi Neeliën, I'm interested in…" /></div>
                  {/* Hidden spam trap: people never see or fill this, simple bots do. */}
                  <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', height: 0, overflow: 'hidden' }}>
                    <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} /></label>
                  </div>
                  <button type="submit" className="btn btn-primary btn-full" disabled={busy}>{busy ? 'Sending…' : 'Send Message →'}</button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
