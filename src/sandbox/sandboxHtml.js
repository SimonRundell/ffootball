/**
 * Builds the srcdoc for the sandbox iframe. Loads local UMD builds of
 * React and ReactDOM (no CDN dependency in a classroom) plus a small
 * bootstrap script that waits for one postMessage carrying the compiled
 * code, the student's CSS, and the API base URL, then renders
 * `<DataDisplay />` into #root.
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
<script src="/sandbox/react.production.min.js"></script>
<script src="/sandbox/react-dom.production.min.js"></script>
</head>
<body>
<div id="root"></div>
<style id="student-css"></style>
<script>
(function () {
  function post(type, text) {
    parent.postMessage({ source: 'ffootball-sandbox', type, text }, '*');
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
  console.error = function () { post('error', stringifyArgs(arguments)); originalError.apply(console, arguments); };

  window.onerror = function (message, source, lineno) {
    post('error', 'Error: ' + message + ' (line ' + lineno + ')');
  };

  window.addEventListener('unhandledrejection', function (event) {
    post('error', 'Unhandled promise rejection: ' + (event.reason && event.reason.message ? event.reason.message : event.reason));
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
      post('error', 'Runtime error: ' + err.message);
    }
  });

  post('ready', 'Sandbox ready');
})();
</script>
</body>
</html>`;
}
