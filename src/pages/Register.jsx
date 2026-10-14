import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Field from '../components/ui/Field';
import Icon from '../components/ui/Icon';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useApp();
  const [form, setForm] = useState({ first: '', last: '', email: '', pass: '', country: '' });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const res = await register(form.first, form.last, form.email, form.pass, form.country);
    setBusy(false);
    if (res.ok) navigate(res.needsConfirmation ? '/login' : '/dashboard', { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon"><Icon name="logo" weight="fill" /></div>
          <div className="auth-logo-name">The Blooming Bilingual</div>
        </div>
        <h2>Create Your Account</h2>
        <p className="auth-sub">Join and start booking lessons today</p>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <Field label="First name">{id => <input id={id} name="given-name" required autoComplete="given-name" value={form.first} onChange={set('first')} placeholder="Sofia" />}</Field>
            <Field label="Last name">{id => <input id={id} name="family-name" required autoComplete="family-name" value={form.last} onChange={set('last')} placeholder="Lindqvist" />}</Field>
          </div>
          <Field label="Email">{id => <input id={id} name="email" type="email" required autoComplete="email" spellCheck={false} value={form.email} onChange={set('email')} placeholder="sofia@example.com" />}</Field>
          <Field label="Password" hint="At least 6 characters.">
            {id => <input id={id} name="new-password" type="password" required minLength={6} autoComplete="new-password" value={form.pass} onChange={set('pass')} placeholder="Choose a password" />}
          </Field>
          <Field label="Country (optional)">
            {id => (
              <select id={id} name="country" autoComplete="country-name" value={form.country} onChange={set('country')}>
                <option value="">Select your country</option>
                {['South Africa','Netherlands','Sweden','Japan','Germany','France','Brazil','UAE','Other'].map(c => <option key={c}>{c}</option>)}
              </select>
            )}
          </Field>
          <button type="submit" className="btn btn-primary btn-full" disabled={busy}>{busy ? 'Creating account…' : 'Create Account'}</button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
