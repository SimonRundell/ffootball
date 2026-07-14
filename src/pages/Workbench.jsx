import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import Editor from '../components/workbench/Editor.jsx';
import OutputFrame from '../components/workbench/OutputFrame.jsx';
import ConsolePanel from '../components/workbench/ConsolePanel.jsx';
import ApiExplorer from '../components/workbench/ApiExplorer.jsx';
import BackupDrawer from '../components/workbench/BackupDrawer.jsx';
import { compileStudentCode } from '../sandbox/compile.js';
import { STARTER_JSX, STARTER_CSS } from '../sandbox/starterTemplates.js';
import { api } from '../api.js';

const AUTOSAVE_DELAY_MS = 30000;

/**
 * The editor + output + console + API explorer workbench. Loads the
 * caller's own workspace by default, or a student's workspace read-only
 * when mounted at a route with a :userId param (teacher/admin viewing).
 */
export default function Workbench() {
  const { userId } = useParams();
  const viewingOtherUser = Boolean(userId);
  const readOnly = viewingOtherUser;

  const [jsxCode, setJsxCode] = useState(STARTER_JSX);
  const [cssCode, setCssCode] = useState(STARTER_CSS);
  const [notes, setNotes] = useState('');
  const [messages, setMessages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | unsaved | error
  const [savedAt, setSavedAt] = useState(null);
  const [showBackups, setShowBackups] = useState(false);
  const [showExplorer, setShowExplorer] = useState(false);
  const [viewedDisplayName, setViewedDisplayName] = useState('');

  const outputRef = useRef(null);
  const autosaveTimer = useRef(null);
  const dirtyRef = useRef(false);

  const loadWorkspace = useCallback(() => {
    const query = viewingOtherUser ? `?user_id=${userId}` : '';
    api
      .get(`workspace.php${query}`)
      .then((res) => {
        setJsxCode(res.data.jsx_code ?? STARTER_JSX);
        setCssCode(res.data.css_code ?? STARTER_CSS);
        setNotes(res.data.notes ?? '');
        setLoaded(true);
        dirtyRef.current = false;
      })
      .catch(() => setLoaded(true));
  }, [userId, viewingOtherUser]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (viewingOtherUser) {
      api.get(`users.php?id=${userId}`).then((res) => setViewedDisplayName(res.data.display_name));
    }
  }, [userId, viewingOtherUser]);

  const handleSandboxMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  const handleSave = useCallback(async () => {
    if (readOnly) return;
    setSaveState('saving');
    try {
      await api.put('workspace.php', { jsx_code: jsxCode, css_code: cssCode, notes });
      setSaveState('saved');
      setSavedAt(new Date());
      dirtyRef.current = false;
    } catch {
      setSaveState('error');
    }
  }, [jsxCode, cssCode, notes, readOnly]);

  /** Marks the workspace dirty and (re)schedules the 30s autosave. */
  function markDirty() {
    if (readOnly) return;
    dirtyRef.current = true;
    setSaveState('unsaved');
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(handleSave, AUTOSAVE_DELAY_MS);
  }

  useEffect(() => {
    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, []);

  useEffect(() => {
    function handleBeforeUnload(e) {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  function handleRun() {
    const result = compileStudentCode(jsxCode);

    if (result.error) {
      setMessages((prev) => [...prev, { type: 'error', text: `Syntax error: ${result.error}` }]);
      return;
    }

    setMessages([]);
    outputRef.current?.runCode(result.code, cssCode);
  }

  /** @param {import('react').KeyboardEvent} e */
  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleRun();
    }
  }

  function saveIndicatorText() {
    if (readOnly) return null;
    if (saveState === 'saving') return 'Saving...';
    if (saveState === 'error') return 'Could not save';
    if (saveState === 'unsaved') return 'Unsaved changes';
    if (saveState === 'saved' && savedAt) {
      return `Saved ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return '';
  }

  if (!loaded) {
    return <p className="loading-notice">Loading workspace...</p>;
  }

  return (
    <div className="workbench" onKeyDown={handleKeyDown}>
      {viewingOtherUser && (
        <div className="viewing-banner">
          Viewing {viewedDisplayName || 'this student'}&apos;s work (read-only)
        </div>
      )}
      <div className="workbench-toolbar">
        <button type="button" className="run-button" onClick={handleRun}>
          Run
        </button>
        {!readOnly && (
          <>
            <button type="button" onClick={handleSave}>
              Save
            </button>
            <span className="workbench-save-indicator">{saveIndicatorText()}</span>
          </>
        )}
        <span className="workbench-hint">Ctrl+Enter also runs your code</span>
        <div className="workbench-toolbar-right">
          <button type="button" onClick={() => setShowExplorer((v) => !v)}>
            {showExplorer ? 'Hide API explorer' : 'API explorer'}
          </button>
          <button type="button" onClick={() => setShowBackups(true)}>
            Backups
          </button>
        </div>
      </div>
      <div className="workbench-panes">
        <Editor
          jsxCode={jsxCode}
          cssCode={cssCode}
          notes={notes}
          readOnly={readOnly}
          onChangeJsx={(v) => {
            setJsxCode(v);
            markDirty();
          }}
          onChangeCss={(v) => {
            setCssCode(v);
            markDirty();
          }}
          onChangeNotes={(v) => {
            setNotes(v);
            markDirty();
          }}
        />
        <div className="workbench-right">
          <OutputFrame ref={outputRef} onMessage={handleSandboxMessage} />
          <ConsolePanel messages={messages} onClear={() => setMessages([])} />
          {showExplorer && (
            <ApiExplorer
              onCopySnippet={() =>
                setMessages((prev) => [...prev, { type: 'log', text: 'Axios snippet copied to clipboard' }])
              }
            />
          )}
        </div>
      </div>
      <BackupDrawer
        open={showBackups}
        onClose={() => setShowBackups(false)}
        onRestored={loadWorkspace}
        userId={viewingOtherUser ? userId : null}
      />
    </div>
  );
}
