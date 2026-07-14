import { useEffect, useState } from 'react';
import { api } from '../api.js';
import Students from './Students.jsx';

/**
 * Admin panel: account management (reuses the Students screen, which
 * shows every role to an admin), plus FPL settings, cache status, and
 * clear-cache.
 */
export default function Admin() {
  const [settings, setSettings] = useState(null);
  const [stats, setStats] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  function loadSettings() {
    api.get('settings.php').then((res) => setSettings(res.data));
  }

  function loadStats() {
    api.get('settings.php?action=stats').then((res) => setStats(res.data));
  }

  useEffect(() => {
    loadSettings();
    loadStats();
  }, []);

  async function handleSaveSettings(e) {
    e.preventDefault();
    setMessage('');
    setError('');
    try {
      const res = await api.put('settings.php', {
        fpl_base_url: settings.fpl_base_url,
        cache_ttl_seconds: Number(settings.cache_ttl_seconds),
      });
      setSettings(res.data);
      setMessage('Settings saved');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save settings');
    }
  }

  async function handleClearCache() {
    await api.post('settings.php?action=clear_cache');
    setMessage('FPL cache cleared');
    loadStats();
  }

  return (
    <div className="page page-wide">
      <h1>Admin</h1>

      <section className="admin-section">
        <h2>FPL settings</h2>
        {settings && (
          <form className="inline-form" onSubmit={handleSaveSettings}>
            <label>
              Base URL
              <input
                value={settings.fpl_base_url}
                onChange={(e) => setSettings({ ...settings, fpl_base_url: e.target.value })}
              />
            </label>
            <label>
              Cache TTL (seconds)
              <input
                type="number"
                min={60}
                max={86400}
                value={settings.cache_ttl_seconds}
                onChange={(e) => setSettings({ ...settings, cache_ttl_seconds: e.target.value })}
              />
            </label>
            <button type="submit">Save</button>
            <button type="button" onClick={handleClearCache}>
              Clear FPL cache
            </button>
          </form>
        )}
        {message && <p className="form-success">{message}</p>}
        {error && <p className="form-error">{error}</p>}
      </section>

      {stats && (
        <section className="admin-section">
          <h2>Status</h2>
          <ul className="status-card">
            <li>FPL cache rows: {stats.cache_rows}</li>
            <li>Oldest cache entry: {stats.cache_oldest ?? 'none'}</li>
            <li>Newest cache entry: {stats.cache_newest ?? 'none'}</li>
            <li>Workspace data size: {(stats.workspace_bytes / 1024).toFixed(1)} KB</li>
            <li>Students: {stats.student_count}</li>
          </ul>
        </section>
      )}

      <section className="admin-section">
        <h2>Accounts</h2>
        <Students />
      </section>
    </div>
  );
}
