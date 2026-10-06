import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import { useApp } from './context/AppContext';
import Toast from './components/ui/Toast';
import Modal from './components/ui/Modal';
import PublicNav from './components/PublicNav';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';

const About     = lazy(() => import('./pages/About'));
const Services  = lazy(() => import('./pages/Services'));
const Pricing   = lazy(() => import('./pages/Pricing'));
const Contact   = lazy(() => import('./pages/Contact'));
const Login     = lazy(() => import('./pages/Login'));
const Register  = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));

// Signed-in users have no reason to see the login/register pages.
function GuestOnly({ children }) {
  const { currentUser, authLoading } = useApp();
  if (authLoading) return null;
  return currentUser ? <Navigate to="/dashboard" replace /> : children;
}

function NotFound() {
  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center' }}>
        <h2>Page not found</h2>
        <p className="auth-sub">That page doesn't exist.</p>
        <Link to="/" className="btn btn-primary">Back home</Link>
      </div>
    </div>
  );
}

export default function App() {
  const { pathname } = useLocation();
  const { currentUser } = useApp();
  const showPublicNav = !(pathname.startsWith('/dashboard') && currentUser);

  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);

  return (
    <>
      {showPublicNav && <PublicNav />}

      <Suspense fallback={null}>
        <Routes>
          <Route path="/"          element={<Home />} />
          <Route path="/about"     element={<About />} />
          <Route path="/services"  element={<Services />} />
          <Route path="/pricing"   element={<Pricing />} />
          <Route path="/contact"   element={<Contact />} />
          <Route path="/login"     element={<GuestOnly><Login /></GuestOnly>} />
          <Route path="/tutor-login" element={<GuestOnly><Login tutor /></GuestOnly>} />
          <Route path="/register"  element={<GuestOnly><Register /></GuestOnly>} />
          <Route path="/dashboard/:view?" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="*"          element={<NotFound />} />
        </Routes>
      </Suspense>

      <Toast />
      <Modal />
    </>
  );
}
