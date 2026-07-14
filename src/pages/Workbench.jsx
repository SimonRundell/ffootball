import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import OutputFrame from '../components/workbench/OutputFrame.jsx';
import ConsolePanel from '../components/workbench/ConsolePanel.jsx';
import ApiExplorer from '../components/workbench/ApiExplorer.jsx';
import BackupDrawer from '../components/workbench/BackupDrawer.jsx';
import DataReferenceDrawer from '../components/workbench/DataReferenceDrawer.jsx';
import LearnDrawer from '../components/workbench/LearnDrawer.jsx';
import { compileStudentCode } from '../sandbox/compile.js';
import { STARTER_JSX, STARTER_CSS } from '../sandbox/starterTemplates.js';
import { api } from '../api.js';

const AUTOSAVE_DELAY_MS = 30000;

// Monaco ships a lot of code; load it only once the workbench actually
// mounts rather than on every route (e.g. the login screen).
const Editor = lazy(() => import('../components/workbench/Editor.jsx'));

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
  const [showExplorer, setShowExplorer] = useState(false);
  const [viewedDisplayName, setViewedDisplayName] = useState('');
  const [showDataReference, setShowDataReference] = useState(false);
  // Backups and the "how to write a query" guide both live on the right
  // edge, so at most one is open at a time: null | 'backups' | 'learn'.
  const [rightDrawer, setRightDrawer] = useState(null);

  const outputRef = useRef(null);
  const autosaveTimer = useRef(null);
  const dirtyRef = useRef(false);
  const nextMessageId = useRef(0);

  /** Wraps a console/sandbox message with a stable id for list keys. */
  function withId(msg) {
    nextMessageId.current += 1;
    return { ...msg, id: nextMessageId.current };
  }

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
    setMessages((prev) => {
      // React's dev build often logs the same error two or three times,
      // sometimes with a different line number depending on which
      // handler caught it; collapsing an immediate repeat keeps the
      // panel readable for students.
      const normalize = (text) => text.replace(/\s*\(line \d+\)$/, '');
      const last = prev[prev.length - 1];
      if (last && last.type === msg.type && normalize(last.text) === normalize(msg.text)) {
        return prev;
      }
      return [...prev, withId(msg)];
    });
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
      setMessages((prev) => [...prev, withId({ type: 'error', text: `Syntax error: ${result.error}` })]);
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
          <button type="button" onClick={() => setShowDataReference((v) => !v)}>
            {showDataReference ? 'Hide data reference' : 'Data reference'}
          </button>
          <button type="button" onClick={() => setRightDrawer((v) => (v === 'learn' ? null : 'learn'))}>
            How to write a query
          </button>
          <button type="button" onClick={() => setShowExplorer((v) => !v)}>
            {showExplorer ? 'Hide API explorer' : 'API explorer'}
          </button>
          <button type="button" onClick={() => setRightDrawer('backups')}>
            Backups
          </button>
        </div>
      </div>
      <div className="workbench-panes">
        <Suspense fallback={<p className="loading-notice">Loading editor...</p>}>
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
        </Suspense>
        <div className="workbench-right">
          <OutputFrame ref={outputRef} onMessage={handleSandboxMessage} />
          <ConsolePanel messages={messages} onClear={() => setMessages([])} />
          {showExplorer && (
            <ApiExplorer
              onCopySnippet={() =>
                setMessages((prev) => [...prev, withId({ type: 'log', text: 'Axios snippet copied to clipboard' })])
              }
            />
          )}
        </div>
        <DataReferenceDrawer open={showDataReference} onClose={() => setShowDataReference(false)} />
        <BackupDrawer
          open={rightDrawer === 'backups'}
          onClose={() => setRightDrawer(null)}
          onRestored={loadWorkspace}
          userId={viewingOtherUser ? userId : null}
        />
        <LearnDrawer
          open={rightDrawer === 'learn'}
          onClose={() => setRightDrawer(null)}
          onCopy={(text) => setMessages((prev) => [...prev, withId({ type: 'log', text })])}
        />
      </div>
    </div>
  );
}
