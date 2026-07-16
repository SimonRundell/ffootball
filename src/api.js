/**
 * Central axios instance for the whole app. All components call the API
 * through this module rather than importing axios directly, so the base
 * URL and credentials setting live in exactly one place.
 *
 * The `apiBaseUrl` itself comes from `/.config.json`, a static file in
 * `public/` (not imported from source) so it becomes a plain file in
 * `dist/` after `npm run build`. That lets the same build be pointed at a
 * different API by editing the deployed `.config.json` in place, with no
 * rebuild required. `loadConfig()` must resolve before any API call is
 * made; `main.jsx` awaits it before rendering the app.
 */
import axios from 'axios';

axios.defaults.withCredentials = true;

/**
 * Configured axios instance pointed at our own PHP API (never at FPL
 * directly; see api/fpl.php for the proxy). Its baseURL is empty until
 * `loadConfig()` resolves.
 * @type {import('axios').AxiosInstance}
 */
export const api = axios.create({
  withCredentials: true,
});

/**
 * The parsed contents of `/.config.json`, populated by `loadConfig()`.
 * @type {{ apiBaseUrl: string }}
 */
export const config = { apiBaseUrl: '' };

/**
 * Fetches `/.config.json` and sets `config.apiBaseUrl` and the shared
 * `api` instance's baseURL from it. Must be awaited once, before the app
 * renders.
 * @returns {Promise<{ apiBaseUrl: string }>}
 */
export async function loadConfig() {
  const res = await fetch('/.config.json');
  if (!res.ok) {
    throw new Error(`Could not load /.config.json (HTTP ${res.status})`);
  }
  const data = await res.json();
  config.apiBaseUrl = data.apiBaseUrl;
  api.defaults.baseURL = data.apiBaseUrl;
  return config;
}
