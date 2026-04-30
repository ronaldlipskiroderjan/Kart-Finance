import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPilotHistory, getPilotById, payClosing, getMonthlySummary } from '../services/api';
import { formatBRL, formatDate } from '../utils/formatters';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import {
  ArrowLeft, Calendar, CheckCircle, TrendingUp, TrendingDown,
  DollarSign, Clock, AlertCircle, CheckSquare, X,
} from 'lucide-react';

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
function Toast({ message, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2
                    bg-emerald-600 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-xl
                    shadow-emerald-900/40 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <CheckCircle size={16} />
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [payingId, setPayingId] = useState(null);
  const [expandedMonthId, setExpandedMonthId] = useState(null);
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
      const res = await getMonthlySummary(pilotId, year, month);
      
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
          date: new Date(record.paymentDate).getTime()
        });
      }

      setStatementItems(combined);
    } catch {
      setStatementItems([]);
      setToast('Erro ao carregar detalhes do extrato.');
    } finally {
      setLoadingStatement(false);
    }
  };

  const handleMarkAsPaid = useCallback(async (record) => {
    setPayingId(record.id);
    try {
      await payClosing(record.id);
      // Atualiza apenas o item localmente — sem recarregar a página
      setHistory((prev) =>
        prev.map((r) => r.id === record.id ? { ...r, status: 'PAGO' } : r)
      );
      setToast(`Fechamento de ${record.monthReference} marcado como Pago!`);
    } catch {
      setToast('Erro ao registrar pagamento. Tente novamente.');
    } finally {
      setPayingId(null);
    }
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur border-b border-zinc-800 px-4 lg:px-8 py-4 flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg p-1.5 transition-colors"
            aria-label="Voltar"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-base lg:text-lg font-semibold text-zinc-100">
              {pilot ? `Histórico — ${pilot.name}` : 'Histórico de Fechamentos'}
            </h1>
            {pilot?.category && (
              <p className="text-xs text-zinc-500">{pilot.category}</p>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 px-4 lg:px-8 py-6 pb-28 lg:pb-8">
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
          ) : history.length === 0 ? (
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

                return (
                  <div key={record.id} className="glass-card p-5 transition-all duration-200">
                    <div className="cursor-pointer" onClick={() => toggleMonth(record)}>
                      {/* Month + status */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={15} className="text-emerald-400" />
                          <span className="text-sm font-semibold text-zinc-200 capitalize">
                            {record.monthReference}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={record.status ?? 'PENDENTE'} />
                          {isPending && (
                            <button
                              onClick={(e) => { e.stopPropagation(); handleMarkAsPaid(record); }}
                              disabled={isPayingThis}
                              className="btn-pay flex items-center gap-1 disabled:opacity-60"
                              title="Marcar como Pago"
                            >
                              <CheckSquare size={12} />
                              {isPayingThis ? 'Salvando…' : '✔ Marcar como Pago'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Values grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-zinc-800/60 rounded-xl p-3">
                          <div className="flex items-center gap-1 mb-1">
                            <DollarSign size={11} className="text-zinc-500" />
                            <p className="text-xs text-zinc-500">Mensalidade</p>
                          </div>
                          <p className="text-sm font-medium text-zinc-300">{formatBRL(record.baseFee)}</p>
                        </div>
                        <div className="bg-zinc-800/60 rounded-xl p-3">
                          <div className="flex items-center gap-1 mb-1">
                            <TrendingUp size={11} className="text-red-500" />
                            <p className="text-xs text-zinc-500">Gastos Extras</p>
                          </div>
                          <p className="text-sm font-medium text-red-400">{formatBRL(record.totalExpenses)}</p>
                        </div>
                        <div className="bg-zinc-800/60 rounded-xl p-3">
                          <div className="flex items-center gap-1 mb-1">
                            <TrendingDown size={11} className="text-emerald-500" />
                            <p className="text-xs text-zinc-500">Reembolsos</p>
                          </div>
                          <p className="text-sm font-medium text-emerald-400">{formatBRL(record.totalReimbursements)}</p>
                        </div>
                        <div className="bg-zinc-800/60 rounded-xl p-3">
                          <p className="text-xs text-zinc-500 mb-1">Total Final</p>
                          <p className="text-sm font-bold text-emerald-400">{formatBRL(record.totalAmount)}</p>
                        </div>
                      </div>

                      {record.createdAt && (
                        <p className="text-xs text-zinc-600 mt-3">
                          Fechado em {formatDate(record.createdAt)}
                        </p>
                      )}
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
                            {/* Base Fee */}
                            <div className="flex justify-between items-center bg-zinc-800/40 p-3 rounded-lg border border-zinc-700/50">
                              <div className="flex items-center gap-2">
                                <DollarSign size={14} className="text-zinc-400" />
                                <span className="text-sm text-zinc-300">Mensalidade Fixa</span>
                              </div>
                              <span className="text-sm font-medium text-zinc-300">{formatBRL(record.baseFee)}</span>
                            </div>

                            {/* Chronological List */}
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
        </div>
      </main>

      {/* Toast de sucesso */}
      {toast && <Toast message={toast} onDismiss={() => setToast('')} />}

      <BottomNav />
    </div>
  );
}
