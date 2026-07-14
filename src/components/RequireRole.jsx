import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const ROLE_RANK = { student: 1, teacher: 2, admin: 3 };

/**
 * Route guard: redirects to /login if not logged in, or to /workbench if
 * logged in but below the required role. The server enforces the real
 * security boundary on every endpoint; this only hides navigation.
 *
 * @param {{ minRole?: 'student'|'teacher'|'admin', children: import('react').ReactNode }} props
 */
export default function RequireRole({ minRole = 'student', children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="loading-notice">Loading...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.must_change_password) {
    return <Navigate to="/change-password" replace />;
  }

  if (ROLE_RANK[user.role] < ROLE_RANK[minRole]) {
    return <Navigate to="/workbench" replace />;
  }

  return children;
}
