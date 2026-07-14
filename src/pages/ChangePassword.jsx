import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';

/**
 * Forced password-change screen, shown when me.php reports
 * must_change_password. Also reachable voluntarily later as "change my
 * password" once that link exists in a settings screen.
 */
export default function ChangePassword() {
  const { user, loading, refresh } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

  if (!loading && user && !user.must_change_password) {
    return <Navigate to="/" replace />;
  }

  /** @param {import('react').FormEvent} e */
  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('change_password.php', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      await refresh();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not change password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Choose a new password</h1>
        <p className="login-subtitle">
          Your account needs a new password before you can continue.
        </p>
        <label htmlFor="current">Current password</label>
        <input
          id="current"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
        <label htmlFor="new">New password</label>
        <input
          id="new"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
        <label htmlFor="confirm">Confirm new password</label>
        <input
          id="confirm"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
        {error && <p className="form-error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save new password'}
        </button>
      </form>
    </div>
  );
}
