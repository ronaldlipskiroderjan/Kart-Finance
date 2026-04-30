import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPilots, getPilotHistory } from '../services/api';
import { useAuth } from '../context/AuthContext';
import PilotCard from '../components/PilotCard';
import PilotModal from '../components/PilotModal';
import NewPilotModal from '../components/NewPilotModal';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import { Plus, Search, RefreshCw, LogOut, Flag } from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [pilots, setPilots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const [selectedPilot, setSelectedPilot] = useState(null);
  const [editingPilot, setEditingPilot] = useState(null);
  const [showNewPilot, setShowNewPilot] = useState(false);

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
            
            // Se tiver fechamento pendente/atrasado, caso contrário "EM DIA" / "PAGO"
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

  const filtered = pilots.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.category ?? '').toLowerCase().includes(search.toLowerCase())
  );

  

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
          <button onClick={handleLogout} className="text-zinc-500 hover:text-zinc-200 transition-colors" aria-label="Sair">
            <LogOut size={20} />
          </button>
        </header>

        {/* Desktop page title */}
        <div className="hidden lg:flex items-center justify-between px-8 pt-8 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-zinc-100">Dashboard</h1>
            <p className="text-sm text-zinc-500 mt-0.5">
              {pilots.length} piloto{pilots.length !== 1 ? 's' : ''} cadastrado{pilots.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowNewPilot(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={18} />
            Novo Piloto
          </button>
        </div>

        {/* Search + refresh */}
        <div className="px-4 pt-6 lg:pt-0 lg:px-8 pb-4 flex gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-9 py-2.5 text-sm"
              placeholder="Buscar piloto ou categoria…"
              aria-label="Buscar piloto"
            />
          </div>
          <button
            onClick={fetchPilots}
            className="btn-secondary px-3 py-2.5"
            aria-label="Recarregar"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 px-4 lg:px-8 pb-28 lg:pb-8">
          {error && (
            <div className="bg-red-900/30 border border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-400 mb-4">
              {error}
            </div>
          )}

          {loading && !pilots.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-card h-36 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4">
                <Flag size={28} className="text-zinc-600" />
              </div>
              <p className="text-zinc-400 font-medium mb-1">
                {search ? 'Nenhum piloto encontrado' : 'Nenhum piloto cadastrado'}
              </p>
              <p className="text-xs text-zinc-600 mb-6">
                {search ? 'Tente um termo diferente' : 'Adicione o primeiro piloto para começar'}
              </p>
              {!search && (
                <button onClick={() => setShowNewPilot(true)} className="btn-primary">
                  + Novo Piloto
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((pilot) => (
                <PilotCard key={pilot.id} pilot={pilot} onSelect={setSelectedPilot} />
              ))}
            </div>
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

      <BottomNav />
    </div>
  );
}
