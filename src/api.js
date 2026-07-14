/**
 * Central axios instance for the whole app. All components call the API
 * through this module rather than importing axios directly, so the base
 * URL and credentials setting live in exactly one place.
 */
import axios from 'axios';
import appConfig from '../.config.json';

axios.defaults.withCredentials = true;

/**
 * Configured axios instance pointed at our own PHP API (never at FPL
 * directly; see api/fpl.php for the proxy).
 * @type {import('axios').AxiosInstance}
 */
export const api = axios.create({
  baseURL: appConfig.apiBaseUrl,
  withCredentials: true,
});

/**
 * The parsed contents of .config.json.
 * @type {{ apiBaseUrl: string }}
 */
export const config = appConfig;
