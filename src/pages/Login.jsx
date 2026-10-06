import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const ok = await login(email, pass);
    setBusy(false);
    if (ok) navigate('/dashboard');
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🌸</div>
          <div className="auth-logo-name">The Blooming Bilingual</div>
        </div>
        <h2>Welcome back</h2>
        <p className="auth-sub">Sign in to your student portal</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" required placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" required placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn-primary btn-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign In →'}</button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register" style={{ color: 'var(--blue)', fontWeight: 500 }}>Create one</Link>
        </div>
      </div>
    </div>
  );
}
