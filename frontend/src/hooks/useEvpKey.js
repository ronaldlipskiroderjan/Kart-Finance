import { useState, useCallback } from 'react';

const STORAGE_KEY = 'kf_pix_evp';

export function getEvpKey() {
  return localStorage.getItem(STORAGE_KEY) || '';
}

export function useEvpKey() {
  const [evpKey, setEvpKeyState] = useState(() => getEvpKey());

  const setEvpKey = useCallback((value) => {
    const trimmed = value.trim();
    setEvpKeyState(trimmed);
    if (trimmed) localStorage.setItem(STORAGE_KEY, trimmed);
    else localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { evpKey, setEvpKey };
}
