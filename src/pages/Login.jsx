import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import Field from '../components/ui/Field';
import AuthShell from '../components/ui/AuthShell';

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
    <AuthShell headline="Welcome back to your learning journey.">
      {!tutor && (
        <nav className="auth-tabs" aria-label="Account">
          <Link to="/login" className="auth-tab" aria-current="page">Log in</Link>
          <Link to="/register" className="auth-tab">Register</Link>
        </nav>
      )}
      <h1>{tutor ? 'Tutor Sign In' : 'Welcome Back'}</h1>
      <p className="auth-sub">{tutor ? 'Sign in to manage your students and lessons' : 'Sign in to continue your English journey.'}</p>

      <form onSubmit={handleSubmit}>
        <Field label="Email">
          {id => <input id={id} name="email" type="email" required placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" spellCheck={false} />}
        </Field>
        <Field label="Password">
          {id => <input id={id} name="password" type="password" required placeholder="Your password" value={pass} onChange={e => setPass(e.target.value)} autoComplete="current-password" />}
        </Field>
        <button type="submit" className="btn btn-primary btn-full" disabled={busy}>{busy ? 'Signing in…' : 'Log In'}</button>
      </form>

      <div className="auth-footer">
        {tutor
          ? <>Are you a student? <Link to="/login">Student login</Link></>
          : <>Don’t have an account? <Link to="/register">Register</Link></>}
      </div>
    </AuthShell>
  );
}
