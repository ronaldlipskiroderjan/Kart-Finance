import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { getPilotHistory, getPilotById, payClosing, deleteClosing, getMonthlySummary, getPilotRaceEntries, payRaceEntry } from '../services/api';
import { formatBRL, formatDate } from '../utils/formatters';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import PageHeader from '../components/layout/PageHeader';
import {
  ArrowLeft, Calendar, CheckCircle, TrendingUp, TrendingDown,
  DollarSign, Clock, AlertCircle, CheckSquare, X, Flag,
  ChevronDown, ChevronUp, Receipt, Trash2, History,
} from 'lucide-react';

function entryTotal(entry) {
  const extras = (entry.extras ?? []).reduce((s, x) => s + (x.amount ?? 0), 0);
  const reimbursements = (entry.reimbursements ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
  return (entry.amount ?? 0) + extras - reimbursements;
}

// ── Status badge ──────────────────────────────────
const STATUS_CONFIG = {
  PAGO: {
    label: 'Pago',
    icon: CheckCircle,
    cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-600/30',
  },
  PENDENTE: {
    label: 'Pendente',
    icon: Clock,
    cls: 'bg-amber-500/15 text-amber-400 border border-amber-600/30',
  },
  ATRASADO: {
    label: 'Atrasado',
    icon: AlertCircle,
    cls: 'bg-red-500/15 text-red-400 border border-red-600/30',
  },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDENTE;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

// ── Toast ─────────────────────────────────────────
function Toast({ message, type = 'success', onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const isError = type === 'error';
  return (
    <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2
                    text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl
                    animate-in fade-in slide-in-from-bottom-4 duration-300
                    ${isError
                      ? 'bg-red-600 shadow-red-900/40'
                      : 'bg-emerald-600 shadow-emerald-900/40'}`}>
      {isError ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
      {message}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100 transition-opacity">
        <X size={14} />
      </button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────
export default function HistoryView() {
  const { pilotId } = useParams();
  const navigate = useNavigate();
  const [pilot, setPilot] = useState(null);
  const [history, setHistory] = useState([]);
  const [raceEntries, setRaceEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState(null); // { message, type }
  const [payingId, setPayingId] = useState(null);
  const [payingRaceId, setPayingRaceId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [expandedMonthId, setExpandedMonthId] = useState(null);
  const [expandedRaceId, setExpandedRaceId] = useState(null);
  const [statementItems, setStatementItems] = useState([]);
  const [loadingStatement, setLoadingStatement] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [pilotRes, historyRes] = await Promise.all([
          getPilotById(pilotId),
          getPilotHistory(pilotId),
        ]);
        setPilot(pilotRes.data);
        setHistory(historyRes.data);
      } catch {
        setError('Não foi possível carregar o histórico.');
      } finally {
        setLoading(false);
      }

      // Carrega corridas separadamente — falha silenciosa se endpoint não existir ainda
      try {
        const raceRes = await getPilotRaceEntries(pilotId);
        setRaceEntries(raceRes.data ?? []);
      } catch {
        setRaceEntries([]);
      }
    }
    load();
  }, [pilotId]);

  const toggleMonth = async (record) => {
    if (expandedMonthId === record.id) {
      setExpandedMonthId(null);
      return;
    }
    setExpandedMonthId(record.id);
    setLoadingStatement(true);
    try {
      const [yearStr, monthStr] = record.monthReference.split(/[-/]/);
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      await getMonthlySummary(pilotId, year, month);

      const pilotExpenses = pilot?.expenses || [];
      const pilotReimbursements = pilot?.reimbursements || [];

      const filteredExps = pilotExpenses.filter(e => {
        const d = new Date(e.createdAt);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });
      const filteredRmbs = pilotReimbursements.filter(r => {
        const d = new Date(r.createdAt);
        return d.getFullYear() === year && d.getMonth() + 1 === month;
      });

      const exps = filteredExps.map(e => ({ ...e, type: 'expense', date: new Date(e.createdAt).getTime() }));
      const rmbs = filteredRmbs.map(r => ({ ...r, type: 'reimbursement', date: new Date(r.createdAt).getTime() }));
      const combined = [...exps, ...rmbs].sort((a, b) => a.date - b.date);

      if (record.status === 'PAGO' && record.paymentDate) {
        combined.push({
          type: 'payment',
          description: 'Pagamento Recebido',
          amount: record.totalAmount,
          createdAt: record.paymentDate,
          date: new Date(record.paymentDate).getTime(),
        });
      }

      setStatementItems(combined);
    } catch {
      setStatementItems([]);
      setToast({ message: 'Erro ao carregar detalhes do extrato.', type: 'error' });
    } finally {
      setLoadingStatement(false);
    }
  };

  const handleMarkAsPaid = useCallback(async (record) => {
    setPayingId(record.id);
    try {
      await payClosing(record.id);
      setHistory((prev) =>
        prev.map((r) => r.id === record.id ? { ...r, status: 'PAGO' } : r)
      );
      setToast({ message: `Fechamento de ${record.monthReference} marcado como Pago!`, type: 'success' });
    } catch {
      setToast({ message: 'Erro ao registrar pagamento. Tente novamente.', type: 'error' });
    } finally {
      setPayingId(null);
    }
  }, []);

  const handlePayRaceEntry = useCallback(async (entry) => {
    setPayingRaceId(entry.id);
    try {
      await payRaceEntry(entry.id);
      setRaceEntries((prev) =>
        prev.map((e) => e.id === entry.id ? { ...e, status: 'PAGO' } : e)
      );
      setToast({ message: `Corrida "${entry.raceWeekend?.name ?? ''}" marcada como Paga!`, type: 'success' });
    } catch {
      setToast({ message: 'Erro ao registrar pagamento. Tente novamente.', type: 'error' });
    } finally {
      setPayingRaceId(null);
    }
  }, []);

  const handleDeleteClosing = useCallback(async (record) => {
    setDeletingId(record.id);
    try {
      await deleteClosing(record.id);
      setHistory((prev) => prev.filter((r) => r.id !== record.id));
      setToast({ message: `Fechamento de ${record.monthReference} deletado com sucesso!`, type: 'success' });
    } catch {
      setToast({ message: 'Erro ao deletar fechamento. Tente novamente.', type: 'error' });
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <PageHeader
          icon={History}
          subtitle={pilot ? pilot.name : 'Histórico de Fechamentos'}
          left={
            <button
              onClick={() => navigate('/')}
              className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg p-1.5 transition-colors"
              aria-label="Voltar"
            >
              <ArrowLeft size={18} />
            </button>
          }
        />

        {/* Content */}
        <div className="flex-1 px-4 md:px-6 lg:px-8 py-6 pb-28 lg:pb-8">
          {error && (
            <div className="bg-red-900/30 border border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-400 mb-4">
              {error}
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="glass-card h-28 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-8">

              {/* ── Seção: Corridas ─────────────────────── */}
              {raceEntries.length > 0 && (
                <section>
                  <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Flag size={13} className="text-emerald-400" />
                    Cobranças de Corridas
                  </h2>
                  <div className="space-y-3">
                    {raceEntries.map((entry) => {
                      const isPending = entry.status === 'PENDENTE' || entry.status === 'ATRASADO';
                      const isPayingThis = payingRaceId === entry.id;
                      const extras = entry.extras ?? [];
                      const extrasTotal = extras.reduce((s, x) => s + (x.amount ?? 0), 0);
                      const reimbTotal = (entry.reimbursements ?? []).reduce((s, r) => s + (r.amount ?? 0), 0);
                      const total = entryTotal(entry);
                      const isOpen = expandedRaceId === entry.id;

                      return (
                        <div key={entry.id} className="glass-card p-5 transition-all duration-200">
                          {/* Card header: nome + status (esquerda) | ações (direita) */}
                          <div className="flex items-center justify-between gap-2 mb-4">
                            <div
                              className="flex items-center gap-2 min-w-0 cursor-pointer flex-1"
                              onClick={() => setExpandedRaceId(isOpen ? null : entry.id)}
                            >
                              <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                                <Flag size={13} className="text-emerald-400" />
                              </div>
                              <span className="text-sm font-semibold text-zinc-200 truncate">
                                {entry.raceWeekend?.name ?? 'Corrida'}
                              </span>
                              <StatusBadge status={entry.status ?? 'PENDENTE'} />
                            </div>

                            {/* Ação: Marcar como Pago */}
                            <div className="flex items-center shrink-0">
                              {isPending && (
                                <button
                                  onClick={e => { e.stopPropagation(); handlePayRaceEntry(entry); }}
                                  disabled={isPayingThis}
                                  className="btn-pay flex items-center gap-1 disabled:opacity-60"
                                >
                                  <CheckSquare size={12} />
                                  {isPayingThis ? 'Salvando…' : 'Marcar como Pago'}
                                </button>
                              )}
                            </div>
                          </div>

                          <div
                            className="cursor-pointer select-none"
                            onClick={() => setExpandedRaceId(isOpen ? null : entry.id)}
                          >
                            {/* Grid de valores */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                              <div className="bg-zinc-800/60 rounded-xl p-3">
                                <div className="flex items-center gap-1 mb-1">
                                  <Flag size={11} className="text-zinc-500" />
                                  <p className="text-[11px] text-zinc-500">Corrida</p>
                                </div>
                                <p className="text-sm font-semibold text-zinc-300">{formatBRL(entry.amount)}</p>
                              </div>
                              <div className="bg-zinc-800/60 rounded-xl p-3">
                                <div className="flex items-center gap-1 mb-1">
                                  <TrendingUp size={11} className="text-red-500" />
                                  <p className="text-[11px] text-zinc-500">Gastos Extras</p>
                                </div>
                                <p className="text-sm font-semibold text-red-400">{formatBRL(extrasTotal)}</p>
                              </div>
                              <div className="bg-zinc-800/60 rounded-xl p-3">
                                <div className="flex items-center gap-1 mb-1">
                                  <TrendingDown size={11} className="text-emerald-500" />
                                  <p className="text-[11px] text-zinc-500">Reembolsos</p>
                                </div>
                                <p className="text-sm font-semibold text-emerald-400">{formatBRL(reimbTotal)}</p>
                              </div>
                              <div className="bg-zinc-800/60 rounded-xl p-3 border border-emerald-900/30">
                                <p className="text-[11px] text-zinc-500 mb-1">Total Final</p>
                                <p className="text-sm font-bold text-emerald-400">{formatBRL(total)}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 mt-3 flex-wrap">
                              {entry.raceWeekend?.date && (
                                <p className="text-xs text-zinc-600">
                                  {new Date(entry.raceWeekend.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })}
                                </p>
                              )}
                              {entry.status === 'PAGO' && entry.paymentDate && (
                                <p className="text-xs text-emerald-500/70 flex items-center gap-1">
                                  <CheckCircle size={10} />
                                  Pago em {formatDate(entry.paymentDate)}
                                </p>
                              )}
                              {entry.status === 'ATRASADO' && entry.dueDate && (
                                <p className="text-xs text-red-400/70 flex items-center gap-1">
                                  <AlertCircle size={10} />
                                  Venceu em {formatDate(entry.dueDate)}
                                </p>
                              )}
                              {entry.status === 'PENDENTE' && entry.dueDate && (
                                <p className="text-xs text-zinc-600">
                                  Vence em {formatDate(entry.dueDate)}
                                </p>
                              )}
                              <span className="ml-auto">
                                {isOpen
                                  ? <ChevronUp size={15} className="text-amber-400" />
                                  : <ChevronDown size={15} className="text-zinc-500" />}
                              </span>
                            </div>
                          </div>

                          {/* Extrato da corrida */}
                          <AnimatePresence>
                            {isOpen && (() => {
                              const reimbursements = entry.reimbursements ?? [];
                              const raceItems = [
                                ...extras.map(x => ({ type: 'expense', description: x.description, amount: x.amount, createdAt: x.createdAt })),
                                ...reimbursements.map(r => ({ type: 'reimbursement', description: r.description, amount: r.amount, createdAt: r.createdAt })),
                              ].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

                              if (entry.status === 'PAGO' && entry.paymentDate) {
                                raceItems.push({ type: 'payment', description: 'Pagamento Recebido', amount: total, createdAt: entry.paymentDate });
                              }

                              return (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.18 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-4 pt-4 border-t border-zinc-800 space-y-3">
                                    <h4 className="text-sm font-semibold text-zinc-100">Extrato da Corrida</h4>

                                    {/* Valor base */}
                                    <div className="flex justify-between items-center bg-zinc-800/40 p-3 rounded-lg border border-zinc-700/50">
                                      <div className="flex items-center gap-2">
                                        <Flag size={14} className="text-zinc-400" />
                                        <span className="text-sm text-zinc-300">Valor Base da Corrida</span>
                                      </div>
                                      <span className="text-sm font-medium text-zinc-300">{formatBRL(entry.amount)}</span>
                                    </div>

                                    {raceItems.length === 0 ? (
                                      <p className="text-xs text-zinc-500 text-center py-2">Nenhum gasto extra ou reembolso nesta corrida.</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {raceItems.map((item, idx) => (
                                          <div key={idx} className={`flex justify-between items-center bg-zinc-800/20 p-2.5 rounded-lg border ${item.type === 'payment' ? 'border-emerald-600/30 bg-emerald-900/10' : 'border-zinc-800/50'}`}>
                                            <div className="flex gap-2.5 items-start">
                                              <div className="mt-0.5">
                                                {item.type === 'expense' ? (
                                                  <TrendingUp size={14} className="text-red-400" />
                                                ) : item.type === 'payment' ? (
                                                  <CheckCircle size={14} className="text-emerald-400" />
                                                ) : (
                                                  <TrendingDown size={14} className="text-emerald-400" />
                                                )}
                                              </div>
                                              <div>
                                                <p className={`text-sm font-medium ${item.type === 'payment' ? 'text-emerald-400' : 'text-zinc-200'}`}>
                                                  {item.description}
                                                </p>
                                                <p className={`text-xs ${item.type === 'payment' ? 'text-emerald-500/70' : 'text-zinc-500'}`}>
                                                  {formatDate(item.createdAt)}
                                                </p>
                                              </div>
                                            </div>
                                            <span className={`text-sm font-medium ${item.type === 'expense' ? 'text-red-400' : 'text-emerald-400'}`}>
                                              {item.type === 'expense' ? '+' : '-'}{formatBRL(item.amount)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              );
                            })()}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* ── Seção: Fechamentos Mensais ───────────── */}
              <section>
                {raceEntries.length > 0 && (
                  <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Calendar size={13} className="text-zinc-400" />
                    Fechamentos Mensais
                  </h2>
                )}

                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4">
                      <Calendar size={28} className="text-zinc-600" />
                    </div>
                    <p className="text-zinc-400 font-medium mb-1">Nenhum fechamento encontrado</p>
                    <p className="text-xs text-zinc-600">Feche o mês de um piloto no Dashboard para ver o histórico aqui.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((record) => {
                      const isPending = record.status === 'PENDENTE' || record.status === 'ATRASADO';
                      const isPayingThis = payingId === record.id;
                      const isDeletingThis = deletingId === record.id;
                      const isConfirmingDelete = confirmDeleteId === record.id;

                      return (
                        <div key={record.id} className="glass-card p-5 transition-all duration-200">
                          {/* Card header: mês + status (esquerda) | ações (direita) */}
                          <div className="flex items-center justify-between gap-2 mb-4">
                            <div
                              className="flex items-center gap-2 min-w-0 cursor-pointer flex-1"
                              onClick={() => toggleMonth(record)}
                            >
                              <Calendar size={15} className="text-emerald-400 shrink-0" />
                              <span className="text-sm font-semibold text-zinc-200 capitalize">
                                {record.monthReference}
                              </span>
                              <StatusBadge status={record.status ?? 'PENDENTE'} />
                            </div>

                            {/* Ações: Marcar como Pago + lixeira */}
                            <div className="flex items-center gap-0.5 shrink-0">
                              {isPending && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleMarkAsPaid(record); }}
                                  disabled={isPayingThis}
                                  className="btn-pay flex items-center gap-1 disabled:opacity-60 mr-1"
                                  title="Marcar como Pago"
                                >
                                  <CheckSquare size={12} />
                                  {isPayingThis ? 'Salvando…' : 'Marcar como Pago'}
                                </button>
                              )}
                              {!isConfirmingDelete ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(record.id); }}
                                  disabled={isDeletingThis}
                                  className="text-zinc-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg p-1.5 transition-colors disabled:opacity-50"
                                  title="Deletar fechamento"
                                >
                                  <Trash2 size={15} />
                                </button>
                              ) : (
                                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-xs text-red-400 font-medium">Confirmar?</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteClosing(record); }}
                                    disabled={isDeletingThis}
                                    className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50"
                                    title="Confirmar exclusão"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                                    className="p-1.5 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
                                    title="Cancelar"
                                  >
                                    <X size={13} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="cursor-pointer" onClick={() => toggleMonth(record)}>

                            {/* Values grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                              <div className="bg-zinc-800/60 rounded-xl p-3">
                                <div className="flex items-center gap-1 mb-1">
                                  <DollarSign size={11} className="text-zinc-500" />
                                  <p className="text-[11px] text-zinc-500">Mensalidade</p>
                                </div>
                                <p className="text-sm font-semibold text-zinc-300">{formatBRL(record.baseFee)}</p>
                              </div>
                              <div className="bg-zinc-800/60 rounded-xl p-3">
                                <div className="flex items-center gap-1 mb-1">
                                  <TrendingUp size={11} className="text-red-500" />
                                  <p className="text-[11px] text-zinc-500">Gastos Extras</p>
                                </div>
                                <p className="text-sm font-semibold text-red-400">{formatBRL(record.totalExpenses)}</p>
                              </div>
                              <div className="bg-zinc-800/60 rounded-xl p-3">
                                <div className="flex items-center gap-1 mb-1">
                                  <TrendingDown size={11} className="text-emerald-500" />
                                  <p className="text-[11px] text-zinc-500">Reembolsos</p>
                                </div>
                                <p className="text-sm font-semibold text-emerald-400">{formatBRL(record.totalReimbursements)}</p>
                              </div>
                              <div className="bg-zinc-800/60 rounded-xl p-3 border border-emerald-900/30">
                                <p className="text-[11px] text-zinc-500 mb-1">Total Final</p>
                                <p className="text-sm font-bold text-emerald-400">{formatBRL(record.totalAmount)}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 mt-3 flex-wrap">
                              {record.createdAt && (
                                <p className="text-xs text-zinc-600">
                                  Fechado em {formatDate(record.createdAt)}
                                </p>
                              )}
                              {record.status === 'PAGO' && record.paymentDate && (
                                <p className="text-xs text-emerald-500/70 flex items-center gap-1">
                                  <CheckCircle size={10} />
                                  Pago em {formatDate(record.paymentDate)}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Statement Details */}
                          {expandedMonthId === record.id && (
                            <div className="mt-4 pt-4 border-t border-zinc-800 animate-in fade-in slide-in-from-top-4 duration-300">
                              <h4 className="text-sm font-semibold text-zinc-100 mb-3">Extrato do Mês</h4>
                              {loadingStatement ? (
                                <div className="flex justify-center py-4">
                                  <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center bg-zinc-800/40 p-3 rounded-lg border border-zinc-700/50">
                                    <div className="flex items-center gap-2">
                                      <DollarSign size={14} className="text-zinc-400" />
                                      <span className="text-sm text-zinc-300">Mensalidade Fixa</span>
                                    </div>
                                    <span className="text-sm font-medium text-zinc-300">{formatBRL(record.baseFee)}</span>
                                  </div>

                                  {statementItems.length === 0 ? (
                                    <p className="text-xs text-zinc-500 text-center py-2">Nenhum gasto extra ou reembolso neste mês.</p>
                                  ) : (
                                    <div className="space-y-2">
                                      {statementItems.map((item, idx) => (
                                        <div key={idx} className={`flex justify-between items-center bg-zinc-800/20 p-2.5 rounded-lg border ${item.type === 'payment' ? 'border-emerald-600/30 bg-emerald-900/10' : 'border-zinc-800/50'}`}>
                                          <div className="flex gap-2.5 items-start">
                                            <div className="mt-0.5">
                                              {item.type === 'expense' ? (
                                                <TrendingUp size={14} className="text-red-400" />
                                              ) : item.type === 'payment' ? (
                                                <CheckCircle size={14} className="text-emerald-400" />
                                              ) : (
                                                <TrendingDown size={14} className="text-emerald-400" />
                                              )}
                                            </div>
                                            <div>
                                              <p className={`text-sm font-medium ${item.type === 'payment' ? 'text-emerald-400' : 'text-zinc-200'}`}>
                                                {item.description}
                                              </p>
                                              <p className={`text-xs ${item.type === 'payment' ? 'text-emerald-500/70' : 'text-zinc-500'}`}>
                                                {formatDate(item.createdAt)}
                                              </p>
                                            </div>
                                          </div>
                                          <span className={`text-sm font-medium ${item.type === 'expense' ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {item.type === 'expense' ? '+' : '-'}{formatBRL(item.amount)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

            </div>
          )}
        </div>
      </main>

      {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}

      <BottomNav />
    </div>
  );
}
