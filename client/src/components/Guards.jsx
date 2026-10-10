import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function RequireAuth() {
  const { user, ready } = useAuth();
  const location = useLocation();
  if (!ready) return <p className="wrap muted pad">Loading…</p>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <Outlet />;
}

export function RequireAdmin() {
  const { user, ready, isAdmin } = useAuth();
  if (!ready) return <p className="wrap muted pad">Loading…</p>;
  if (!user) return <Navigate to="/login" state={{ from: '/admin' }} replace />;
  if (!isAdmin) {
    return (
      <div className="wrap pad">
        <h1>Admins only</h1>
        <p className="muted">Your account does not have access to this area.</p>
      </div>
    );
  }
  return <Outlet />;
}
