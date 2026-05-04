import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPilots, getPilotHistory } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PilotCard from '../components/PilotCard';
import PilotModal from '../components/PilotModal';
import NewPilotModal from '../components/NewPilotModal';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import CommandPalette from '../components/ui/CommandPalette';
import { Plus, Search, RefreshCw, LogOut, Flag, Users, AlertCircle, DollarSign, TrendingUp, Command } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatBRL } from '../utils/formatters';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className={`glass-card px-4 py-3 flex items-center gap-3`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
        <Icon size={15} className={color.replace('bg-', 'text-').replace('/15', '-400')} />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider truncate">{label}</p>
        <p className="text-sm font-bold text-zinc-100 truncate">{value}</p>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="glass-card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-zinc-800 rounded-lg animate-pulse w-3/4" />
          <div className="h-3 bg-zinc-800 rounded-lg animate-pulse w-1/3" />
        </div>
        <div className="w-5 h-5 bg-zinc-800 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800">
        <div className="space-y-1.5">
          <div className="h-2.5 bg-zinc-800 rounded animate-pulse w-16" />
          <div className="h-4 bg-zinc-800 rounded animate-pulse w-20" />
        </div>
        <div className="space-y-1.5">
          <div className="h-2.5 bg-zinc-800 rounded animate-pulse w-20" />
          <div className="h-4 bg-zinc-800 rounded animate-pulse w-16" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [pilots, setPilots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const [selectedPilot, setSelectedPilot] = useState(null);
  const [editingPilot, setEditingPilot] = useState(null);
  const [showNewPilot, setShowNewPilot] = useState(false);
  const [showCmdPalette, setShowCmdPalette] = useState(false);

  // Ctrl+K to open command palette
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCmdPalette(prev => !prev);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const fetchPilots = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await getPilots();
      const pilotsData = res.data;

      const pilotsWithStatus = await Promise.all(
        pilotsData.map(async (p) => {
          try {
            const hRes = await getPilotHistory(p.id);
            const history = hRes.data || [];
            const hasAtrasado = history.some(h => h.status === 'ATRASADO');
            const hasPendente = history.some(h => h.status === 'PENDENTE');
            let pilotStatus = 'EM DIA';
            if (hasAtrasado) pilotStatus = 'ATRASADO';
            else if (hasPendente) pilotStatus = 'PENDENTE';
            return { ...p, status: pilotStatus };
          } catch {
            return { ...p, status: 'EM DIA' };
          }
        })
      );

      setPilots(pilotsWithStatus);
      setSelectedPilot(prev => {
        if (!prev) return prev;
        return pilotsWithStatus.find(p => p.id === prev.id) || prev;
      });
    } catch {
      setError('Não foi possível carregar os pilotos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPilots(); }, [fetchPilots]);

  const handleLogout = () => { logout(); navigate('/login'); };

  // Stats
  const totalPendente = pilots
    .flatMap(p => p.closingHistories || [])
    .filter(h => h.status === 'PENDENTE' || h.status === 'ATRASADO')
    .reduce((s, h) => s + (h.totalAmount || 0), 0);

  const overdueCount = pilots.filter(p => p.status === 'ATRASADO').length;

  const filtered = pilots.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.category ?? '').toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'ATRASADO' && p.status === 'ATRASADO') ||
      (statusFilter === 'PENDENTE' && p.status === 'PENDENTE') ||
      (statusFilter === 'EM DIA' && p.status === 'EM DIA');
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="lg:hidden sticky top-0 z-30 bg-zinc-950/90 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center justify-between">
          <span className="text-lg font-black">
            <span className="text-emerald-400">RA</span>
            <span className="text-zinc-100"> Kart Racing</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCmdPalette(true)}
              className="text-zinc-500 hover:text-zinc-200 transition-colors p-1.5"
              aria-label="Buscar"
            >
              <Search size={19} />
            </button>
            <button onClick={handleLogout} className="text-zinc-500 hover:text-zinc-200 transition-colors" aria-label="Sair">
              <LogOut size={19} />
            </button>
          </div>
        </header>

        {/* Desktop page title */}
        <div className="hidden lg:flex items-center justify-between px-8 pt-8 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {pilots.length} piloto{pilots.length !== 1 ? 's' : ''} cadastrado{pilots.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCmdPalette(true)}
              className="btn-secondary flex items-center gap-2 text-sm"
              title="Ctrl+K"
            >
              <Command size={15} />
              <span>Buscar</span>
              <kbd className="ml-1 px-1.5 py-0.5 rounded border border-zinc-700 text-[10px] text-zinc-500 font-mono">⌘K</kbd>
            </button>
            <button
              onClick={() => setShowNewPilot(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} />
              Novo Piloto
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {!loading && pilots.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="px-4 lg:px-8 pt-4 lg:pt-0 pb-3 grid grid-cols-2 lg:grid-cols-4 gap-2.5"
          >
            <StatCard icon={Users} label="Total Pilotos" value={pilots.length} color="bg-blue-500/15" />
            <StatCard icon={DollarSign} label="A Receber" value={formatBRL(totalPendente)} color="bg-amber-500/15" />
            <StatCard icon={AlertCircle} label="Em Atraso" value={overdueCount} color="bg-red-500/15" />
            <StatCard icon={TrendingUp} label="Em Dia" value={pilots.filter(p => p.status === 'EM DIA').length} color="bg-emerald-500/15" />
          </motion.div>
        )}

        {/* Search + filters + refresh */}
        <div className="px-4 pt-2 lg:pt-0 lg:px-8 pb-4 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-40">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 py-2.5 text-sm"
              placeholder="Buscar piloto ou categoria…"
              aria-label="Buscar piloto"
            />
          </div>
          {/* Status filters */}
          <div className="flex gap-1.5">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'ATRASADO', label: 'Atraso' },
              { id: 'PENDENTE', label: 'Pendente' },
              { id: 'EM DIA', label: 'Em Dia' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-2.5 rounded-xl text-xs font-semibold border transition-all duration-200
                  ${statusFilter === f.id
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                    : 'bg-zinc-800/60 text-zinc-500 border-zinc-700 hover:text-zinc-300'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={fetchPilots}
            className="btn-secondary px-3 py-2.5"
            aria-label="Recarregar"
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 lg:px-8 pb-28 lg:pb-8">
          {error && (
            <div className="bg-red-900/30 border border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-400 mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4">
                <Flag size={28} className="text-zinc-600" />
              </div>
              <p className="text-zinc-400 font-medium mb-1">
                {search || statusFilter !== 'all' ? 'Nenhum piloto encontrado' : 'Nenhum piloto cadastrado'}
              </p>
              <p className="text-xs text-zinc-600 mb-6">
                {search || statusFilter !== 'all' ? 'Tente outros filtros' : 'Adicione o primeiro piloto para começar'}
              </p>
              {!search && statusFilter === 'all' && (
                <button onClick={() => setShowNewPilot(true)} className="btn-primary">
                  + Novo Piloto
                </button>
              )}
            </div>
          ) : (
            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
            >
              {filtered.map((pilot) => (
                <PilotCard key={pilot.id} pilot={pilot} onSelect={setSelectedPilot} />
              ))}
            </motion.div>
          )}
        </div>
      </main>

      {/* Mobile FAB */}
      <button
        onClick={() => setShowNewPilot(true)}
        className="lg:hidden fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-emerald-500
                   hover:bg-emerald-400 text-white shadow-xl shadow-emerald-500/30 flex items-center
                   justify-center transition-all duration-200 active:scale-90"
        aria-label="Novo Piloto"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      {/* Modals */}
      <PilotModal
        pilot={selectedPilot}
        isOpen={!!selectedPilot}
        onClose={() => setSelectedPilot(null)}
        onRefresh={fetchPilots}
        onEdit={(p) => { setEditingPilot(p); }}
      />
      <NewPilotModal
        isOpen={showNewPilot || !!editingPilot}
        pilot={editingPilot}
        onClose={() => { setShowNewPilot(false); setEditingPilot(null); }}
        onSuccess={fetchPilots}
      />

      <CommandPalette
        pilots={pilots}
        isOpen={showCmdPalette}
        onClose={() => setShowCmdPalette(false)}
        onSelectPilot={(pilot) => { setSelectedPilot(pilot); }}
      />

      <BottomNav />
    </div>
  );
}
