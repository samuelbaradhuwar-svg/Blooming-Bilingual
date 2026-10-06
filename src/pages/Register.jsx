import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Register() {
  const navigate = useNavigate();
  const { register } = useApp();
  const [form, setForm] = useState({ first: '', last: '', email: '', pass: '', country: '' });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first || !form.last || !form.email || !form.pass) return;
    setBusy(true);
    const res = await register(form.first, form.last, form.email, form.pass, form.country);
    setBusy(false);
    if (res.ok) navigate(res.needsConfirmation ? '/login' : '/dashboard');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🌸</div>
          <div className="auth-logo-name">The Blooming Bilingual</div>
        </div>
        <h2>Create your account</h2>
        <p className="auth-sub">Join and start booking lessons today</p>

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group"><label>First Name</label><input value={form.first} onChange={set('first')} placeholder="Sofia" /></div>
            <div className="form-group"><label>Last Name</label><input value={form.last} onChange={set('last')} placeholder="Lindqvist" /></div>
          </div>
          <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={set('email')} placeholder="sofia@example.com" /></div>
          <div className="form-group"><label>Password</label><input type="password" minLength={6} autoComplete="new-password" value={form.pass} onChange={set('pass')} placeholder="Choose a password" /></div>
          <div className="form-group">
            <label>Country</label>
            <select value={form.country} onChange={set('country')}>
              <option value="">Select your country</option>
              {['South Africa','Netherlands','Sweden','Japan','Germany','France','Brazil','UAE','Other'].map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={busy}>{busy ? 'Creating…' : '🌸 Create Account'}</button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 500 }}>Sign in</Link>
        </div>
      </div>
    </div>
  );
}
