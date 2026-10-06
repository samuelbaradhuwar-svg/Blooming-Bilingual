import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
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
          <Route path="/login"     element={<Login />} />
          <Route path="/register"  element={<Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="*"          element={<NotFound />} />
        </Routes>
      </Suspense>

      <Toast />
      <Modal />
    </>
  );
}
