import { useState } from 'react';
import { api } from '../../api.js';
import JsonTree from './JsonTree.jsx';

const ENDPOINTS = [
  { key: 'bootstrap-static', label: 'bootstrap-static', params: [], big: true },
  { key: 'fixtures', label: 'fixtures', params: [] },
  { key: 'element-summary', label: 'element-summary', params: ['id'] },
  { key: 'event-live', label: 'event-live', params: ['gw'] },
];

/**
 * Lets students browse the four whitelisted FPL endpoints before writing
 * code against them: pick an endpoint, fill in any parameters, fetch,
 * and browse the JSON tree. "Copy axios snippet" writes a ready-to-paste
 * axios call for the current endpoint to the clipboard.
 *
 * @param {{ onCopySnippet?: (snippet: string) => void }} props
 */
export default function ApiExplorer({ onCopySnippet }) {
  const [selected, setSelected] = useState(ENDPOINTS[0]);
  const [id, setId] = useState('');
  const [gw, setGw] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  /** Builds the fpl.php query string for the currently selected endpoint. */
  function buildQuery() {
    const parts = [`endpoint=${selected.key}`];
    if (selected.params.includes('id')) parts.push(`id=${encodeURIComponent(id)}`);
    if (selected.params.includes('gw')) parts.push(`gw=${encodeURIComponent(gw)}`);
    return parts.join('&');
  }

  async function handleFetch() {
    setError('');
    setLoading(true);
    try {
      const res = await api.get(`fpl.php?${buildQuery()}`);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Request failed');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function handleCopySnippet() {
    const snippet = `axios.get('fpl.php?${buildQuery()}')\n  .then((res) => console.log(res.data));`;
    navigator.clipboard?.writeText(snippet);
    onCopySnippet?.(snippet);
  }

  return (
    <div className="api-explorer">
      <div className="api-explorer-controls">
        <select
          aria-label="FPL endpoint"
          value={selected.key}
          onChange={(e) => setSelected(ENDPOINTS.find((ep) => ep.key === e.target.value))}
        >
          {ENDPOINTS.map((ep) => (
            <option key={ep.key} value={ep.key}>
              {ep.label}
            </option>
          ))}
        </select>

        {selected.params.includes('id') && (
          <input
            type="number"
            placeholder="id"
            value={id}
            onChange={(e) => setId(e.target.value)}
            className="api-explorer-param"
          />
        )}
        {selected.params.includes('gw') && (
          <input
            type="number"
            placeholder="gw (1-38)"
            value={gw}
            onChange={(e) => setGw(e.target.value)}
            className="api-explorer-param"
          />
        )}

        <button type="button" onClick={handleFetch} disabled={loading}>
          {loading ? 'Fetching...' : 'Fetch'}
        </button>
        <button type="button" onClick={handleCopySnippet}>
          Copy axios snippet
        </button>
      </div>

      {selected.big && <p className="api-explorer-warning">This endpoint returns about 2 MB of JSON.</p>}
      {error && <p className="form-error">{error}</p>}

      <div className="api-explorer-result">
        {result !== null ? <JsonTree data={result} /> : <p className="console-empty">Fetch an endpoint to see its data here.</p>}
      </div>
    </div>
  );
}
