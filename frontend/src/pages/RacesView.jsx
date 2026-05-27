import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Flag, Plus, Trash2, X, Pencil, MessageCircle, CheckCircle2,
  ChevronDown, ChevronUp, ChevronRight, Calendar, Users, AlertTriangle, Receipt,
  Search, DollarSign, TrendingUp, TrendingDown, Wallet, MoreVertical,
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import PageHeader from '../components/layout/PageHeader';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import CustomSelect from '../components/ui/CustomSelect';
import {
  getRaceWeekends, createRaceWeekend, updateRaceWeekend, deleteRaceWeekend,
  addRaceEntry, updateRaceEntry, removeRaceEntry, payRaceEntry, getPilots,
  addRaceEntryExpense, deleteRaceEntryExpense,
  addRaceEntryReimbursement, deleteRaceEntryReimbursement,
  getRaceAgenda, setRaceAgendaSaldo, addRaceAgendaExpense, deleteRaceAgendaExpense,
  getGuestPilots,
} from '../services/api';
import { formatBRL, formatDate } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { useCommHistory } from '../context/CommHistoryContext';

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDateBR(isoDate) {
  if (!isoDate) return '–';
  const d = new Date(isoDate);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' });
}

function entryTotal(entry) {
  const extras = (entry.extras ?? []).reduce((s, x) => s + (x.amount ?? 0), 0);
  const reimbs = (entry.reimbursements ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
  return (entry.amount ?? 0) + extras - reimbs;
}

function StatusBadge({ status }) {
  const map = {
    PAGO:     { cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30', label: 'Pago' },
    PENDENTE: { cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',       label: 'Pendente' },
    ATRASADO: { cls: 'bg-red-500/15 text-red-400 border border-red-500/30',             label: 'Atrasado' },
  };
  const { cls, label } = map[status] ?? map.PENDENTE;
  return <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

function Toast({ message, type = 'success', onDismiss }) {
  useEffect(() => { const t = setTimeout(onDismiss, 3500); return () => clearTimeout(t); }, [onDismiss]);
  const isError = type === 'error';
  return (
    <div className={`fixed bottom-24 lg:bottom-8 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-2
                     text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl whitespace-nowrap
                     ${isError ? 'bg-red-600 shadow-red-900/40' : 'bg-emerald-600 shadow-emerald-900/40'}`}>
      {isError ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
      {message}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100 transition-opacity"><X size={14} /></button>
    </div>
  );
}

// ─── WeekendFormModal ──────────────────────────────────────────────────────────

function WeekendFormModal({ isOpen, onClose, onSave, initial }) {
  const [form, setForm] = useState({ Name: '', Date: '', Description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setForm(initial
      ? { Name: initial.name, Date: initial.date?.slice(0, 10) ?? '', Description: initial.description ?? '' }
      : { Name: '', Date: '', Description: '' });
    setError('');
  }, [isOpen, initial]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.Name.trim() || !form.Date) { setError('Nome e data são obrigatórios.'); return; }
    setLoading(true); setError('');
    try {
      initial ? await updateRaceWeekend(initial.id, form) : await createRaceWeekend(form);
      onSave(); onClose();
    } catch { setError('Erro ao salvar. Tente novamente.'); }
    finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Editar Fim de Semana' : 'Novo Fim de Semana'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Nome do Evento</label>
          <input className="input-field" placeholder="Ex: Etapa 3 – RA Kart Racing" value={form.Name}
            onChange={e => setForm(p => ({ ...p, Name: e.target.value }))} required />
        </div>
        <div>
          <label className="label">Data</label>
          <input type="date" className="input-field" value={form.Date}
            onChange={e => setForm(p => ({ ...p, Date: e.target.value }))} required />
        </div>
        <div>
          <label className="label">Descrição (opcional)</label>
          <textarea className="input-field resize-none" rows={2} placeholder="Detalhes adicionais…"
            value={form.Description} onChange={e => setForm(p => ({ ...p, Description: e.target.value }))} />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={loading}>
            {loading ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── AddPilotModal ─────────────────────────────────────────────────────────────

function AddPilotModal({ isOpen, onClose, onSave, raceId, existingPilotIds }) {
  const [mode, setMode]                   = useState('mensal'); // 'mensal' | 'convidado'
  const [pilots, setPilots]               = useState([]);
  const [guestPilots, setGuestPilots]     = useState([]);
  const [pilotId, setPilotId]             = useState('');
  const [guestName, setGuestName]         = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [amount, setAmount]               = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setMode('mensal'); setPilotId(''); setGuestName(''); setAmount(''); setError(''); setShowSuggestions(false);
    getPilots().then(r => setPilots(r.data || [])).catch(() => {});
    getGuestPilots().then(r => setGuestPilots(r.data || [])).catch(() => {});
  }, [isOpen]);

  const filteredGuests = guestPilots.filter(g =>
    !guestName.trim() || g.name.toLowerCase().includes(guestName.toLowerCase().trim())
  );

  const available = pilots.filter(p => !existingPilotIds.includes(p.id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount) { setError('Informe o valor.'); return; }

    if (mode === 'mensal') {
      if (!pilotId) { setError('Selecione um piloto.'); return; }
    } else {
      if (!guestName.trim()) { setError('Informe o nome do piloto convidado.'); return; }
    }

    setLoading(true); setError('');
    try {
      const payload = mode === 'mensal'
        ? { PilotID: Number(pilotId), Amount: parseFloat(amount) }
        : { GuestPilotName: guestName.trim(), Amount: parseFloat(amount) };
      await addRaceEntry(raceId, payload);
      onSave(); onClose();
    } catch (err) { setError(err.response?.data?.error ?? 'Erro ao adicionar piloto.'); }
    finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adicionar Piloto à Corrida" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Toggle Mensal / Convidado */}
        <div className="flex rounded-xl overflow-hidden border border-zinc-700/60 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('mensal'); setError(''); }}
            className={`flex-1 py-2 transition-colors ${mode === 'mensal'
              ? 'bg-emerald-600/25 text-emerald-400'
              : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => { setMode('convidado'); setError(''); }}
            className={`flex-1 py-2 transition-colors border-l border-zinc-700/60 ${mode === 'convidado'
              ? 'bg-violet-600/25 text-violet-400'
              : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Convidado
          </button>
        </div>

        {mode === 'mensal' ? (
          <div>
            <label className="label">Piloto</label>
            <CustomSelect
              value={pilotId}
              onChange={setPilotId}
              options={available.map(p => ({ value: p.id, label: p.name }))}
              placeholder="Selecione…"
              disabled={available.length === 0}
            />
            {available.length === 0 && (
              <p className="text-xs text-zinc-500 mt-1">Todos os pilotos mensais já foram adicionados.</p>
            )}
          </div>
        ) : (
          <div>
            <label className="label">Nome do Piloto Convidado</label>
            <div className="relative">
              <input
                className="input-field"
                placeholder="Digite o nome ou selecione um salvo…"
                value={guestName}
                onChange={e => { setGuestName(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                autoComplete="off"
              />
              {showSuggestions && filteredGuests.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl">
                  <div className="max-h-44 overflow-y-auto">
                    {filteredGuests.map(g => (
                      <button
                        key={g.id}
                        type="button"
                        onMouseDown={() => { setGuestName(g.name); setShowSuggestions(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700/70 transition-colors"
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {guestPilots.length > 0 && !showSuggestions && (
              <p className="text-[10px] text-zinc-600 mt-1">
                {guestPilots.length} nome{guestPilots.length !== 1 ? 's' : ''} salvo{guestPilots.length !== 1 ? 's' : ''} — clique no campo para ver.
              </p>
            )}
          </div>
        )}

        <div>
          <label className="label">Valor Individual (R$)</label>
          <input type="number" step="0.01" min="0.01" className="input-field" placeholder="Ex: 250.00"
            value={amount} onChange={e => setAmount(e.target.value)} required />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            disabled={loading || (mode === 'mensal' && available.length === 0)}
          >
            {loading ? 'Adicionando…' : 'Adicionar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── EditEntryModal ────────────────────────────────────────────────────────────

function EditEntryModal({ isOpen, onClose, onSave, entry }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && entry) { setAmount(String(entry.amount)); setError(''); }
  }, [isOpen, entry]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount) { setError('Informe o valor.'); return; }
    setLoading(true); setError('');
    try { await updateRaceEntry(entry.id, { Amount: parseFloat(amount) }); onSave(); onClose(); }
    catch { setError('Erro ao atualizar valor.'); }
    finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Editar Valor Base — ${entry?.pilot?.name ?? entry?.guestPilot?.name ?? ''}`} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Novo Valor Base (R$)</label>
          <input type="number" step="0.01" min="0.01" className="input-field"
            value={amount} onChange={e => setAmount(e.target.value)} required />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={loading}>
            {loading ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── RaceAgendaModal ──────────────────────────────────────────────────────────

function RaceAgendaModal({ isOpen, onClose, race }) {
  const [agenda, setAgenda]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [saldoInput, setSaldoInput] = useState('');
  const [savingSaldo, setSavingSaldo] = useState(false);

  const [expDesc, setExpDesc]     = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [addingExp, setAddingExp] = useState(false);
  const [toast, setToast]         = useState(null);
  const showToast = (message, type = 'success') => setToast({ message, type });

  // Carrega agenda ao abrir
  const fetchAgenda = useCallback(async () => {
    if (!race) return;
    setLoading(true);
    try {
      const res = await getRaceAgenda(race.id);
      setAgenda(res.data);
      setSaldoInput(res.data.saldo > 0 ? String(res.data.saldo) : '');
    } catch { setAgenda(null); }
    finally { setLoading(false); }
  }, [race]);

  useEffect(() => {
    if (isOpen) { fetchAgenda(); setExpDesc(''); setExpAmount(''); }
  }, [isOpen, fetchAgenda]);

  const handleSaveSaldo = async () => {
    const val = parseFloat(saldoInput);
    if (isNaN(val) || val < 0) return;
    setSavingSaldo(true);
    try {
      const res = await setRaceAgendaSaldo(race.id, { Saldo: val });
      setAgenda(res.data);
      showToast('Saldo salvo com sucesso!');
    } catch { showToast('Erro ao salvar saldo.', 'error'); }
    finally { setSavingSaldo(false); }
  };

  const handleAddExpense = async () => {
    if (!expDesc.trim() || !expAmount) return;
    setAddingExp(true);
    try {
      const res = await addRaceAgendaExpense(race.id, {
        Description: expDesc.trim(),
        Amount: parseFloat(expAmount),
      });
      setAgenda(res.data);
      setExpDesc(''); setExpAmount('');
      showToast('Gasto adicionado.');
    } catch (err) {
      showToast('Erro: ' + (err.response?.data?.error ?? err.message), 'error');
    } finally { setAddingExp(false); }
  };

  const handleDeleteExpense = async (expenseId) => {
    try {
      await deleteRaceAgendaExpense(expenseId);
      await fetchAgenda();
    } catch { showToast('Erro ao remover gasto.', 'error'); }
  };

  const saldo       = agenda?.saldo ?? 0;
  const expenses    = agenda?.expenses ?? [];
  const totalGastos = expenses.reduce((s, e) => s + e.amount, 0);
  const restante    = saldo - totalGastos;

  return (
    <>
    {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    <Modal isOpen={isOpen} onClose={onClose} title={`Viagem — ${race?.name ?? ''}`} size="md">
      {loading ? (
        <div className="py-10 flex justify-center">
          <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">

          {/* ── Resumo de saldo ── */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-800/60 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-zinc-500 mb-0.5">Saldo</p>
              <p className="text-xs font-bold text-blue-400">{formatBRL(saldo)}</p>
            </div>
            <div className="bg-zinc-800/60 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-zinc-500 mb-0.5">Gastos</p>
              <p className="text-xs font-bold text-red-400">{formatBRL(totalGastos)}</p>
            </div>
            <div className={`rounded-xl p-2.5 text-center ${restante >= 0 ? 'bg-emerald-900/30' : 'bg-red-900/30'}`}>
              <p className="text-[10px] text-zinc-500 mb-0.5">Restante</p>
              <p className={`text-xs font-bold ${restante >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatBRL(restante)}
              </p>
            </div>
          </div>

          {/* ── Definir saldo ── */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Saldo disponível (R$)
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-field flex-1 text-sm"
                placeholder="Ex: 500,00"
                value={saldoInput}
                onChange={e => setSaldoInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSaveSaldo()}
              />
              <Button
                variant="primary"
                className="px-4 text-xs whitespace-nowrap"
                onClick={handleSaveSaldo}
                disabled={savingSaldo || saldoInput === ''}
              >
                {savingSaldo ? '…' : 'Salvar'}
              </Button>
            </div>
          </div>

          {/* ── Adicionar gasto ── */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">
              Adicionar gasto
            </p>
            <div className="flex gap-2">
              <input
                className="input-field flex-1 text-xs py-1.5"
                placeholder="Descrição"
                value={expDesc}
                onChange={e => setExpDesc(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddExpense()}
              />
              <input
                type="number"
                step="0.01"
                min="0.01"
                className="input-field w-24 text-xs py-1.5"
                placeholder="R$"
                value={expAmount}
                onChange={e => setExpAmount(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddExpense()}
              />
              <button
                onClick={handleAddExpense}
                disabled={addingExp || !expDesc.trim() || !expAmount}
                className="flex items-center gap-1 bg-red-600/20 hover:bg-red-600/30 text-red-400
                           text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap"
              >
                <Plus size={12} />
                {addingExp ? '…' : 'Add'}
              </button>
            </div>
          </div>

          {/* ── Lista de gastos ── */}
          <div>
            <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Receipt size={10} /> Gastos
            </p>

            {expenses.length === 0 ? (
              <p className="text-xs text-zinc-600 pb-1">Nenhum gasto registrado ainda.</p>
            ) : (
              <div className="space-y-1.5 mb-3">
                {expenses.map(exp => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between bg-zinc-800/60 rounded-lg px-2.5 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-zinc-200 truncate">{exp.description}</p>
                      <p className="text-[10px] text-zinc-500">
                        {new Date(exp.createdAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      <span className="text-xs font-semibold text-red-400">−{formatBRL(exp.amount)}</span>
                      <button
                        onClick={() => handleDeleteExpense(exp.id)}
                        className="text-zinc-600 hover:text-red-400 transition-colors"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Total */}
                <div className="flex justify-between items-center pt-1.5 border-t border-zinc-700/40">
                  <span className="text-[11px] text-zinc-500">Total gastos</span>
                  <span className="text-xs font-bold text-red-400">{formatBRL(totalGastos)}</span>
                </div>
              </div>
            )}

            {/* Espaço no fim para não colar no limite do modal */}
            <div className="pb-4" />
          </div>

        </div>
      )}
    </Modal>
    </>
  );
}


// ─── RaceWeekendModal ──────────────────────────────────────────────────────────

function RaceWeekendModal({ isOpen, onClose, race, onRefresh }) {
  const { globalPixKey } = useAuth();
  const { addEntry } = useCommHistory();

  const [showAddPilot, setShowAddPilot] = useState(false);
  const [editEntry, setEditEntry]       = useState(null);
  const [payingId, setPayingId]         = useState(null);
  const [removingId, setRemovingId]     = useState(null);
  const [extrasOpen, setExtrasOpen]     = useState({});
  const [extrasForm, setExtrasForm]     = useState({});
  const [extrasLoading, setExtrasLoading] = useState({});
  const [reimbForm, setReimbFormState]  = useState({});
  const [reimbLoading, setReimbLoading] = useState({});
  const [menuOpen, setMenuOpen]         = useState({});
  const [menuPos,  setMenuPos]          = useState({});
  const [toast, setToast]               = useState(null); // { message, type }
  const showToast = (message, type = 'success') => setToast({ message, type });

  useEffect(() => {
    if (!isOpen) { setExtrasOpen({}); setExtrasForm({}); setMenuOpen({}); }
  }, [isOpen]);

  const toggleMenu = (id, e) => {
    if (menuOpen[id]) { closeMenu(id); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const MENU_HEIGHT_ESTIMATE = 170; // altura estimada do dropdown em px
    const spaceBelow = window.innerHeight - rect.bottom;
    const pos = { right: window.innerWidth - rect.right };
    if (spaceBelow < MENU_HEIGHT_ESTIMATE) {
      pos.bottom = window.innerHeight - rect.top + 4; // abre para cima
    } else {
      pos.top = rect.bottom + 4; // abre para baixo (padrão)
    }
    setMenuPos(prev => ({ ...prev, [id]: pos }));
    setMenuOpen(prev => ({ ...prev, [id]: true }));
  };
  const closeMenu = (id) => setMenuOpen(prev => ({ ...prev, [id]: false }));

  if (!race) return null;

  const entries          = race.entries ?? [];
  const total            = entries.reduce((s, e) => s + entryTotal(e), 0);
  const paid             = entries.filter(e => e.status === 'PAGO').reduce((s, e) => s + entryTotal(e), 0);
  const existingPilotIds = entries.map(e => e.pilot?.id ?? e.pilotId);

  const toggleExtras = (entryId) =>
    setExtrasOpen(prev => ({ ...prev, [entryId]: !prev[entryId] }));

  const setForm = (entryId, patch) =>
    setExtrasForm(prev => ({ ...prev, [entryId]: { desc: '', amount: '', ...(prev[entryId] ?? {}), ...patch } }));

  const setReimbForm = (entryId, patch) =>
    setReimbFormState(prev => ({ ...prev, [entryId]: { desc: '', amount: '', ...(prev[entryId] ?? {}), ...patch } }));

  const handlePay = async (entryId) => {
    setPayingId(entryId);
    try {
      await payRaceEntry(entryId);
      onRefresh();
      showToast('Pagamento registrado com sucesso!');
    }
    catch { showToast('Erro ao registrar pagamento.', 'error'); }
    finally { setPayingId(null); }
  };

  const handleRemove = async (entryId) => {
    if (!window.confirm('Remover este piloto da corrida?')) return;
    setRemovingId(entryId);
    try {
      await removeRaceEntry(entryId);
      onRefresh();
      showToast('Piloto removido da corrida.');
    }
    catch { showToast('Erro ao remover piloto.', 'error'); }
    finally { setRemovingId(null); }
  };

  const handleAddExpense = async (entryId) => {
    const f = extrasForm[entryId] ?? {};
    if (!f.desc?.trim() || !f.amount) return;
    setExtrasLoading(prev => ({ ...prev, [entryId]: true }));
    try {
      await addRaceEntryExpense(entryId, { Description: f.desc.trim(), Amount: parseFloat(f.amount) });
      setForm(entryId, { desc: '', amount: '' });
      onRefresh();
      showToast('Gasto extra adicionado.');
    } catch (err) {
      showToast('Erro: ' + (err.response?.data?.error || err.message), 'error');
    } finally { setExtrasLoading(prev => ({ ...prev, [entryId]: false })); }
  };

  const handleDeleteExpense = async (expenseId) => {
    try { await deleteRaceEntryExpense(expenseId); onRefresh(); }
    catch { showToast('Erro ao remover gasto.', 'error'); }
  };

  const handleAddReimbursement = async (entryId) => {
    const f = reimbForm[entryId] ?? {};
    if (!f.desc?.trim() || !f.amount) return;
    setReimbLoading(prev => ({ ...prev, [entryId]: true }));
    try {
      await addRaceEntryReimbursement(entryId, { Description: f.desc.trim(), Amount: parseFloat(f.amount) });
      setReimbForm(entryId, { desc: '', amount: '' });
      onRefresh();
      showToast('Reembolso adicionado.');
    } catch (err) {
      showToast('Erro: ' + (err.response?.data?.error ?? err.message), 'error');
    } finally { setReimbLoading(prev => ({ ...prev, [entryId]: false })); }
  };

  const handleDeleteReimbursement = async (reimbId) => {
    try { await deleteRaceEntryReimbursement(reimbId); onRefresh(); }
    catch { showToast('Erro ao remover reembolso.', 'error'); }
  };

  const buildWhatsAppMessage = (entry) => {
    const extras    = entry.extras ?? [];
    const reimbs    = entry.reimbursements ?? [];
    const tot       = entryTotal(entry);
    const pilotName = entry.pilot?.name ?? entry.guestPilot?.name ?? 'Piloto';
    return [
      `🏎️ *Cobrança de Corrida — ${pilotName}*`,
      `📅 Evento: ${race.name}`,
      `🗓️ Data: ${formatDateBR(race.date)}`,
      ...(race.description ? [`📝 ${race.description}`] : []),
      ``,
      `💰 Taxa da corrida: ${formatBRL(entry.amount)}`,
      ...(extras.length > 0 ? [``, `📋 *Gastos Extras:*`, ...extras.map(x => `  + ${x.description}: ${formatBRL(x.amount)}`)] : []),
      ...(reimbs.length > 0  ? [``, `💚 *Reembolsos:*`,   ...reimbs.map(r => `  - ${r.description}: ${formatBRL(r.amount)}`)]  : []),
      ``,
      `✅ *Total a pagar: ${formatBRL(tot)}*`,
      ...(globalPixKey ? [``, `🔑 *Chave PIX:* ${globalPixKey.trim()}`, `_(Por favor, envie o comprovante após o pagamento)_`] : []),
    ].join('\n');
  };

  const handleSendWhatsApp = (entry) => {
    const msg       = buildWhatsAppMessage(entry);
    const pilotName = entry.pilot?.name ?? entry.guestPilot?.name ?? 'Piloto';
    addEntry({ pilotId: entry.pilot?.id, pilotName, message: msg, amount: entryTotal(entry), monthLabel: race.name });
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
      <Modal isOpen={isOpen} onClose={onClose} title={race.name} size="lg">

        {/* Subtítulo: data + pilotos + descrição */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 -mt-1 mb-4">
          <span className="flex items-center gap-1"><Calendar size={11} />{formatDateBR(race.date)}</span>
          <span className="flex items-center gap-1"><Users size={11} />{entries.length} piloto{entries.length !== 1 ? 's' : ''}</span>
          {race.description && <span className="italic text-zinc-600">{race.description}</span>}
        </div>

        {/* Resumo financeiro */}
        {entries.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-zinc-800/60 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-zinc-500 mb-0.5">Total</p>
              <p className="text-xs font-bold text-zinc-200">{formatBRL(total)}</p>
            </div>
            <div className="bg-zinc-800/60 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-zinc-500 mb-0.5">Recebido</p>
              <p className="text-xs font-bold text-emerald-400">{formatBRL(paid)}</p>
            </div>
            <div className="bg-zinc-800/60 rounded-xl p-2.5 text-center">
              <p className="text-[10px] text-zinc-500 mb-0.5">Pendente</p>
              <p className="text-xs font-bold text-amber-400">{formatBRL(total - paid)}</p>
            </div>
          </div>
        )}

        {/* Lista de pilotos */}
        <div className="space-y-2">
          {entries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-zinc-600">
              <Users size={28} />
              <p className="text-xs">Nenhum piloto adicionado ainda.</p>
            </div>
          ) : entries.map((entry) => {
            const extras         = entry.extras ?? [];
            const eTotal         = entryTotal(entry);
            const isOpen         = !!extrasOpen[entry.id];
            const form           = extrasForm[entry.id] ?? { desc: '', amount: '' };
            const loadingEx      = !!extrasLoading[entry.id];
            const reimbursements = entry.reimbursements ?? [];
            const reimbFormEntry = reimbForm[entry.id] ?? { desc: '', amount: '' };
            const loadingReimb   = !!reimbLoading[entry.id];

            return (
              <div key={entry.id} className="bg-zinc-800/50 rounded-xl overflow-hidden">

                {/* Linha do piloto */}
                <div
                  className="flex items-center justify-between px-3 py-2.5 gap-2 cursor-pointer select-none hover:bg-zinc-700/30 transition-colors"
                  onClick={() => toggleExtras(entry.id)}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-zinc-200 truncate">
                        {entry.pilot?.name ?? entry.guestPilot?.name ?? '–'}
                        {entry.guestPilot && (
                          <span className="ml-1.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">
                            Convidado
                          </span>
                        )}
                      </p>
                      <StatusBadge status={entry.status} />
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-0.5 leading-relaxed">
                      {formatBRL(entry.amount)}
                      {extras.length > 0 && <span className="text-zinc-600"> · {extras.length} extra{extras.length > 1 ? 's' : ''}</span>}
                      {reimbursements.length > 0 && <span className="text-emerald-600/70"> · {reimbursements.length} reimb.</span>}
                      {entry.status === 'PAGO' && entry.paymentDate && (
                        <span className="text-zinc-600"> · {formatDate(entry.paymentDate)}</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-sm font-semibold text-zinc-200">{formatBRL(eTotal)}</span>

                    {/* Menu 3 pontos via portal */}
                    <div onClick={e => e.stopPropagation()}>
                      <button
                        onClick={e => toggleMenu(entry.id, e)}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
                        title="Ações"
                      >
                        <MoreVertical size={14} />
                      </button>

                      {menuOpen[entry.id] && createPortal(
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => closeMenu(entry.id)} />
                          <div
                            className="fixed z-50 bg-zinc-800 border border-zinc-700/80 rounded-xl shadow-2xl overflow-hidden min-w-[176px]"
                            style={{ top: menuPos[entry.id]?.top, bottom: menuPos[entry.id]?.bottom, right: menuPos[entry.id]?.right }}
                          >
                            {entry.status !== 'PAGO' && (
                              <button
                                onClick={() => { handleSendWhatsApp(entry); closeMenu(entry.id); }}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-700/60 transition-colors"
                              >
                                <MessageCircle size={13} className="text-emerald-400 shrink-0" />
                                Cobrar via WhatsApp
                              </button>
                            )}
                            <button
                              onClick={() => { setEditEntry(entry); closeMenu(entry.id); }}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-700/60 transition-colors"
                            >
                              <Pencil size={13} className="text-blue-400 shrink-0" />
                              Editar valor base
                            </button>
                            {entry.status !== 'PAGO' && (
                              <button
                                onClick={() => { handlePay(entry.id); closeMenu(entry.id); }}
                                disabled={payingId === entry.id}
                                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-zinc-300 hover:bg-zinc-700/60 transition-colors disabled:opacity-40"
                              >
                                <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                                {payingId === entry.id ? 'Salvando…' : 'Marcar como pago'}
                              </button>
                            )}
                            <div className="border-t border-zinc-700/50 mx-2" />
                            <button
                              onClick={() => { handleRemove(entry.id); closeMenu(entry.id); }}
                              disabled={removingId === entry.id}
                              className="w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-40"
                            >
                              <X size={13} className="shrink-0" />
                              {removingId === entry.id ? 'Removendo…' : 'Remover piloto'}
                            </button>
                          </div>
                        </>,
                        document.body
                      )}
                    </div>

                    {isOpen
                      ? <ChevronUp size={14} className="text-amber-400" />
                      : <ChevronDown size={14} className="text-zinc-500" />}
                  </div>
                </div>

                {/* Painel expandido: extras + reembolsos */}
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-zinc-700/50 px-3 py-3 space-y-4 bg-zinc-900/30">

                        {/* Gastos Extras */}
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                            <Receipt size={10} /> Gastos Extras
                          </p>
                          <div className="flex gap-2">
                            <input
                              className="input-field flex-1 text-xs py-1.5"
                              placeholder="Descrição"
                              value={form.desc}
                              onChange={e => setForm(entry.id, { desc: e.target.value })}
                            />
                            <input
                              type="number" step="0.01" min="0.01"
                              className="input-field w-20 text-xs py-1.5"
                              placeholder="R$"
                              value={form.amount}
                              onChange={e => setForm(entry.id, { amount: e.target.value })}
                            />
                            <button
                              onClick={() => handleAddExpense(entry.id)}
                              disabled={loadingEx || !form.desc?.trim() || !form.amount}
                              className="flex items-center gap-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400
                                         text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap"
                            >
                              <Plus size={12} />
                              {loadingEx ? '…' : 'Add'}
                            </button>
                          </div>
                          {extras.length === 0 ? (
                            <p className="text-xs text-zinc-600">Nenhum gasto extra adicionado.</p>
                          ) : (
                            <div className="space-y-1.5 pt-1">
                              {extras.map(x => (
                                <div key={x.id} className="flex items-center justify-between bg-zinc-800/60 rounded-lg px-2.5 py-1.5">
                                  <span className="text-xs text-zinc-300">{x.description}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-red-400">+{formatBRL(x.amount)}</span>
                                    <button onClick={() => handleDeleteExpense(x.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                                      <X size={11} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Reembolsos */}
                        <div className="space-y-2 pt-1 border-t border-zinc-700/40">
                          <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                            <TrendingDown size={10} className="text-emerald-400" /> Reembolsos
                          </p>
                          <div className="flex gap-2">
                            <input
                              className="input-field flex-1 text-xs py-1.5"
                              placeholder="Descrição do reembolso"
                              value={reimbFormEntry.desc}
                              onChange={e => setReimbForm(entry.id, { desc: e.target.value })}
                            />
                            <input
                              type="number" step="0.01" min="0.01"
                              className="input-field w-20 text-xs py-1.5"
                              placeholder="R$"
                              value={reimbFormEntry.amount}
                              onChange={e => setReimbForm(entry.id, { amount: e.target.value })}
                            />
                            <button
                              onClick={() => handleAddReimbursement(entry.id)}
                              disabled={loadingReimb || !reimbFormEntry.desc?.trim() || !reimbFormEntry.amount}
                              className="flex items-center gap-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400
                                         text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40 whitespace-nowrap"
                            >
                              <Plus size={12} />
                              {loadingReimb ? '…' : 'Add'}
                            </button>
                          </div>
                          {reimbursements.length === 0 ? (
                            <p className="text-xs text-zinc-600">Nenhum reembolso adicionado.</p>
                          ) : (
                            <div className="space-y-1.5 pt-1">
                              {reimbursements.map(r => (
                                <div key={r.id} className="flex items-center justify-between bg-emerald-900/20 border border-emerald-700/20 rounded-lg px-2.5 py-1.5">
                                  <span className="text-xs text-zinc-300">{r.description}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-emerald-400">-{formatBRL(r.amount)}</span>
                                    <button onClick={() => handleDeleteReimbursement(r.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                                      <X size={11} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                              <div className="flex justify-between items-center pt-1.5 border-t border-zinc-700/40">
                                <span className="text-[11px] text-zinc-500">Total com reembolsos</span>
                                <span className="text-sm font-bold text-emerald-400">{formatBRL(eTotal)}</span>
                              </div>
                            </div>
                          )}
                        </div>

                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            );
          })}
        </div>

        {/* Botão adicionar piloto */}
        <button
          onClick={() => setShowAddPilot(true)}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-zinc-700
                     hover:border-emerald-500/50 rounded-xl py-2.5 text-xs text-zinc-500
                     hover:text-emerald-400 transition-colors mt-3"
        >
          <Plus size={14} />
          Adicionar Piloto
        </button>

        {!globalPixKey && (
          <div className="flex items-start gap-2 bg-amber-900/20 border border-amber-700/40 rounded-xl px-3 py-2.5 mt-3">
            <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-400/80">
              Configure uma chave PIX nas Configurações para ela aparecer na mensagem de cobrança.
            </p>
          </div>
        )}

      </Modal>

      <AddPilotModal
        isOpen={showAddPilot}
        onClose={() => setShowAddPilot(false)}
        onSave={onRefresh}
        raceId={race.id}
        existingPilotIds={existingPilotIds}
      />
      <EditEntryModal
        isOpen={!!editEntry}
        onClose={() => setEditEntry(null)}
        onSave={onRefresh}
        entry={editEntry}
      />
    </>
  );
}

// ─── RaceWeekendCard ───────────────────────────────────────────────────────────

function RaceWeekendCard({ race, onEdit, onDelete, onRefresh }) {
  const [showModal,  setShowModal]  = useState(false);
  const [showAgenda, setShowAgenda] = useState(false);

  const entries    = race.entries ?? [];
  const total      = entries.reduce((s, e) => s + entryTotal(e), 0);
  const paid       = entries.filter(e => e.status === 'PAGO').reduce((s, e) => s + entryTotal(e), 0);
  const pending    = entries.filter(e => e.status !== 'PAGO').length;
  const hasOverdue = entries.some(e => e.status === 'ATRASADO');
  const hasPending = entries.some(e => e.status === 'PENDENTE');
  const barColor   = hasOverdue ? 'bg-red-500' : hasPending ? 'bg-amber-400' : 'bg-emerald-500';

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.012 }}
        whileTap={{ scale: 0.985 }}
        className="relative overflow-hidden glass-card p-5 cursor-pointer flex flex-col
                   hover:border-zinc-700 hover:bg-zinc-800/60 transition-colors duration-200 group select-none"
        onClick={() => setShowModal(true)}
      >
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${barColor}`} />

        {/* Topo — ícone + nome + meta + seta */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="shrink-0 w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Flag size={14} className="text-emerald-400" />
              </div>
              <p className="text-base font-semibold text-zinc-100 truncate">{race.name}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Calendar size={10} />{formatDateBR(race.date)}
              </span>
              <span className="text-xs text-zinc-500 flex items-center gap-1">
                <Users size={10} />{entries.length} piloto{entries.length !== 1 ? 's' : ''}
              </span>
              {pending > 0 && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  {pending} pendente{pending !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          <ChevronRight
            size={18}
            className="text-zinc-600 group-hover:text-emerald-400 transition-colors shrink-0 mt-0.5"
          />
        </div>

        {/* Rodapé — valores em grid + botões de ação */}
        <div className="flex items-end justify-between gap-3 pt-3 border-t border-zinc-800 mt-auto">
          <div className="grid grid-cols-3 gap-x-4">
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Total</p>
              <p className="text-sm font-bold text-zinc-200">{formatBRL(total)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Recebido</p>
              <p className="text-sm font-medium text-emerald-400">{formatBRL(paid)}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500 mb-0.5">Pendente</p>
              <p className={`text-sm font-medium ${total - paid > 0 ? 'text-amber-400' : 'text-zinc-500'}`}>
                {formatBRL(total - paid)}
              </p>
            </div>
          </div>

          {/* Botões — stopPropagation para não abrir o modal */}
          <div className="flex items-center gap-0.5 shrink-0" onClick={e => e.stopPropagation()}>
            <button
              onClick={e => { e.stopPropagation(); onEdit(race); }}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 transition-colors"
              title="Editar evento"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); setShowAgenda(true); }}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 transition-colors"
              title="Viagem — controle de saldo e gastos"
            >
              <Wallet size={14} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onDelete(race.id); }}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
              title="Excluir evento"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </motion.div>

      <RaceWeekendModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        race={race}
        onRefresh={onRefresh}
      />
      <RaceAgendaModal
        isOpen={showAgenda}
        onClose={() => setShowAgenda(false)}
        race={race}
      />
    </>
  );
}

// ─── RacesView (page) ──────────────────────────────────────────────────────────

export default function RacesView() {
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRace, setEditRace] = useState(null);
  const [search, setSearch] = useState('');

  const fetchRaces = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try { const res = await getRaceWeekends(); setRaces(res.data ?? []); }
    catch { if (!silent) setRaces([]); }
    finally { if (!silent) setLoading(false); }
  }, []);

  useEffect(() => { fetchRaces(); }, [fetchRaces]);

  const handleDelete = async (id) => {
    if (!window.confirm('Excluir este fim de semana de corrida e todos os seus pilotos?')) return;
    try { await deleteRaceWeekend(id); fetchRaces(); }
    catch { alert('Erro ao excluir corrida.'); }
  };

  const allEntries  = races.flatMap(r => r.entries ?? []);
  const totalPago   = allEntries.filter(e => e.status === 'PAGO').reduce((s, e) => s + entryTotal(e), 0);
  const totalAberto = allEntries.filter(e => e.status !== 'PAGO').reduce((s, e) => s + entryTotal(e), 0);
  const totalPilotos = new Set(allEntries.map(e => e.pilot?.id).filter(Boolean)).size;

  const filtered = races.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-zinc-950 overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-h-screen pb-safe-nav lg:pb-0 min-w-0">
        <PageHeader icon={Flag} title="Corridas" subtitle="Fins de semana com cobrança individual por piloto" />

        <div className="max-w-2xl mx-auto w-full px-4 py-6 space-y-5">

          {/* Stat cards */}
          {!loading && races.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-2.5"
            >
              {[
                { icon: Flag,        label: 'Eventos',     value: races.length,          color: 'bg-violet-500/15 text-violet-400' },
                { icon: Users,       label: 'Pilotos',     value: totalPilotos,           color: 'bg-blue-500/15 text-blue-400' },
                { icon: TrendingUp,  label: 'Recebido',    value: formatBRL(totalPago),   color: 'bg-emerald-500/15 text-emerald-400' },
                { icon: TrendingDown,label: 'A Receber',   value: formatBRL(totalAberto), color: 'bg-amber-500/15 text-amber-400' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="glass-card px-3 py-2.5 flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${color.split(' ')[0]}`}>
                    <Icon size={15} className={color.split(' ')[1]} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider truncate">{label}</p>
                    <p className="text-sm font-bold text-zinc-100 truncate">{value}</p>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* Barra de pesquisa */}
          {!loading && races.length > 0 && (
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="input-field pl-9 py-2.5 text-sm w-full"
                placeholder="Buscar evento por nome…"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="glass-card rounded-2xl h-20 animate-pulse bg-zinc-800/40" />)}
            </div>
          ) : races.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-zinc-600">
              <Flag size={40} />
              <p className="text-sm">Nenhum fim de semana de corrida cadastrado.</p>
              <button onClick={() => { setEditRace(null); setShowForm(true); }} className="text-sm text-emerald-400 hover:underline">
                Criar o primeiro evento
              </button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-zinc-600">
              <Search size={32} />
              <p className="text-sm">Nenhum evento encontrado para "{search}".</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map(race => (
                <RaceWeekendCard
                  key={race.id}
                  race={race}
                  onEdit={r => { setEditRace(r); setShowForm(true); }}
                  onDelete={handleDelete}
                  onRefresh={() => fetchRaces(true)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* FAB */}
      <button
        onClick={() => { setEditRace(null); setShowForm(true); }}
        className="fixed bottom-20 right-5 lg:bottom-8 lg:right-8 z-40 w-14 h-14 rounded-full bg-emerald-500
                   hover:bg-emerald-400 text-white shadow-xl shadow-emerald-500/30 flex items-center
                   justify-center transition-all duration-200 active:scale-90"
        aria-label="Novo Evento"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      <BottomNav />

      <WeekendFormModal
        isOpen={showForm}
        onClose={() => { setShowForm(false); setEditRace(null); }}
        onSave={fetchRaces}
        initial={editRace}
      />
    </div>
  );
}
