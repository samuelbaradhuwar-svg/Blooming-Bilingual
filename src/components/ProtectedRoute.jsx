import { Navigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function ProtectedRoute({ children }) {
  const { currentUser, authLoading } = useApp();
  const location = useLocation();
  if (authLoading) return null;
  // remember where they were going (e.g. the payment return page) so sign-in can send them back there
  if (!currentUser) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return children;
}
