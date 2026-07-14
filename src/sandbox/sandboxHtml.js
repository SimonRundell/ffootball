/**
 * Builds the srcdoc for the sandbox iframe. Loads local UMD builds of
 * React and ReactDOM (no CDN dependency in a classroom) plus a small
 * bootstrap script that waits for one postMessage carrying the compiled
 * code, the student's CSS, and the API base URL, then renders
 * `<DataDisplay />` into #root.
 *
 * Deliberately uses the *development* React/ReactDOM builds, not
 * production: production replaces error messages with a bare numeric
 * code and a decoder-page URL (e.g. "Minified React error #31"), which
 * is meaningless to a student. The development build gives the real
 * message. friendlyMessage() below further translates the handful of
 * errors beginners hit constantly (rendering a raw object, reading a
 * property of undefined) into a plain-English hint.
 *
 * The bootstrap also wraps console.log/warn/error and window.onerror /
 * unhandledrejection so the host page's console panel can show them.
 *
 * @returns {string}
 */
export function buildSandboxHtml() {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<script src="/sandbox/react.development.js"></script>
<script src="/sandbox/react-dom.development.js"></script>
</head>
<body>
<div id="root"></div>
<style id="student-css"></style>
<script>
(function () {
  function post(type, text) {
    parent.postMessage({ source: 'ffootball-sandbox', type, text }, '*');
  }

  /**
   * Translates a handful of common beginner error messages into a
   * plain-English hint, and shortens anything absurdly long (old cached
   * production builds, or a stray minified error) so the console panel
   * stays readable. Unrecognised messages pass through unchanged.
   */
  function friendlyMessage(raw) {
    var text = String(raw);

    if (/Minified React error #31/.test(text)) {
      return 'You tried to display a whole object or array directly in your JSX, e.g. {player} instead of {player.web_name}. Pick one field to show instead.';
    }

    var devMatch = text.match(/Objects are not valid as a React child \\(found: (object with keys \\{[^}]*\\}|\\[object [^\\]]*\\])\\)/);
    if (devMatch) {
      var found = devMatch[1];
      if (found.length > 80) found = found.slice(0, 80) + '...}';
      return 'You tried to display a whole object or array directly in your JSX (found: ' + found + '). Pick one field to show instead, e.g. {player.web_name} instead of {player}.';
    }

    if (/Cannot read propert(y|ies) of (undefined|null)/.test(text)) {
      return text + ' — check the data has finished loading before you use it (e.g. return a loading message first while your state is still null).';
    }

    if (/is not a function/.test(text)) {
      return text + ' — check the spelling, and that you are calling it on the right thing.';
    }

    if (text.length > 300) {
      var cut = text.indexOf('?invariant=');
      text = cut !== -1 ? text.slice(0, cut) + ' (details omitted)' : text.slice(0, 300) + '...';
    }

    return text;
  }

  var originalLog = console.log;
  var originalWarn = console.warn;
  var originalError = console.error;

  function stringifyArgs(args) {
    return Array.prototype.map.call(args, function (a) {
      if (typeof a === 'object') {
        try { return JSON.stringify(a); } catch (e) { return String(a); }
      }
      return String(a);
    }).join(' ');
  }

  console.log = function () { post('log', stringifyArgs(arguments)); originalLog.apply(console, arguments); };
  console.warn = function () { post('warn', stringifyArgs(arguments)); originalWarn.apply(console, arguments); };
  console.error = function () {
    var text = stringifyArgs(arguments);
    // React's dev build follows a real error with its own "add an error
    // boundary" diagnostic; it's not actionable for a beginner and the
    // real error is already shown, so skip it in the student's panel
    // (it still reaches the real browser console below).
    if (!/^The above error occurred|^Consider adding an error boundary/.test(text)) {
      post('error', friendlyMessage(text));
    }
    originalError.apply(console, arguments);
  };

  window.onerror = function (message, source, lineno) {
    post('error', 'Error: ' + friendlyMessage(message) + ' (line ' + lineno + ')');
  };

  window.addEventListener('unhandledrejection', function (event) {
    var reason = event.reason && event.reason.message ? event.reason.message : event.reason;
    post('error', 'Unhandled promise rejection: ' + friendlyMessage(reason));
  });

  /**
   * Fetch-based axios-alike locked to the class API base URL. Any
   * request targeting another host is refused with a clear message.
   */
  function makeLockedAxios(apiBaseUrl) {
    function resolve(url) {
      var absolute = new URL(url, apiBaseUrl + '/');
      var base = new URL(apiBaseUrl + '/');
      if (absolute.origin !== base.origin || absolute.pathname.indexOf(base.pathname) !== 0) {
        throw new Error('This sandbox can only call the class API');
      }
      return absolute.toString();
    }

    function request(method, url, data) {
      var resolved;
      try {
        resolved = resolve(url);
      } catch (err) {
        return Promise.reject(err);
      }
      return fetch(resolved, {
        method: method,
        credentials: 'include',
        headers: data ? { 'Content-Type': 'application/json' } : undefined,
        body: data ? JSON.stringify(data) : undefined,
      }).then(function (res) {
        return res.json().then(function (body) {
          if (!res.ok) {
            var err = new Error('Request failed with status ' + res.status);
            err.response = { status: res.status, data: body };
            throw err;
          }
          return { data: body, status: res.status };
        });
      });
    }

    return {
      get: function (url) { return request('GET', url); },
      post: function (url, data) { return request('POST', url, data); },
    };
  }

  window.addEventListener('message', function (event) {
    var msg = event.data;
    if (!msg || msg.source !== 'ffootball-host') return;

    document.getElementById('student-css').textContent = msg.css || '';

    var scope = {
      React: window.React,
      useState: window.React.useState,
      useEffect: window.React.useEffect,
      axios: makeLockedAxios(msg.apiBaseUrl),
      config: { apiBaseUrl: msg.apiBaseUrl },
    };

    try {
      var factory = new Function(
        'React', 'useState', 'useEffect', 'axios', 'config',
        msg.code
      );
      var DataDisplay = factory(scope.React, scope.useState, scope.useEffect, scope.axios, scope.config);
      var root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(React.createElement(DataDisplay));
    } catch (err) {
      post('error', 'Runtime error: ' + friendlyMessage(err.message));
    }
  });

  post('ready', 'Sandbox ready');
})();
</script>
</body>
</html>`;
}
