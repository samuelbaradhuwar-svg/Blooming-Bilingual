import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { captureOrder } from '../lib/payments';

// PayPal sends the student back here after they approve (/payment/return) or cancel (/payment/cancelled).
export function PaymentReturn() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refreshCredits, showToast } = useApp();
  const orderId = params.get('order');
  const [state, setState] = useState({ status: 'working', message: '' });
  const started = useRef(false);   // React StrictMode runs effects twice in development; only capture once

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!orderId) { setState({ status: 'error', message: 'This payment link is not valid.' }); return; }
    captureOrder(orderId)
      .then(async (res) => {
        await refreshCredits();
        showToast(`${res.credits} credit${res.credits > 1 ? 's' : ''} added. Thank you! 🌸`, 'success');
        navigate('/dashboard', { replace: true });
      })
      .catch((e) => setState({ status: 'error', message: e.message }));
  }, [orderId, navigate, refreshCredits, showToast]);

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        {state.status === 'working' ? (
          <>
            <h2>Confirming your payment…</h2>
            <p className="auth-sub">Please don't close this page.</p>
          </>
        ) : (
          <>
            <h2>We couldn't confirm the payment</h2>
            <p className="auth-sub">{state.message}</p>
            <Link to="/dashboard" className="btn btn-primary">Back to my dashboard</Link>
          </>
        )}
      </div>
    </div>
  );
}

export function PaymentCancelled() {
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h2>Payment cancelled</h2>
        <p className="auth-sub">No money was taken. You can try again whenever you're ready.</p>
        <Link to="/dashboard" className="btn btn-primary">Back to my dashboard</Link>
      </div>
    </div>
  );
}
