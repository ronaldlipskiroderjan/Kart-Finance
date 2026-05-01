import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, Flag, BarChart2, CalendarDays, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Badge from './Badge';

const NAV_ACTIONS = [
  { label: 'Dashboard', icon: Flag, path: '/' },
  { label: 'Analytics', icon: BarChart2, path: '/analytics' },
  { label: 'Calendário', icon: CalendarDays, path: '/calendar' },
  { label: 'Configurações', icon: Settings, path: '/settings' },
];

export default function CommandPalette({ pilots = [], isOpen, onClose, onSelectPilot }) {
  const [query, setQuery] = useState('');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  const filteredPilots = pilots
    .filter(p =>
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      (p.category || '').toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 5);

  const filteredActions = NAV_ACTIONS.filter(a =>
    !query || a.label.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelectPilot = (pilot) => {
    onSelectPilot(pilot);
    onClose();
  };

  const handleNavAction = (path) => {
    navigate(path);
    onClose();
  };

  const isEmpty = filteredPilots.length === 0 && filteredActions.length === 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -16 }}
            transition={{ type: 'spring', stiffness: 500, damping: 35 }}
            className="fixed top-[12%] left-1/2 -translate-x-1/2 w-full max-w-lg z-[201] px-4"
          >
            <div className="bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl shadow-black/70 overflow-hidden">
              {/* Input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-zinc-800">
                <Search size={17} className="text-zinc-400 shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar piloto ou navegar…"
                  className="flex-1 bg-transparent text-zinc-100 text-[15px] placeholder-zinc-500 outline-none"
                />
                <div className="flex items-center gap-2">
                  <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-500 font-mono">ESC</kbd>
                  <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                    <X size={17} />
                  </button>
                </div>
              </div>

              {/* Results */}
              <div className="max-h-[360px] overflow-y-auto py-2">
                {filteredPilots.length > 0 && (
                  <div className="px-2 mb-1">
                    <p className="text-[10px] text-zinc-600 uppercase font-semibold tracking-wider px-2 py-1.5">Pilotos</p>
                    {filteredPilots.map(p => (
                      <button
                        key={p.id}
                        onClick={() => handleSelectPilot(p)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors text-left"
                      >
                        <div className="w-8 h-8 bg-emerald-500/15 rounded-lg flex items-center justify-center shrink-0">
                          <Flag size={14} className="text-emerald-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-zinc-200 truncate">{p.name}</p>
                          {p.category && <p className="text-xs text-zinc-500">{p.category}</p>}
                        </div>
                        {p.status && (
                          <Badge
                            label={p.status === 'ATRASADO' ? 'Atraso' : p.status === 'PENDENTE' ? 'Pendente' : 'Em Dia'}
                            color={p.status === 'ATRASADO' ? 'red' : p.status === 'PENDENTE' ? 'amber' : 'green'}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {filteredActions.length > 0 && (
                  <div className="px-2">
                    <p className="text-[10px] text-zinc-600 uppercase font-semibold tracking-wider px-2 py-1.5">Navegar</p>
                    {filteredActions.map(a => {
                      const Icon = a.icon;
                      return (
                        <button
                          key={a.path}
                          onClick={() => handleNavAction(a.path)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors text-left"
                        >
                          <div className="w-8 h-8 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0">
                            <Icon size={14} className="text-zinc-400" />
                          </div>
                          <p className="text-sm font-medium text-zinc-200">{a.label}</p>
                        </button>
                      );
                    })}
                  </div>
                )}

                {isEmpty && (
                  <div className="py-10 text-center">
                    <p className="text-sm text-zinc-500">Nenhum resultado para "{query}"</p>
                  </div>
                )}
              </div>

              <div className="px-4 py-2 border-t border-zinc-800 flex items-center gap-4">
                <span className="text-[10px] text-zinc-600">↑↓ navegar</span>
                <span className="text-[10px] text-zinc-600">↵ selecionar</span>
                <span className="text-[10px] text-zinc-600">esc fechar</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
