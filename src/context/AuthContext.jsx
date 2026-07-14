import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../api.js';

const AuthContext = createContext(null);

/**
 * Provides the logged-in user (or null) to the app, loading it from
 * me.php on mount so a page refresh keeps the session. Exposes login,
 * logout and refresh helpers.
 *
 * @param {{ children: import('react').ReactNode }} props
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.get('me.php');
      setUser(res.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /**
   * Logs in with a username and password. Throws on failure so the
   * caller can show the server's error message.
   * @param {string} username
   * @param {string} password
   */
  async function login(username, password) {
    const res = await api.post('login.php', { username, password });
    setUser(res.data);
  }

  /** Logs out and clears the current user. */
  async function logout() {
    await api.post('logout.php');
    setUser(null);
  }

  const value = { user, loading, login, logout, refresh };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Reads the current auth context.
 * @returns {{ user: object|null, loading: boolean, login: Function, logout: Function, refresh: Function }}
 */
export function useAuth() {
  return useContext(AuthContext);
}
