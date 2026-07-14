import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../api.js';

/**
 * Password-change screen. Used two ways: as the forced first-login
 * screen (when me.php reports must_change_password, reached via
 * redirect and with no way out but success), and as a voluntary
 * "change my password" action any logged-in role can reach from the
 * header, which offers a Cancel back to the workbench.
 */
export default function ChangePassword() {
  const { user, loading, refresh } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  if (!loading && !user) {
    return <Navigate to="/login" replace />;
  }

  const forced = Boolean(user?.must_change_password);

  if (done && !forced) {
    return <Navigate to="/workbench" replace />;
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
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not change password');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>{forced ? 'Choose a new password' : 'Change your password'}</h1>
        <p className="login-subtitle">
          {forced
            ? 'Your account needs a new password before you can continue.'
            : 'Enter your current password and choose a new one.'}
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
        {!forced && (
          <button type="button" onClick={() => navigate(-1)}>
            Cancel
          </button>
        )}
      </form>
    </div>
  );
}
