import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useApp();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const ok = login(email, pass);
    if (ok) navigate('/dashboard');
  };

  const fillAndLogin = (e, p) => {
    setEmail(e); setPass(p);
    const ok = login(e, p);
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

        <div className="demo-accounts">
          <strong>Demo accounts — click to sign in:</strong>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => fillAndLogin('sofia@demo.com', 'pass123')}
              style={{ textAlign: 'left', background: 'rgba(212,96,138,0.06)', border: '1px solid rgba(212,96,138,0.15)', borderRadius: 'var(--radius-xs)', padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '.78rem', color: 'var(--blue-dark)' }}
            >
              👩‍🎓 <strong>Student:</strong> sofia@demo.com · pass123
            </button>
            <button
              type="button"
              onClick={() => fillAndLogin('neelien@admin.com', 'admin123')}
              style={{ textAlign: 'left', background: 'rgba(212,96,138,0.06)', border: '1px solid rgba(212,96,138,0.15)', borderRadius: 'var(--radius-xs)', padding: '8px 12px', cursor: 'pointer', fontFamily: 'inherit', fontSize: '.78rem', color: 'var(--blue-dark)' }}
            >
              🌸 <strong>Tutor (Neeliën):</strong> neelien@admin.com · admin123
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={pass} onChange={e => setPass(e.target.value)} autoComplete="current-password" />
          </div>
          <button type="submit" className="btn btn-primary btn-full">Sign In →</button>
        </form>

        <div className="auth-footer">
          Don't have an account? <Link to="/register" style={{ color: 'var(--blue)', fontWeight: 500 }}>Create one</Link>
        </div>
      </div>
    </div>
  );
}
