import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Field from '../components/ui/Field';
import Icon from '../components/ui/Icon';

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
          <div className="auth-logo-icon"><Icon name="logo" weight="fill" /></div>
          <div className="auth-logo-name">The Blooming Bilingual</div>
        </div>
        <h2>{tutor ? 'Tutor Sign In' : 'Welcome Back'}</h2>
        <p className="auth-sub">{tutor ? 'Sign in to manage your students and lessons' : 'Sign in to your student portal'}</p>

        <form onSubmit={handleSubmit}>
          <Field label="Email">
            {id => <input id={id} name="email" type="email" required placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" spellCheck={false} />}
          </Field>
          <Field label="Password">
            {id => <input id={id} name="password" type="password" required placeholder="Your password" value={pass} onChange={e => setPass(e.target.value)} autoComplete="current-password" />}
          </Field>
          <button type="submit" className="btn btn-primary btn-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign In'}</button>
        </form>

        <div className="auth-footer">
          {tutor
            ? <>Are you a student? <Link to="/login">Student login</Link></>
            : <>Don’t have an account? <Link to="/register">Create one</Link></>}
        </div>
      </div>
    </div>
  );
}
