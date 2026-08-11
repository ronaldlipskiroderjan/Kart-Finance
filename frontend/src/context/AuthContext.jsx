import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { createSession as loginUser, getCurrentUser, deleteCurrentSession } from '../services/authApi';
import { getConfig, updateConfig as apiUpdateConfig } from '../services/settingsApi';

// PIX is a non-sensitive UI cache; authentication is held only by the server cookie.
const PIX_KEY = 'kf_global_pix';

function loadGlobalPixKey() {
  return localStorage.getItem(PIX_KEY) || '';
}

function saveGlobalPixKey(key) {
  localStorage.setItem(PIX_KEY, key || '');
}

// ── Context ───────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [globalPixKey, setGlobalPixKey] = useState(() => loadGlobalPixKey());


  useEffect(() => {
    let active = true;
    getCurrentUser()
      .then(({ data }) => {
        if (active) setUser({ id: data.id, name: data.name, email: data.email, role: data.role });
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => { if (active) setAuthLoading(false); });
    return () => { active = false; };
  }, []);
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
      throw new Error(serverMsg ?? err.message ?? 'Email ou senha incorretos', { cause: err });
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

  const logout = useCallback(async () => {
    try {
      await deleteCurrentSession();
    } finally {
      setUser(null);
    }
  }, []);

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, authLoading, login, logout, globalPixKey, refreshPixKey, savePixKey }}>
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
