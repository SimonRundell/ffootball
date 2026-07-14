import { useEffect, useState } from 'react';
import { api } from '../../api.js';

/**
 * Lists the student's saved backups (newest 20, server-pruned) with a
 * Restore action per row. Restoring itself takes a backup of the
 * current state first, so it is always reversible.
 *
 * @param {{ open: boolean, onClose: () => void, onRestored: () => void }} props
 */
export default function BackupDrawer({ open, onClose, onRestored }) {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoringId, setRestoringId] = useState(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .get('backups.php')
      .then((res) => setBackups(res.data))
      .finally(() => setLoading(false));
  }, [open]);

  async function handleRestore(backupId) {
    setRestoringId(backupId);
    try {
      await api.post('backups.php', { backup_id: backupId });
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
