import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import BackupDrawer from '../components/workbench/BackupDrawer.jsx';
import BulkUploadDialog from '../components/students/BulkUploadDialog.jsx';

/**
 * Teacher/admin student list: display name, username, last save time,
 * active flag, and management actions. Admins additionally see and can
 * create teacher/admin accounts here (their role select offers every
 * role; a teacher's is fixed to student).
 */
export default function Students() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ username: '', display_name: '', password: '', role: 'student' });
  const [formError, setFormError] = useState('');
  const [tempPassword, setTempPassword] = useState(null);
  const [backupUserId, setBackupUserId] = useState(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  function load() {
    setLoading(true);
    api
      .get('users.php')
      .then((res) => setAccounts(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    try {
      await api.post('users.php', form);
      setForm({ username: '', display_name: '', password: '', role: 'student' });
      setShowCreate(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not create account');
    }
  }

  async function handleResetPassword(id) {
    const res = await api.put(`users.php?id=${id}`, { reset_password: true });
    setTempPassword({ id, password: res.data.temp_password });
  }

  async function handleToggleActive(account) {
    if (account.is_active) {
      await api.delete(`users.php?id=${account.id}`);
    } else {
      await api.put(`users.php?id=${account.id}`, { is_active: true });
    }
    load();
  }

  async function handleHardDelete(id) {
    if (!window.confirm('Permanently delete this account? This cannot be undone.')) return;
    await api.delete(`users.php?id=${id}&hard=1`);
    load();
  }

  const roleOptions = isAdmin ? ['student', 'teacher', 'admin'] : ['student'];

  return (
    <div className="page page-wide">
      <div className="page-header">
        <h1>{isAdmin ? 'All accounts' : 'Students'}</h1>
        <div className="page-header-actions">
          <button type="button" onClick={() => setShowBulkUpload(true)}>
            Bulk upload students
          </button>
          <button type="button" onClick={() => setShowCreate((v) => !v)}>
            {showCreate ? 'Cancel' : 'Create account'}
          </button>
        </div>
      </div>

      {showCreate && (
        <form className="inline-form" onSubmit={handleCreate}>
          <input
            placeholder="Username"
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            required
          />
          <input
            placeholder="Display name"
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            required
          />
          <input
            placeholder="Temporary password"
            type="text"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            minLength={8}
            required
          />
          {roleOptions.length > 1 && (
            <select aria-label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {roleOptions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}
          <button type="submit">Create</button>
          {formError && <p className="form-error">{formError}</p>}
        </form>
      )}

      {tempPassword && (
        <p className="temp-password-notice">
          Temporary password for account #{tempPassword.id}: <code>{tempPassword.password}</code>{' '}
          <button type="button" onClick={() => setTempPassword(null)}>
            Dismiss
          </button>
        </p>
      )}

      {loading ? (
        <p className="loading-notice">Loading...</p>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              {isAdmin && <th>Role</th>}
              <th>Last saved</th>
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id}>
                <td>{a.display_name}</td>
                <td>{a.username}</td>
                {isAdmin && <td>{a.role}</td>}
                <td>{a.last_saved_at ? new Date(a.last_saved_at).toLocaleString() : 'never'}</td>
                <td>{a.is_active ? 'yes' : 'no'}</td>
                <td className="data-table-actions">
                  {a.role === 'student' && (
                    <>
                      <Link to={`/students/${a.id}/workbench`}>Open work</Link>
                      <button type="button" onClick={() => setBackupUserId(a.id)}>
                        Backups
                      </button>
                    </>
                  )}
                  <button type="button" onClick={() => handleResetPassword(a.id)}>
                    Reset password
                  </button>
                  <button type="button" onClick={() => handleToggleActive(a)}>
                    {a.is_active ? 'Deactivate' : 'Reactivate'}
                  </button>
                  {isAdmin && !a.is_active && (
                    <button type="button" className="danger" onClick={() => handleHardDelete(a.id)}>
                      Delete permanently
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <BackupDrawer
        open={backupUserId !== null}
        userId={backupUserId}
        onClose={() => setBackupUserId(null)}
        onRestored={() => {}}
      />

      <BulkUploadDialog
        open={showBulkUpload}
        onClose={() => setShowBulkUpload(false)}
        onCreated={load}
        existingUsernames={accounts.map((a) => a.username)}
      />
    </div>
  );
}
