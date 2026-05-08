import { createContext, useContext, useState, useCallback } from 'react';
import { loginUser, getConfig, updateConfig as apiUpdateConfig } from '../services/api';

// ── Storage keys ──────────────────────────────────
const USER_KEY = 'kf_user';
const PIX_KEY = 'kf_global_pix';

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

function loadGlobalPixKey() {
  return localStorage.getItem(PIX_KEY) || '';
}

function saveGlobalPixKey(key) {
  localStorage.setItem(PIX_KEY, key || '');
}

// ── Context ───────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadUser());
  const [globalPixKey, setGlobalPixKey] = useState(() => loadGlobalPixKey());

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
        role: data.role,
      };
      saveUser(userData);
      setUser(userData);

      // Carrega a chave PIX global do sistema
      try {
        const cfgRes = await getConfig();
        const pix = cfgRes.data?.pixKey || '';
        saveGlobalPixKey(pix);
        setGlobalPixKey(pix);
      } catch {
        // mantém o valor em cache se falhar
      }

      return userData;
    } catch (err) {
      const serverMsg = err.response?.data?.message;
      throw new Error(serverMsg ?? err.message ?? 'Email ou senha incorretos');
    }
  }, []);

  const refreshPixKey = useCallback(async () => {
    try {
      const cfgRes = await getConfig();
      const pix = cfgRes.data?.pixKey || '';
      saveGlobalPixKey(pix);
      setGlobalPixKey(pix);
      return pix;
    } catch {
      return globalPixKey;
    }
  }, [globalPixKey]);

  const savePixKey = useCallback(async (pixKey) => {
    await apiUpdateConfig({ pixKey: pixKey.trim() });
    saveGlobalPixKey(pixKey.trim());
    setGlobalPixKey(pixKey.trim());
  }, []);

  const logout = useCallback(() => {
    clearUser();
    setUser(null);
  }, []);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, globalPixKey, refreshPixKey, savePixKey }}>
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
