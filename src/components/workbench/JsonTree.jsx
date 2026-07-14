import { useState } from 'react';

/**
 * Small recursive, collapsible JSON tree viewer. No external dependency;
 * good enough for browsing FPL API responses in the explorer panel.
 *
 * @param {{ data: unknown, name?: string, depth?: number }} props
 */
export default function JsonTree({ data, name = null, depth = 0 }) {
  const [open, setOpen] = useState(depth < 1);

  if (data === null || typeof data !== 'object') {
    return (
      <div className="json-tree-leaf" style={{ paddingLeft: depth * 14 }}>
        {name !== null && <span className="json-tree-key">{name}: </span>}
        <span className="json-tree-value">{JSON.stringify(data)}</span>
      </div>
    );
  }

  const isArray = Array.isArray(data);
  const entries = isArray ? data.map((v, i) => [i, v]) : Object.entries(data);
  const summary = isArray ? `Array(${entries.length})` : `Object(${entries.length})`;

  return (
    <div className="json-tree-branch" style={{ paddingLeft: depth * 14 }}>
      <button type="button" className="json-tree-toggle" onClick={() => setOpen(!open)}>
        {open ? '▾' : '▸'} {name !== null ? `${name}: ` : ''}
        {summary}
      </button>
      {open && (
        <div>
          {entries.map(([key, value]) => (
            <JsonTree key={key} data={value} name={String(key)} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
