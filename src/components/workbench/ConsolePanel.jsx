/**
 * Renders console messages captured from the sandbox iframe, with
 * log/warn/error styling and a Clear button.
 *
 * @param {{ messages: {type: string, text: string}[], onClear: () => void }} props
 */
export default function ConsolePanel({ messages, onClear }) {
  return (
    <div className="console-panel">
      <div className="console-panel-header">
        <span>Console</span>
        <button type="button" onClick={onClear}>
          Clear
        </button>
      </div>
      <div className="console-panel-body">
        {messages.length === 0 && <p className="console-empty">No output yet. Click Run.</p>}
        {messages.map((m, i) => (
          <div key={i} className={`console-line console-${m.type}`}>
            {m.text}
          </div>
        ))}
      </div>
    </div>
  );
}
