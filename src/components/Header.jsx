import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * App header: title, current user with role badge, and logout. Shown on
 * every page except the login screen.
 */
export default function Header() {
  const { user, logout } = useAuth();

  if (!user) {
    return null;
  }

  return (
    <header className="app-header">
      <div className="app-header-title">
        <Link to="/">
          <img src="/favicon.png" alt="" className="app-header-logo" />
          FPL Data Lab
        </Link>
      </div>
      <nav className="app-header-nav">
        <Link to="/workbench">Workbench</Link>
        {(user.role === 'teacher' || user.role === 'admin') && (
          <Link to="/students">Students</Link>
        )}
        {user.role === 'admin' && <Link to="/admin">Admin</Link>}
      </nav>
      <div className="app-header-user">
        <span>{user.display_name}</span>
        <span className={`role-badge role-${user.role}`}>{user.role}</span>
        <Link to="/change-password" className="button-link">
          Change password
        </Link>
        <button type="button" onClick={logout}>
          Log out
        </button>
      </div>
    </header>
  );
}
