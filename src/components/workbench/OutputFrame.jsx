import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { buildSandboxHtml } from '../../sandbox/sandboxHtml.js';
import { config } from '../../api.js';

const SANDBOX_HTML = buildSandboxHtml();

/**
 * Hosts the sandboxed output iframe. The iframe is torn down and
 * recreated on every run (`runCode`), so a student's infinite loop
 * cannot take down the editor or lose unsaved work. Forwards a
 * `runCode(compiledJs, css)` method to the parent via ref.
 *
 * @param {{ onMessage: (msg: { type: string, text: string }) => void }} props
 */
const OutputFrame = forwardRef(function OutputFrame({ onMessage }, ref) {
  const containerRef = useRef(null);
  const iframeRef = useRef(null);
  const pendingRunRef = useRef(null);
  const [frameKey, setFrameKey] = useState(0);

  useImperativeHandle(ref, () => ({
    runCode(code, css) {
      pendingRunRef.current = { code, css, apiBaseUrl: config.apiBaseUrl };
      setFrameKey((k) => k + 1);
    },
  }));

  useEffect(() => {
    function handleMessage(event) {
      const msg = event.data;
      if (!msg || msg.source !== 'ffootball-sandbox') return;

      if (msg.type === 'ready' && pendingRunRef.current) {
        iframeRef.current?.contentWindow?.postMessage(
          { source: 'ffootball-host', ...pendingRunRef.current },
          '*'
        );
        pendingRunRef.current = null;
        return;
      }

      onMessage({ type: msg.type, text: msg.text });
    }

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onMessage]);

  return (
    <div className="output-frame-container" ref={containerRef}>
      {/* allow-same-origin is required so the sandbox shares the session
          cookie for API calls; this is accepted here because the code
          running inside is our own students' on a closed college system
          (see PLAN.md section 7 for the full rationale). */}
      <iframe
        key={frameKey}
        ref={iframeRef}
        title="Sandbox output"
        className="output-frame"
        sandbox="allow-scripts allow-same-origin"
        srcDoc={SANDBOX_HTML}
      />
    </div>
  );
});

export default OutputFrame;
