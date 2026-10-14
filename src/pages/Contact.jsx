import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../lib/supabase';
import Field from '../components/ui/Field';
import Icon from '../components/ui/Icon';
import PageHero from '../components/ui/PageHero';

const INFO = [
  { icon: 'mail',  bg: 'rgba(122,31,92,0.1)', label: 'Reply by email', value: "I'll write back to the address you enter" },
  { icon: 'clock', bg: 'var(--orange-bg)',      label: 'Response time',  value: 'Within 24 hours (Mon–Fri)' },
  { icon: 'globe', bg: 'var(--soft-pink)',               label: 'Time zone',      value: 'SAST (UTC+2) · All zones welcome' },
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
      <PageHero label="Contact" title="Let’s talk.">
        Questions before booking? Reach out and I’ll reply within 24 hours.
      </PageHero>

      <section className="section section-alt">
        <div className="section-inner contact-layout">
          {/* Info */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 20 }}>Contact info</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {INFO.map(i => (
                <div key={i.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 44, height: 44, minWidth: 44, borderRadius: 'var(--radius-sm)', background: i.bg, color: 'var(--blue-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.3rem' }}><Icon name={i.icon} /></div>
                  <div><strong style={{ fontSize: '.9rem', display: 'block' }}>{i.label}</strong><span style={{ fontSize: '.85rem', color: 'var(--ink-muted)' }}>{i.value}</span></div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div style={{ background: 'white', borderRadius: 'var(--radius)', border: '1px solid var(--border-soft)', padding: 'clamp(20px,4vw,36px)', boxShadow: 'var(--shadow-sm)' }}>
            {sent ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <div style={{ fontSize: '2.6rem', marginBottom: 10, color: 'var(--green)', display: 'flex', justifyContent: 'center' }}><Icon name="success" weight="fill" /></div>
                <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>Message Sent</h2>
                <p style={{ fontSize: '.95rem', color: 'var(--ink-soft)', marginBottom: 18 }} role="status">Thank you! Neeliën will reply to your email within 24 hours.</p>
                <button className="btn btn-outline btn-sm" onClick={() => setSent(false)}>Send another message</button>
              </div>
            ) : (
              <>
                <h2 style={{ fontFamily: 'var(--font-ui)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 22 }}>Send a Message</h2>
                <form onSubmit={submit}>
                  <div className="form-row">
                    <Field label="First name">{id => <input id={id} name="given-name" required maxLength={50} autoComplete="given-name" value={form.first} onChange={set('first')} placeholder="Sofia" />}</Field>
                    <Field label="Last name">{id => <input id={id} name="family-name" maxLength={50} autoComplete="family-name" value={form.last} onChange={set('last')} placeholder="Lindqvist" />}</Field>
                  </div>
                  <Field label="Email">{id => <input id={id} name="email" required type="email" maxLength={200} autoComplete="email" spellCheck={false} value={form.email} onChange={set('email')} placeholder="sofia@example.com" />}</Field>
                  <Field label="Subject">
                    {id => (
                      <select id={id} name="subject" value={form.subject} onChange={set('subject')}>
                        <option>General enquiry</option>
                        <option>Lesson booking question</option>
                        <option>Pricing question</option>
                        <option>Technical issue</option>
                      </select>
                    )}
                  </Field>
                  <Field label="Message">{id => <textarea id={id} name="message" required minLength={5} maxLength={4000} autoComplete="off" value={form.message} onChange={set('message')} placeholder="Hi Neeliën, I’m interested in…" />}</Field>
                  {/* Hidden spam trap: people never see or fill this, simple bots do. */}
                  <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', height: 0, overflow: 'hidden' }}>
                    <label>Website<input name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} /></label>
                  </div>
                  <button type="submit" className="btn btn-primary btn-full" disabled={busy}>{busy ? 'Sending…' : <><Icon name="send" /> Send Message</>}</button>
                </form>
              </>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
