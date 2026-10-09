import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Login({ tutor = false }) {
  const navigate = useNavigate();
  const { state } = useLocation();
  const from = typeof state?.from === 'string' && state.from.startsWith('/') ? state.from : '/dashboard';
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const user = await login(email, pass, tutor ? 'admin' : undefined);
    setBusy(false);
    if (user) navigate(from, { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🌸</div>
          <div className="auth-logo-name">The Blooming Bilingual</div>
        </div>
        <h2>{tutor ? 'Tutor sign in' : 'Welcome back'}</h2>
        <p className="auth-sub">{tutor ? 'Sign in to manage your students and lessons' : 'Sign in to your student portal'}</p>

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
          {tutor
            ? <>Are you a student? <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 500 }}>Student login</Link></>
            : <>Don't have an account? <Link to="/register" style={{ color: 'var(--blue)', fontWeight: 500 }}>Create one</Link></>}
        </div>
      </div>
    </div>
  );
}
