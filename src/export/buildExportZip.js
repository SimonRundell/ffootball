import JSZip from 'jszip';
import { PREAMBLE } from '../sandbox/preamble.js';

const PROD_API_BASE_URL = 'https://football.toolsforteaching.co.uk/api';

/**
 * Builds a standalone `npm create vite@latest` style project from a
 * student's saved JSX/CSS, zipped in memory, so it can be downloaded,
 * unzipped elsewhere and run with `npm install && npm run dev`.
 *
 * The exported DataDisplay.jsx keeps the real `import`/`export` syntax
 * (the sandbox strips those for its in-memory `new Function` evaluation,
 * but a real Vite project needs them). axios is pointed at the production
 * API so the project works outside the classroom; the student's own
 * browser session cookie for football.toolsforteaching.co.uk is what
 * authorises the FPL proxy calls, per api/cors.php's credentialed CORS.
 *
 * @param {{ jsxCode: string, cssCode: string, displayName?: string }} params
 * @returns {Promise<Blob>} A zip file blob ready to save.
 */
export async function buildExportZip({ jsxCode, cssCode, displayName }) {
  const zip = new JSZip();
  const src = zip.folder('src');

  zip.file('package.json', packageJson());
  zip.file('vite.config.js', viteConfig());
  zip.file('index.html', indexHtml(displayName));
  zip.file('.gitignore', gitignore());
  zip.file('README.md', readme(displayName));

  src.file('main.jsx', mainJsx());
  src.file('App.jsx', appJsx());
  src.file('config.js', configJs());
  src.file('DataDisplay.jsx', `${PREAMBLE}${jsxCode}`);
  src.file('DataDisplay.css', cssCode);

  return zip.generateAsync({ type: 'blob' });
}

/** Triggers a browser download of the given blob under the given filename. */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function packageJson() {
  return `${JSON.stringify(
    {
      name: 'fpl-data-display',
      private: true,
      version: '0.0.0',
      type: 'module',
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
      },
      dependencies: {
        axios: '^1.18.1',
        react: '^19.2.7',
        'react-dom': '^19.2.7',
      },
      devDependencies: {
        '@vitejs/plugin-react': '^6.0.3',
        vite: '^8.1.1',
      },
    },
    null,
    2
  )}\n`;
}

function viteConfig() {
  return `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});
`;
}

function indexHtml(displayName) {
  const title = displayName ? `${displayName}'s FPL Data Display` : 'FPL Data Display';
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`;
}

function gitignore() {
  return `node_modules\ndist\n.DS_Store\n`;
}

function readme(displayName) {
  const who = displayName ? `${displayName}'s` : 'Your';
  return `# ${who} FPL Data Display

This is a standalone copy of the DataDisplay component built in the FPL
Data Lab workbench, exported as a normal Vite + React project.

## Running it

\`\`\`
npm install
npm run dev
\`\`\`

Then open the URL Vite prints (usually http://localhost:5173).

## About the data

This project fetches live Fantasy Premier League data through the FPL
Data Lab's own API proxy at ${PROD_API_BASE_URL}, exactly like it did in
the workbench. You need to be logged in to the FPL Data Lab website
(https://football.toolsforteaching.co.uk) in the same browser for the
data requests to be authorised.

## Files

- \`src/DataDisplay.jsx\` and \`src/DataDisplay.css\`: your component, exactly
  as saved in the workbench.
- \`src/App.jsx\`, \`src/main.jsx\`, \`src/config.js\`: the scaffolding that
  makes it a runnable project.
`;
}

function mainJsx() {
  return `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import config from './config.js';
import App from './App.jsx';

axios.defaults.baseURL = config.apiBaseUrl;
axios.defaults.withCredentials = true;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
`;
}

function appJsx() {
  return `import DataDisplay from './DataDisplay.jsx';
import './DataDisplay.css';

export default function App() {
  return <DataDisplay />;
}
`;
}

function configJs() {
  return `/**
 * Points axios at the FPL Data Lab's own API proxy. Never call
 * fantasy.premierleague.com directly; it sends no CORS headers.
 */
export default {
  apiBaseUrl: '${PROD_API_BASE_URL}',
};
`;
}
