import { useCallback, useRef, useState } from 'react';
import Editor from '../components/workbench/Editor.jsx';
import OutputFrame from '../components/workbench/OutputFrame.jsx';
import ConsolePanel from '../components/workbench/ConsolePanel.jsx';
import { compileStudentCode } from '../sandbox/compile.js';
import { STARTER_JSX, STARTER_CSS } from '../sandbox/starterTemplates.js';

/**
 * The editor + output + console workbench. Workspace persistence
 * (load/save/autosave/backups) and the API explorer panel are added in
 * Phase 5; for now the workspace starts from the starter templates.
 */
export default function Workbench() {
  const [jsxCode, setJsxCode] = useState(STARTER_JSX);
  const [cssCode, setCssCode] = useState(STARTER_CSS);
  const [notes, setNotes] = useState('');
  const [messages, setMessages] = useState([]);
  const outputRef = useRef(null);

  const handleSandboxMessage = useCallback((msg) => {
    setMessages((prev) => [...prev, msg]);
  }, []);

  /** Compiles the current JSX and, on success, runs it in the sandbox. */
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

  return (
    <div className="workbench" onKeyDown={handleKeyDown}>
      <div className="workbench-toolbar">
        <button type="button" className="run-button" onClick={handleRun}>
          Run
        </button>
        <span className="workbench-hint">Ctrl+Enter also runs your code</span>
      </div>
      <div className="workbench-panes">
        <Editor
          jsxCode={jsxCode}
          cssCode={cssCode}
          notes={notes}
          onChangeJsx={setJsxCode}
          onChangeCss={setCssCode}
          onChangeNotes={setNotes}
        />
        <div className="workbench-right">
          <OutputFrame ref={outputRef} onMessage={handleSandboxMessage} />
          <ConsolePanel messages={messages} onClear={() => setMessages([])} />
        </div>
      </div>
    </div>
  );
}
