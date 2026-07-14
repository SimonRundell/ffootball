import { useState } from 'react';
import { api } from '../../api.js';
import { parseStudentCsv } from '../../lib/csv.js';

/**
 * Generates a readable default password to pre-fill the form with, in
 * the same style as the server's individual reset-password generator.
 * @returns {string}
 */
function suggestPassword() {
  return 'Class-' + Math.random().toString(36).slice(2, 8);
}

/**
 * Bulk student upload: pick a CSV, preview the parsed rows against the
 * existing account list, set a shared default password and a
 * force-change-on-next-login flag, then commit. One bad row never
 * blocks the rest; results are reported per row after submit.
 *
 * @param {{ open: boolean, onClose: () => void, onCreated: () => void, existingUsernames: string[] }} props
 */
export default function BulkUploadDialog({ open, onClose, onCreated, existingUsernames }) {
  const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState([]);
  const [parseError, setParseError] = useState('');
  const [defaultPassword, setDefaultPassword] = useState(() => suggestPassword());
  const [forceChange, setForceChange] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState(null);
  const [submitError, setSubmitError] = useState('');

  if (!open) return null;

  const existingLower = new Set(existingUsernames.map((u) => u.toLowerCase()));

  /** Annotates parsed rows with a validation status for the preview table. */
  function annotate(parsedRows) {
    const seen = new Set();
    return parsedRows.map((row) => {
      const key = row.username.toLowerCase();
      let status = 'ok';
      let reason = '';

      if (!row.username || !row.display_name) {
        status = 'invalid';
        reason = 'Missing username or display name';
      } else if (seen.has(key)) {
        status = 'invalid';
        reason = 'Duplicate username in this file';
      } else if (existingLower.has(key)) {
        status = 'invalid';
        reason = 'Username already exists';
      }

      seen.add(key);
      return { ...row, status, reason };
    });
  }

  /** @param {import('react').ChangeEvent<HTMLInputElement>} e */
  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResults(null);
    setParseError('');
    setSubmitError('');

    const reader = new FileReader();
    reader.onload = () => {
      const { rows: parsed, error } = parseStudentCsv(String(reader.result));
      if (error) {
        setParseError(error);
        setRows([]);
        return;
      }
      setRows(annotate(parsed));
    };
    reader.readAsText(file, 'utf-8');
  }

  const validRows = rows.filter((r) => r.status === 'ok');

  async function handleSubmit() {
    setSubmitting(true);
    setSubmitError('');
    try {
      const res = await api.post('users_bulk.php', {
        default_password: defaultPassword,
        force_change: forceChange,
        students: validRows.map(({ username, display_name }) => ({ username, display_name })),
      });
      setResults(res.data);
      onCreated();
    } catch (err) {
      const message = err.response?.data?.error || err.message || 'Could not create accounts';
      setSubmitError(message);
      console.error('Bulk upload failed:', err);
    } finally {
      setSubmitting(false);
    }
  }

  function handleClose() {
    setFileName('');
    setRows([]);
    setParseError('');
    setSubmitError('');
    setResults(null);
    setDefaultPassword(suggestPassword());
    onClose();
  }

  return (
    <div className="modal-overlay">
      <div className="modal-dialog">
        <div className="modal-header">
          <span>Bulk upload students</span>
          <button type="button" onClick={handleClose}>
            Close
          </button>
        </div>

        {!results && (
          <>
            <p className="bulk-upload-hint">
              Upload a UTF-8 CSV exported from Excel with a header row containing{' '}
              <code>username</code> and <code>display_name</code> columns (also accepted:{' '}
              <code>user</code>/<code>login</code> for username, and <code>full name</code>/
              <code>name</code>/<code>student</code> for display name). One row per student.
            </p>

            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              aria-label="Choose a student list CSV file"
            />
            {fileName && <span className="bulk-upload-filename">{fileName}</span>}
            {parseError && <p className="form-error">{parseError}</p>}

            {rows.length > 0 && (
              <>
                <div className="inline-form">
                  <label>
                    Default password for every account
                    <input
                      value={defaultPassword}
                      onChange={(e) => setDefaultPassword(e.target.value)}
                      minLength={8}
                    />
                  </label>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={forceChange}
                      onChange={(e) => setForceChange(e.target.checked)}
                    />
                    Force password change on next login
                  </label>
                </div>
                {defaultPassword.length > 0 && defaultPassword.length < 8 && (
                  <p className="form-error bulk-upload-password-hint">
                    The default password needs at least 8 characters ({defaultPassword.length} so far) before you
                    can create accounts.
                  </p>
                )}

                <div className="bulk-upload-preview">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Username</th>
                        <th>Display name</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, i) => (
                        <tr
                          key={`${row.username}-${i}`}
                          className={row.status === 'invalid' ? 'bulk-row-invalid' : ''}
                        >
                          <td>{row.username || <em>(blank)</em>}</td>
                          <td>{row.display_name || <em>(blank)</em>}</td>
                          <td>{row.status === 'ok' ? 'Ready' : row.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <p className="bulk-upload-summary">
                  {validRows.length} of {rows.length} row{rows.length === 1 ? '' : 's'} will be created.
                </p>

                <button
                  type="button"
                  className="bulk-upload-submit"
                  onClick={handleSubmit}
                  disabled={validRows.length === 0 || defaultPassword.length < 8 || submitting}
                >
                  {submitting ? 'Creating accounts...' : `Create ${validRows.length} account(s)`}
                </button>
                {submitError && <p className="form-error bulk-upload-submit-error">{submitError}</p>}
              </>
            )}
          </>
        )}

        {results && (
          <div className="bulk-upload-results">
            <p className="form-success">
              Created {results.created_count} account{results.created_count === 1 ? '' : 's'}.
              {results.skipped_count > 0 && ` Skipped ${results.skipped_count}.`}
            </p>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {results.results.map((r, i) => (
                  <tr key={`${r.username}-${i}`} className={r.status === 'skipped' ? 'bulk-row-invalid' : ''}>
                    <td>{r.username}</td>
                    <td>{r.status === 'created' ? 'Created' : r.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" onClick={handleClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
