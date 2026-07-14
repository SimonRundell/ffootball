import { useEffect, useState } from 'react';
import { api } from '../../api.js';

/**
 * Lists a workspace's saved backups (newest 20, server-pruned) with a
 * Restore action per row. Restoring itself takes a backup of the
 * current state first, so it is always reversible. Without userId this
 * manages the caller's own backups; with userId (teacher/admin), a
 * student's.
 *
 * @param {{ open: boolean, onClose: () => void, onRestored: () => void, userId?: string|number|null }} props
 */
export default function BackupDrawer({ open, onClose, onRestored, userId = null }) {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const query = userId ? `?user_id=${userId}` : '';
    api
      .get(`backups.php${query}`)
      .then((res) => setBackups(res.data))
      .finally(() => setLoading(false));
  }, [open, userId]);

  async function handleRestore(backupId) {
    setRestoringId(backupId);
    try {
      const body = { backup_id: backupId };
      if (userId) body.user_id = userId;
      await api.post('backups.php', body);
      onRestored();
      onClose();
    } finally {
      setRestoringId(null);
    }
  }

  if (!open) return null;

  return (
    <div className="backup-drawer">
      <div className="backup-drawer-header">
        <span>Backups</span>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      {loading && <p className="console-empty">Loading...</p>}
      {!loading && backups.length === 0 && <p className="console-empty">No backups yet.</p>}
      <ul className="backup-list">
        {backups.map((b) => (
          <li key={b.id}>
            <span>{new Date(b.saved_at).toLocaleString()}</span>
            <span className="backup-size">{b.jsx_bytes + b.css_bytes} bytes</span>
            <button type="button" disabled={restoringId === b.id} onClick={() => handleRestore(b.id)}>
              {restoringId === b.id ? 'Restoring...' : 'Restore'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
