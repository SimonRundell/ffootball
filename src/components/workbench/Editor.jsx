import { useState } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { PREAMBLE } from '../../sandbox/preamble.js';

const TABS = [
  { key: 'jsx', label: 'DataDisplay.jsx', language: 'javascript' },
  { key: 'css', label: 'DataDisplay.css', language: 'css' },
  { key: 'notes', label: 'Notes', language: 'markdown' },
];

/**
 * Three-tab Monaco editor: JSX (with a read-only preamble block above
 * it), CSS, and Notes. Read-only in teacher/admin viewing mode.
 *
 * @param {{
 *   jsxCode: string, cssCode: string, notes: string,
 *   onChangeJsx: (v: string) => void,
 *   onChangeCss: (v: string) => void,
 *   onChangeNotes: (v: string) => void,
 *   readOnly?: boolean,
 * }} props
 */
export default function Editor({
  jsxCode,
  cssCode,
  notes,
  onChangeJsx,
  onChangeCss,
  onChangeNotes,
  readOnly = false,
}) {
  const [activeTab, setActiveTab] = useState('jsx');

  return (
    <div className="editor-pane">
      <div className="editor-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={tab.key === activeTab ? 'editor-tab active' : 'editor-tab'}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'jsx' && (
        <div className="editor-jsx-tab">
          <pre className="editor-preamble">{PREAMBLE}</pre>
          <MonacoEditor
            height="100%"
            language="javascript"
            theme="vs-dark"
            value={jsxCode}
            onChange={(v) => onChangeJsx(v ?? '')}
            options={{ readOnly, minimap: { enabled: false }, fontSize: 14 }}
          />
        </div>
      )}

      {activeTab === 'css' && (
        <MonacoEditor
          height="100%"
          language="css"
          theme="vs-dark"
          value={cssCode}
          onChange={(v) => onChangeCss(v ?? '')}
          options={{ readOnly, minimap: { enabled: false }, fontSize: 14 }}
        />
      )}

      {activeTab === 'notes' && (
        <MonacoEditor
          height="100%"
          language="markdown"
          theme="vs-dark"
          value={notes}
          onChange={(v) => onChangeNotes(v ?? '')}
          options={{ readOnly, minimap: { enabled: false }, fontSize: 14, wordWrap: 'on' }}
        />
      )}
    </div>
  );
}
