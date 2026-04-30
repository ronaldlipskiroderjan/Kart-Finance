import { createContext, useContext, useState, useCallback } from 'react';
import { loginUser } from '../services/api';

// ── Storage keys ──────────────────────────────────
const USER_KEY = 'kf_user';

function loadUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearUser() {
  localStorage.removeItem(USER_KEY);
}

// ── Context ───────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadUser()); // hydrate on mount

  /**
   * Calls POST /api/auth/login.
   * On success: persists user and updates state.
   * On failure: throws the error message string so the caller can display it.
   */
  const login = useCallback(async (email, password) => {
    try {
      const res = await loginUser({ email, password });
      const data = res.data;

      if (!data.success) {
        throw new Error(data.message ?? 'Email ou senha incorretos');
      }

      const userData = { 
        id: data.id,
        name: data.name, 
        email: data.email,
        pixKey: data.pixKey,
        role: data.role
      };
      saveUser(userData);
      setUser(userData);
      return userData;
    } catch (err) {
      // Axios throws on 4xx/5xx — extrai a mensagem do body JSON quando disponível
      const serverMsg = err.response?.data?.message;
      throw new Error(serverMsg ?? err.message ?? 'Email ou senha incorretos');
    }
  }, []);

  const logout = useCallback(() => {
    clearUser();
    setUser(null);
  }, []);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
