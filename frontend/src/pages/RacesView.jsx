import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Flag, Plus, Trash2, X, Pencil, MessageCircle, CheckCircle2,
  ChevronDown, ChevronUp, Calendar, Users, AlertTriangle, Receipt,
  Search, DollarSign, TrendingUp, TrendingDown,
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import {
  getRaceWeekends, createRaceWeekend, updateRaceWeekend, deleteRaceWeekend,
  addRaceEntry, updateRaceEntry, removeRaceEntry, payRaceEntry, getPilots,
  addRaceEntryExpense, deleteRaceEntryExpense,
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
  return (entry.amount ?? 0) + (entry.extras ?? []).reduce((s, x) => s + (x.amount ?? 0), 0);
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
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Editar Fim de Semana' : 'Novo Fim de Semana'} size="sm">
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
  const [pilots, setPilots] = useState([]);
  const [pilotId, setPilotId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setPilotId(''); setAmount(''); setError('');
    getPilots().then(r => setPilots(r.data || [])).catch(() => {});
  }, [isOpen]);

  const available = pilots.filter(p => !existingPilotIds.includes(p.id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!pilotId || !amount) { setError('Selecione um piloto e informe o valor.'); return; }
    setLoading(true); setError('');
    try {
      await addRaceEntry(raceId, { PilotID: Number(pilotId), Amount: parseFloat(amount) });
      onSave(); onClose();
    } catch (err) { setError(err.response?.data?.error ?? 'Erro ao adicionar piloto.'); }
    finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adicionar Piloto à Corrida" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Piloto</label>
          <select className="input-field" value={pilotId} onChange={e => setPilotId(e.target.value)} required>
            <option value="">Selecione…</option>
            {available.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {available.length === 0 && <p className="text-xs text-zinc-500 mt-1">Todos os pilotos já foram adicionados.</p>}
        </div>
        <div>
          <label className="label">Valor Individual (R$)</label>
          <input type="number" step="0.01" min="0.01" className="input-field" placeholder="Ex: 250.00"
            value={amount} onChange={e => setAmount(e.target.value)} required />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={loading || available.length === 0}>
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
    <Modal isOpen={isOpen} onClose={onClose} title={`Editar Valor Base — ${entry?.pilot?.name ?? ''}`} size="sm">
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

// ─── RaceWeekendCard ───────────────────────────────────────────────────────────

function RaceWeekendCard({ race, onEdit, onDelete, onRefresh }) {
  const { globalPixKey } = useAuth();
  const { addEntry } = useCommHistory();

  const [expanded, setExpanded] = useState(false);
  const [showAddPilot, setShowAddPilot] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [payingId, setPayingId] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [extrasOpen, setExtrasOpen] = useState({});
  const [extrasForm, setExtrasForm] = useState({});
  const [extrasLoading, setExtrasLoading] = useState({});

  const entries = race.entries ?? [];
  const total   = entries.reduce((s, e) => s + entryTotal(e), 0);
  const paid    = entries.filter(e => e.status === 'PAGO').reduce((s, e) => s + entryTotal(e), 0);
  const pending = entries.filter(e => e.status !== 'PAGO').length;
  const existingPilotIds = entries.map(e => e.pilot?.id ?? e.pilotId);

  const toggleExtras = (entryId) =>
    setExtrasOpen(prev => ({ ...prev, [entryId]: !prev[entryId] }));

  const setForm = (entryId, patch) =>
    setExtrasForm(prev => ({ ...prev, [entryId]: { desc: '', amount: '', ...(prev[entryId] ?? {}), ...patch } }));

  const handlePay = async (entryId) => {
    setPayingId(entryId);
    try { await payRaceEntry(entryId); onRefresh(); }
    catch { alert('Erro ao registrar pagamento.'); }
    finally { setPayingId(null); }
  };

  const handleRemove = async (entryId) => {
    if (!window.confirm('Remover este piloto da corrida?')) return;
    setRemovingId(entryId);
    try { await removeRaceEntry(entryId); onRefresh(); }
    catch { alert('Erro ao remover piloto.'); }
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
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Erro desconhecido';
      alert('Erro ao adicionar gasto: ' + msg);
      console.error('[addRaceEntryExpense]', err);
    } finally { setExtrasLoading(prev => ({ ...prev, [entryId]: false })); }
  };

  const handleDeleteExpense = async (expenseId) => {
    try { await deleteRaceEntryExpense(expenseId); onRefresh(); }
    catch { alert('Erro ao remover gasto.'); }
  };

  const buildWhatsAppMessage = (entry) => {
    const extras = entry.extras ?? [];
    const tot = entryTotal(entry);
    return [
      `🏎️ *Cobrança de Corrida — ${entry.pilot?.name ?? 'Piloto'}*`,
      `📅 Evento: ${race.name}`,
      `🗓️ Data: ${formatDateBR(race.date)}`,
      ...(race.description ? [`📝 ${race.description}`] : []),
      ``,
      `💰 Taxa da corrida: ${formatBRL(entry.amount)}`,
      ...(extras.length > 0 ? [``, `📋 *Gastos Extras:*`, ...extras.map(x => `  + ${x.description}: ${formatBRL(x.amount)}`)] : []),
      ``,
      `✅ *Total a pagar: ${formatBRL(tot)}*`,
      ...(globalPixKey ? [``, `🔑 *Chave PIX:* ${globalPixKey.trim()}`, `_(Por favor, envie o comprovante após o pagamento)_`] : []),
    ].join('\n');
  };

  const handleSendWhatsApp = (entry) => {
    const msg = buildWhatsAppMessage(entry);
    addEntry({ pilotId: entry.pilot?.id, pilotName: entry.pilot?.name, message: msg, amount: entryTotal(entry), monthLabel: race.name });
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const hasOverdue  = entries.some(e => e.status === 'ATRASADO');
  const hasPending  = entries.some(e => e.status === 'PENDENTE');
  const barColor    = hasOverdue ? 'bg-red-500' : hasPending ? 'bg-amber-400' : 'bg-emerald-500';

  return (
    <>
      <div className="glass-card rounded-2xl overflow-hidden relative">
        <div className={`absolute left-0 top-0 bottom-0 w-1 ${barColor}`} />

        {/* ── Header ── */}
        <div
          className="flex items-start justify-between gap-3 p-4 cursor-pointer select-none"
          onClick={() => setExpanded(v => !v)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Flag size={17} className="text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-100 truncate">{race.name}</p>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs text-zinc-500 flex items-center gap-1"><Calendar size={10} />{formatDateBR(race.date)}</span>
                <span className="text-xs text-zinc-500 flex items-center gap-1"><Users size={10} />{entries.length} piloto{entries.length !== 1 ? 's' : ''}</span>
                {pending > 0 && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    {pending} pendente{pending !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="text-right">
              <p className="text-xs text-zinc-500">Total</p>
              <p className="text-sm font-bold text-emerald-400">{formatBRL(total)}</p>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={e => { e.stopPropagation(); onEdit(race); }}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-800 transition-colors" title="Editar">
                <Pencil size={13} />
              </button>
              <button onClick={e => { e.stopPropagation(); onDelete(race.id); }}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-900/20 transition-colors" title="Excluir">
                <Trash2 size={13} />
              </button>
            </div>
            {expanded ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
          </div>
        </div>

        {race.description && expanded && (
          <div className="px-4 pb-2">
            <p className="text-xs text-zinc-500 italic">{race.description}</p>
          </div>
        )}

        {/* ── Corpo expandido ── */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">

                {/* Resumo */}
                {entries.length > 0 && (
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="bg-zinc-800/60 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-zinc-500 mb-0.5 truncate">Total</p>
                      <p className="text-[11px] font-bold text-zinc-200 truncate">{formatBRL(total)}</p>
                    </div>
                    <div className="bg-zinc-800/60 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-zinc-500 mb-0.5 truncate">Recebido</p>
                      <p className="text-[11px] font-bold text-emerald-400 truncate">{formatBRL(paid)}</p>
                    </div>
                    <div className="bg-zinc-800/60 rounded-xl p-2.5 text-center">
                      <p className="text-[10px] text-zinc-500 mb-0.5 truncate">Pendente</p>
                      <p className="text-[11px] font-bold text-amber-400 truncate">{formatBRL(total - paid)}</p>
                    </div>
                  </div>
                )}

                {/* Lista de pilotos */}
                {entries.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-6 text-zinc-600">
                    <Users size={28} />
                    <p className="text-xs">Nenhum piloto adicionado ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {entries.map((entry) => {
                      const extras  = entry.extras ?? [];
                      const eTotal  = entryTotal(entry);
                      const isOpen  = !!extrasOpen[entry.id];
                      const form    = extrasForm[entry.id] ?? { desc: '', amount: '' };
                      const loadingEx = !!extrasLoading[entry.id];

                      return (
                        <div key={entry.id} className="bg-zinc-800/50 rounded-xl overflow-hidden">

                          {/* Linha principal — clique expande gastos extras */}
                          <div
                            className="flex items-center justify-between px-3 py-2.5 gap-2 cursor-pointer select-none hover:bg-zinc-700/30 transition-colors"
                            onClick={() => toggleExtras(entry.id)}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium text-zinc-200 truncate">{entry.pilot?.name ?? '–'}</p>
                                <StatusBadge status={entry.status} />
                              </div>
                              {entry.status === 'PAGO' && entry.paymentDate && (
                                <p className="text-[10px] text-zinc-500 mt-0.5">Pago em {formatDate(entry.paymentDate)}</p>
                              )}
                              <p className="text-[10px] text-zinc-500 mt-0.5">
                                Base {formatBRL(entry.amount)}{extras.length > 0 ? ` + ${extras.length} extra${extras.length > 1 ? 's' : ''}` : ''}
                              </p>
                            </div>

                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className="text-sm font-semibold text-zinc-200 mr-1">{formatBRL(eTotal)}</span>

                              {entry.status !== 'PAGO' && (
                                <button onClick={e => { e.stopPropagation(); handleSendWhatsApp(entry); }}
                                  className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-700 transition-colors"
                                  title="Cobrar via WhatsApp">
                                  <MessageCircle size={13} />
                                </button>
                              )}

                              <button onClick={e => { e.stopPropagation(); setEditEntry(entry); }}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-400 hover:bg-zinc-700 transition-colors"
                                title="Editar valor base">
                                <Pencil size={13} />
                              </button>

                              {entry.status !== 'PAGO' && (
                                <button onClick={e => { e.stopPropagation(); handlePay(entry.id); }} disabled={payingId === entry.id}
                                  className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-700 transition-colors disabled:opacity-40"
                                  title="Marcar como pago">
                                  <CheckCircle2 size={13} />
                                </button>
                              )}

                              <button onClick={e => { e.stopPropagation(); handleRemove(entry.id); }} disabled={removingId === entry.id}
                                className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-40"
                                title="Remover piloto">
                                <X size={13} />
                              </button>

                              {isOpen
                                ? <ChevronUp size={14} className="text-amber-400 ml-0.5" />
                                : <ChevronDown size={14} className="text-zinc-500 ml-0.5" />}
                            </div>
                          </div>

                          {/* Painel de gastos extras (colapsável com animação) */}
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.18 }}
                                className="overflow-hidden"
                              >
                                <div className="border-t border-zinc-700/50 px-3 py-3 space-y-2 bg-zinc-900/30">
                                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
                                    <Receipt size={10} /> Gastos Extras
                                  </p>

                                  {extras.length === 0 ? (
                                    <p className="text-xs text-zinc-600">Nenhum gasto extra adicionado.</p>
                                  ) : (
                                    <div className="space-y-1.5">
                                      {extras.map(x => (
                                        <div key={x.id} className="flex items-center justify-between bg-zinc-800/60 rounded-lg px-2.5 py-1.5">
                                          <span className="text-xs text-zinc-300">{x.description}</span>
                                          <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold text-red-400">+{formatBRL(x.amount)}</span>
                                            <button onClick={() => handleDeleteExpense(x.id)}
                                              className="text-zinc-600 hover:text-red-400 transition-colors">
                                              <X size={11} />
                                            </button>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Formulário inline */}
                                  <div className="flex flex-col min-[480px]:flex-row gap-2 pt-1">
                                    <input
                                      className="input-field min-[480px]:flex-1 text-xs py-1.5"
                                      placeholder="Descrição"
                                      value={form.desc}
                                      onChange={e => setForm(entry.id, { desc: e.target.value })}
                                    />
                                    <div className="flex gap-2">
                                      <input
                                        type="number" step="0.01" min="0.01"
                                        className="input-field flex-1 min-[480px]:flex-none min-[480px]:w-24 text-xs py-1.5"
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
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Botão adicionar piloto */}
                <button
                  onClick={() => setShowAddPilot(true)}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-zinc-700
                             hover:border-emerald-500/50 rounded-xl py-2 text-xs text-zinc-500
                             hover:text-emerald-400 transition-colors"
                >
                  <Plus size={14} />
                  Adicionar Piloto
                </button>

                {!globalPixKey && (
                  <div className="flex items-start gap-2 bg-amber-900/20 border border-amber-700/40 rounded-xl px-3 py-2.5">
                    <AlertTriangle size={14} className="text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-400/80">
                      Configure uma chave PIX nas Configurações para ela aparecer na mensagem de cobrança.
                    </p>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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

// ─── RacesView (page) ──────────────────────────────────────────────────────────

export default function RacesView() {
  const [races, setRaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editRace, setEditRace] = useState(null);
  const [search, setSearch] = useState('');

  const fetchRaces = useCallback(async () => {
    setLoading(true);
    try { const res = await getRaceWeekends(); setRaces(res.data ?? []); }
    catch { setRaces([]); }
    finally { setLoading(false); }
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
      <main className="flex-1 flex flex-col min-h-screen pb-20 lg:pb-0 min-w-0">
        <div className="max-w-2xl mx-auto w-full px-4 py-6 space-y-5">

          <div>
            <h1 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <Flag size={20} className="text-emerald-400" />
              Corridas
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">Fins de semana com cobrança individual por piloto</p>
          </div>

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
                  onRefresh={fetchRaces}
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
