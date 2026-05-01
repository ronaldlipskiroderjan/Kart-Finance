import { createContext, useContext, useState, useCallback } from 'react';

const STORAGE_KEY = 'kf_comm_history';

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

const CommHistoryContext = createContext(null);

export function CommHistoryProvider({ children }) {
  const [history, setHistory] = useState(load);

  const addEntry = useCallback((entry) => {
    const newEntry = { id: Date.now(), sentAt: new Date().toISOString(), ...entry };
    setHistory(prev => {
      const updated = [newEntry, ...prev].slice(0, 300);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    return newEntry;
  }, []);

  const getForPilot = useCallback((pilotId) => {
    return history.filter(e => e.pilotId === pilotId);
  }, [history]);

  const clearForPilot = useCallback((pilotId) => {
    setHistory(prev => {
      const updated = prev.filter(e => e.pilotId !== pilotId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <CommHistoryContext.Provider value={{ history, addEntry, getForPilot, clearForPilot }}>
      {children}
    </CommHistoryContext.Provider>
  );
}

export function useCommHistory() {
  const ctx = useContext(CommHistoryContext);
  if (!ctx) throw new Error('useCommHistory must be inside CommHistoryProvider');
  return ctx;
}
