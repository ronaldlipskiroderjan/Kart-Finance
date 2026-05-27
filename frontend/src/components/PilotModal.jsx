import { useState, useEffect, useCallback, useRef } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Badge from './ui/Badge';
import CommHistoryModal from './CommHistoryModal';
import {
  getMonthlySummary, finalizeClosing,
  createExpense, createReimbursement, deleteExpense, deleteReimbursement, deletePilot,
  getPilotRaceEntries, payRaceEntry,
} from '../services/api';
import { formatBRL, formatDate, formatMonthLabel, currentYearMonth } from '../utils/formatters';
import { getActiveBillingMonth, isSameMonth } from '../utils/billing';
import {
  PlusCircle, MinusCircle, CheckSquare, BarChart2, Trash2, History,
  AlertTriangle, Pencil, X, MessageCircle, Calendar,
  ChevronLeft, ChevronRight, Flag, CheckCircle2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCommHistory } from '../context/CommHistoryContext';

const TABS = [
  { id: 'summary', label: 'Resumo', icon: BarChart2 },
  { id: 'expense', label: 'Gasto', icon: PlusCircle },
  { id: 'reimbursement', label: 'Reembolso', icon: MinusCircle },
  { id: 'close', label: 'Fechar Mês', icon: CheckSquare },
];

export default function PilotModal({ pilot, isOpen, onClose, onRefresh, onEdit }) {
  const navigate = useNavigate();
  const { user, globalPixKey } = useAuth();
  const { addEntry } = useCommHistory();

  const [activeTab, setActiveTab] = useState('summary');
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');

  const [expForm, setExpForm] = useState({ description: '', amount: '' });
  const [expLoading, setExpLoading] = useState(false);
  const [expMsg, setExpMsg] = useState('');

  const [rmbForm, setRmbForm] = useState({ description: '', amount: '' });
  const [rmbLoading, setRmbLoading] = useState(false);
  const [rmbMsg, setRmbMsg] = useState('');

  const [closeLoading, setCloseLoading] = useState(false);
  const [closeMsg, setCloseMsg] = useState('');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  const [deleteLoading, setDeleteLoading] = useState(false);

  const [showCommHistory, setShowCommHistory] = useState(false);

  const [raceEntries, setRaceEntries] = useState([]);
  const [payingRaceId, setPayingRaceId] = useState(null);

  const [activeYear, setActiveYear] = useState(() => currentYearMonth().year);
  const [activeMonth, setActiveMonth] = useState(() => currentYearMonth().month);
  const skipAutoAdvanceRef = useRef(false);

  const monthLabel = formatMonthLabel(activeYear, activeMonth);
  const isAtCurrentMonth = isSameMonth(activeYear, activeMonth);

  // Navigation limits
  // Forward cap: active billing month (may be ahead of calendar if month was manually closed)
  const { year: billingYear, month: billingMonth } = pilot ? getActiveBillingMonth(pilot) : { year: activeYear, month: activeMonth };
  const isAtActiveBillingMonth = activeYear === billingYear && activeMonth === billingMonth;

  // Backward limit: pilot's creation month
  const _createdAt = pilot ? new Date(pilot.createdAt || pilot.CreatedAt) : null;
  const creationYear  = _createdAt ? _createdAt.getFullYear() : activeYear;
  const creationMonth = _createdAt ? _createdAt.getMonth() + 1 : activeMonth;
  const isAtOrBeforeCreation =
    activeYear < creationYear ||
    (activeYear === creationYear && activeMonth <= creationMonth);

  // Fetch summary for an explicit year/month
  const fetchSummary = useCallback(async (year, month) => {
    if (!pilot) return;
    setLoadingSummary(true);
    setSummaryError('');
    try {
      const res = await getMonthlySummary(pilot.id, year, month);
      setSummary(res.data);
    } catch {
      setSummaryError('Não foi possível carregar o resumo.');
    } finally {
      setLoadingSummary(false);
    }
  }, [pilot]);

  // When pilot changes: set smart month and reset form state
  useEffect(() => {
    if (!pilot) return;
    if (skipAutoAdvanceRef.current) {
      skipAutoAdvanceRef.current = false;
      return;
    }
    const { year, month } = getActiveBillingMonth(pilot);
    setActiveYear(year);
    setActiveMonth(month);
    setActiveTab('summary');
    setExpMsg('');
    setRmbMsg('');
    setCloseMsg('');
    setShowCloseConfirm(false);
  }, [pilot?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch race entries whenever the modal opens for a pilot
  useEffect(() => {
    if (!isOpen || !pilot) return;
    getPilotRaceEntries(pilot.id)
      .then(res => setRaceEntries(res.data ?? []))
      .catch(() => setRaceEntries([]));
  }, [isOpen, pilot?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch when modal opens or month/tab changes
  useEffect(() => {
    if (isOpen && (activeTab === 'summary' || activeTab === 'close')) {
      fetchSummary(activeYear, activeMonth);
    }
  }, [isOpen, fetchSummary, activeTab, activeYear, activeMonth]);

  // Is the currently viewed month already closed?
  const activeMonthRef = `${activeYear}/${String(activeMonth).padStart(2, '0')}`;
  const isMonthClosed = (pilot?.closingHistories || []).some(
    h => (h.monthReference || h.MonthReference) === activeMonthRef
  );

  // When navigating to a closed month, force Resumo tab
  useEffect(() => {
    if (isMonthClosed && activeTab !== 'summary') {
      setActiveTab('summary');
    }
  }, [isMonthClosed, activeTab]);

  // Month navigation
  const goToPrevMonth = () => {
    if (isAtOrBeforeCreation) return; // não vai antes do mês de criação do piloto
    let m = activeMonth - 1, y = activeYear;
    if (m < 1) { m = 12; y--; }
    setActiveYear(y);
    setActiveMonth(m);
  };

  const goToNextMonth = () => {
    if (isAtActiveBillingMonth) return; // não passa do mês em aberto
    let m = activeMonth + 1, y = activeYear;
    if (m > 12) { m = 1; y++; }
    setActiveYear(y);
    setActiveMonth(m);
  };

  if (!pilot) return null;

  const handleExpense = async (e) => {
    e.preventDefault();
    setExpLoading(true); setExpMsg('');
    try {
      await createExpense({ pilot: { id: pilot.id }, description: expForm.description, amount: parseFloat(expForm.amount), year: activeYear, month: activeMonth });
      setExpMsg('✅ Gasto adicionado com sucesso!');
      setExpForm({ description: '', amount: '' });
      onRefresh();
      if (activeTab === 'summary') fetchSummary();
    } catch {
      setExpMsg('❌ Erro ao adicionar gasto.');
    } finally { setExpLoading(false); }
  };

  const handleReimbursement = async (e) => {
    e.preventDefault();
    setRmbLoading(true); setRmbMsg('');
    try {
      await createReimbursement({ pilot: { id: pilot.id }, description: rmbForm.description, amount: parseFloat(rmbForm.amount), year: activeYear, month: activeMonth });
      setRmbMsg('✅ Reembolso adicionado com sucesso!');
      setRmbForm({ description: '', amount: '' });
      onRefresh();
    } catch {
      setRmbMsg('❌ Erro ao adicionar reembolso.');
    } finally { setRmbLoading(false); }
  };

  const handleCloseMonth = async () => {
    setCloseLoading(true); setCloseMsg('');
    try {
      await finalizeClosing(pilot.id, activeYear, activeMonth);
      setCloseMsg(`✅ Mês ${monthLabel} fechado com sucesso!`);
      setShowCloseConfirm(false);
      skipAutoAdvanceRef.current = true;
      onRefresh();
    } catch (err) {
      const errMsg = err.response?.data?.error ?? err.response?.data ?? 'Erro ao fechar mês.';
      setCloseMsg(`❌ ${errMsg}`);
      setShowCloseConfirm(false);
    } finally { setCloseLoading(false); }
  };

  const handlePayRaceEntry = async (entry) => {
    setPayingRaceId(entry.id);
    try {
      await payRaceEntry(entry.id);
      setRaceEntries(prev => prev.map(e => e.id === entry.id ? { ...e, status: 'PAGO' } : e));
    } catch {
      // silencioso — o badge continua mostrando o estado antigo
    } finally {
      setPayingRaceId(null);
    }
  };

  const handleSendRaceWhatsApp = (entry) => {
    const raceName = entry.raceWeekend?.name ?? 'Corrida';
    const raceDate = entry.raceWeekend?.date
      ? new Date(entry.raceWeekend.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
      : '';
    const extras = entry.Extras ?? [];
    const totalExtras = extras.reduce((sum, ex) => sum + (ex.Amount ?? 0), 0);
    const totalAmount = (entry.amount ?? entry.Amount ?? 0) + totalExtras;
    const lines = [
      `📋 *Fatura RA Kart Racing — ${pilot.name}*`,
      `📅 Evento: ${raceName}`,
      ...(raceDate ? [`🗓️ Data: ${raceDate}`] : []),
      ``,
      `🏎️ Corrida: ${formatBRL(entry.amount ?? entry.Amount)}`,
      ...(extras.length > 0 ? [
        ``,
        `📋 *Extras:*`,
        ...extras.map(ex => `  + ${ex.Description}: ${formatBRL(ex.Amount)}`),
        ``,
        `📈 *Subtotal extras: +${formatBRL(totalExtras)}*`,
      ] : []),
      ``,
      `✅ *Total a pagar: ${formatBRL(totalAmount)}*`,
      ...(globalPixKey ? [
        ``,
        `🔑 *Chave PIX:* ${globalPixKey.trim()}`,
        `_(Por favor, envie o comprovante após o pagamento)_`,
      ] : []),
    ];
    addEntry({ pilotId: pilot.id, pilotName: pilot.name, message: lines.join('\n'), amount: totalAmount, monthLabel: raceName });
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };

  const handleDelete = async () => {
    if (!window.confirm(`Excluir permanentemente o piloto "${pilot.name}"?`)) return;
    setDeleteLoading(true);
    try {
      await deletePilot(pilot.id);
      onClose();
      onRefresh();
    } catch {
      alert('Erro ao excluir piloto.');
    } finally { setDeleteLoading(false); }
  };

  const getWhatsAppMessageLines = () => {
    if (!summary) return [];
    const finalAmount = summary.finalAmount ?? summary.totalAmount;
    const netExpenses = (summary.totalExpenses ?? 0) - (summary.totalReimbursements ?? 0);
    const debt = summary.previousDebt ?? 0;

    const expensesDetail = (pilot.expenses || []).filter(e => {
      const d = new Date(e.createdAt);
      return d.getFullYear() === activeYear && d.getMonth() + 1 === activeMonth;
    });
    const reimbursementsDetail = (pilot.reimbursements || []).filter(r => {
      const d = new Date(r.createdAt);
      return d.getFullYear() === activeYear && d.getMonth() + 1 === activeMonth;
    });

    const hasExtras = expensesDetail.length > 0 || reimbursementsDetail.length > 0;

    return [
      `📋 *Fatura RA Kart Racing — ${pilot.name}*`,
      `📅 Período: ${monthLabel}`,
      ``,
      `💰 Mensalidade: ${formatBRL(summary.baseFee)}`,
      ...(hasExtras ? [
        ``,
        `📋 *Extras:*`,
        ...expensesDetail.map(e => `  + ${e.description}: ${formatBRL(e.amount)}`),
        ...reimbursementsDetail.map(r => `  - ${r.description}: ${formatBRL(r.amount)}`),
        ``,
        `📈 *Subtotal extras: ${netExpenses > 0 ? '+' : ''}${formatBRL(netExpenses)}*`,
      ] : []),
      ...(debt > 0 ? [
        ``,
        `🚨 *ATENÇÃO*: O valor total está mais alto devido ao atraso de ${summary.unpaidMonthsCount || 1} mês(es) anterior(es).`,
        `⚠️ Dívida Acumulada: ${formatBRL(debt)}`
      ] : []),
      ``,
      `✅ *Total a pagar: ${formatBRL(finalAmount)}*`,
      ...(globalPixKey ? [
        ``,
        `🔑 *Chave PIX:* ${globalPixKey.trim()}`,
        `_(Por favor, envie o comprovante após o pagamento)_`
      ] : [])
    ];
  };

  const handleSendWhatsApp = () => {
    const lines = getWhatsAppMessageLines();
    if (!lines.length) return;
    const finalAmount = summary ? (summary.finalAmount ?? summary.totalAmount) : 0;
    addEntry({
      pilotId: pilot.id,
      pilotName: pilot.name,
      message: lines.join('\n'),
      amount: finalAmount,
      monthLabel,
    });
    const text = encodeURIComponent(lines.join('\n'));
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const finalAmount = summary ? (summary.finalAmount ?? summary.totalAmount) : 0;

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="" size="lg">
        {/* Pilot header */}
        <div className="flex items-start justify-between gap-2 mb-5 -mt-1">
          {/* Nome + badges — min-w-0 garante truncate em telas estreitas */}
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-zinc-100 truncate">{pilot.name}</h2>
            <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
              {pilot.category &&
                pilot.category.split(',').map((c) => c.trim()).filter(Boolean).map((cat) => (
                  <Badge key={cat} label={cat} />
                ))}
              {pilot.status && (
                <Badge
                  label={pilot.status === 'ATRASADO' ? 'Em Atraso' : pilot.status === 'PENDENTE' ? 'Pendente' : 'Em Dia'}
                  color={pilot.status === 'ATRASADO' ? 'red' : pilot.status === 'PENDENTE' ? 'amber' : 'green'}
                />
              )}
              {pilot.closingDay && (
                <div className="flex items-center gap-1 text-xs text-zinc-500">
                  <Calendar size={12} />
                  <span>Dia {pilot.closingDay}</span>
                </div>
              )}
            </div>
          </div>
          {/* Botões de ação — shrink-0 impede que sejam comprimidos */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              onClick={() => setShowCommHistory(true)}
              className="text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded-lg p-2 transition-colors"
              title="Histórico de cobranças"
            >
              <MessageCircle size={15} />
            </button>
            <button
              onClick={() => { onClose(); onEdit(pilot); }}
              className="text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg p-2 transition-colors"
              title="Editar piloto"
            >
              <Pencil size={15} />
            </button>
            <button
              onClick={() => { onClose(); navigate(`/history/${pilot.id}`); }}
              className="text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded-lg p-2 transition-colors"
              title="Ver histórico"
            >
              <History size={15} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="text-zinc-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg p-2 transition-colors"
              title="Excluir piloto"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>

        {/* Month navigator + status — visible on all tabs */}
        {(() => {
          const activeMonthRef = `${activeYear}/${String(activeMonth).padStart(2, '0')}`;
          const monthHistory = (pilot.closingHistories || []).find(
            h => (h.monthReference || h.MonthReference) === activeMonthRef
          );
          const monthStatus = monthHistory?.status;
          const statusMap = {
            PAGO:     { label: 'Pago',      cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' },
            PENDENTE: { label: 'Pendente',  cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/30' },
            ATRASADO: { label: 'Atrasado',  cls: 'bg-red-500/15 text-red-400 border border-red-500/30' },
          };
          const cfg = monthStatus ? statusMap[monthStatus] : null;
          return (
            <div className="flex items-center justify-between mb-4 bg-zinc-800/40 rounded-xl px-2 py-1.5">
              <button
                onClick={goToPrevMonth}
                disabled={isAtOrBeforeCreation}
                className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                aria-label="Mês anterior"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-zinc-300 capitalize">{monthLabel}</span>
                {cfg ? (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${cfg.cls}`}>
                    {cfg.label}
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-zinc-500 px-2 py-0.5 rounded-full bg-zinc-700/50">
                    Em aberto
                  </span>
                )}
              </div>
              <button
                onClick={goToNextMonth}
                disabled={isAtActiveBillingMonth}
                className="p-1.5 rounded-lg hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                aria-label="Próximo mês"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          );
        })()}

        {/* Tabs — mês fechado: só Resumo */}
        {!isMonthClosed && (
          <div className="flex bg-zinc-800/60 rounded-xl p-1 mb-5 gap-0.5">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); if (tab.id === 'summary' || tab.id === 'close') fetchSummary(); }}
                  className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1
                              py-2 px-0.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-200 ${
                    isActive ? 'bg-zinc-900 text-emerald-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  <Icon size={14} className="shrink-0" />
                  <span className="truncate leading-tight">{tab.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* ── SUMMARY TAB ── */}
        {activeTab === 'summary' && (
          <div>
            {loadingSummary && <p className="text-zinc-500 text-sm">Carregando…</p>}
            {summaryError && <p className="text-red-400 text-sm">{summaryError}</p>}
            {summary && !loadingSummary && (() => {
              const expensesDetail = (pilot.expenses || []).filter(e => {
                const d = new Date(e.createdAt);
                return d.getFullYear() === activeYear && d.getMonth() + 1 === activeMonth;
              });
              const reimbursementsDetail = (pilot.reimbursements || []).filter(r => {
                const d = new Date(r.createdAt);
                return d.getFullYear() === activeYear && d.getMonth() + 1 === activeMonth;
              });
              const netExpenses = (summary.totalExpenses ?? 0) - (summary.totalReimbursements ?? 0);
              return (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-zinc-800/60 rounded-xl p-3">
                      <p className="text-xs text-zinc-500 mb-1">Mensalidade</p>
                      <p className="text-sm font-semibold text-zinc-300">{formatBRL(summary.baseFee)}</p>
                    </div>
                    <div className="bg-zinc-800/60 rounded-xl p-3">
                      <p className="text-xs text-zinc-500 mb-1">Gastos Extras</p>
                      <p className={`text-sm font-semibold ${netExpenses > 0 ? 'text-red-400' : netExpenses < 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                        {netExpenses > 0 ? '+' : ''}{formatBRL(netExpenses)}
                      </p>
                    </div>
                  </div>

                  {(summary.previousDebt ?? 0) > 0 && (
                    <div className="flex items-center justify-between bg-orange-900/20 rounded-xl px-4 py-3 border border-orange-700/30">
                      <div className="text-xs text-orange-400 font-medium flex items-center gap-1.5">
                        <span className="text-sm">⚠</span> Dívida Acumulada ({summary.unpaidMonthsCount || 1} mês/meses)
                      </div>
                      <p className="text-base font-semibold text-orange-400">+{formatBRL(summary.previousDebt)}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 bg-zinc-800/80 rounded-xl px-4 py-3 border border-zinc-700/50">
                    <div className="flex flex-wrap items-center gap-x-1 gap-y-0.5 text-xs text-zinc-400 min-w-0">
                      <span className="text-zinc-500">Mensalidade</span>
                      <span className="text-zinc-600">+</span>
                      <span className="text-red-400">Extras</span>
                      {(summary.previousDebt ?? 0) > 0 && (
                        <><span className="text-zinc-600">+</span><span className="text-orange-400">Dívida</span></>
                      )}
                    </div>
                    <p className="text-base font-bold text-emerald-400 shrink-0">{formatBRL(finalAmount)}</p>
                  </div>

                  {/* Corridas — filtradas pelo mês ativo */}
                  {(() => {
                    const racesForMonth = raceEntries.filter(entry => {
                      if (!entry.raceWeekend?.date) return false;
                      const d  = new Date(entry.raceWeekend.date);
                      const rY = d.getUTCFullYear();
                      const rM = d.getUTCMonth() + 1;
                      // Corrida deste mês: sempre mostra (qualquer status)
                      const isThisMonth = rY === activeYear && rM === activeMonth;
                      // Corrida de mês anterior ainda não paga: carrega para frente
                      const isCarryForward =
                        (rY < activeYear || (rY === activeYear && rM < activeMonth)) &&
                        entry.status !== 'PAGO';
                      return isThisMonth || isCarryForward;
                    });
                    if (racesForMonth.length === 0) return null;
                    return (
                      <div>
                        <p className="text-xs text-zinc-500 font-medium mb-2 flex items-center gap-1.5">
                          <Flag size={11} className="text-emerald-400" />
                          Corridas
                        </p>
                        <div className="space-y-2">
                          {racesForMonth.map(entry => {
                            const isPaid = entry.status === 'PAGO';
                            return (
                              <div key={entry.id} className="flex items-center gap-2 bg-zinc-800/40 px-3 py-2 rounded-lg">
                                {/* Nome + status — min-w-0 garante truncate */}
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="text-sm text-zinc-300 truncate">{entry.raceWeekend?.name ?? 'Corrida'}</span>
                                  <span className={`text-xs mt-0.5 ${
                                    isPaid ? 'text-emerald-400' :
                                    entry.status === 'ATRASADO' ? 'text-red-400' : 'text-zinc-500'
                                  }`}>
                                    {isPaid ? '✓ Pago' : entry.status === 'ATRASADO' ? '⚠ Atrasado' : 'Pendente'}
                                  </span>
                                </div>
                                {/* Valor + ações — shrink-0 mantém no lugar */}
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-sm font-semibold text-zinc-200">{formatBRL(entry.amount)}</span>
                                  {!isPaid && (
                                    <>
                                      <button
                                        onClick={() => handleSendRaceWhatsApp(entry)}
                                        className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-700 transition-colors"
                                        title="Cobrar via WhatsApp"
                                      >
                                        <MessageCircle size={13} />
                                      </button>
                                      <button
                                        onClick={() => handlePayRaceEntry(entry)}
                                        disabled={payingRaceId === entry.id}
                                        className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-400 hover:bg-zinc-700 transition-colors disabled:opacity-40"
                                        title="Marcar como pago"
                                      >
                                        <CheckCircle2 size={13} />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Action buttons row */}
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600/15 hover:bg-emerald-500/25
                               text-emerald-400 border border-emerald-600/40 rounded-xl py-2.5 text-sm font-medium
                               transition-all duration-200 active:scale-95"
                  >
                    <MessageCircle size={15} />
                    Cobrar via WA
                  </button>

                  {expensesDetail?.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 font-medium mb-2">Gastos</p>
                      <div className="space-y-1.5">
                        {expensesDetail.map((e) => (
                          <div key={e.id} className="flex items-center gap-2 bg-zinc-800/40 px-3 py-2 rounded-lg">
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-sm text-zinc-300 truncate">{e.description}</span>
                              <span className="text-xs text-zinc-500">{formatDate(e.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm text-red-400 whitespace-nowrap">+{formatBRL(e.amount)}</span>
                              <button onClick={() => { deleteExpense(e.id).then(() => { fetchSummary(); onRefresh(); }); }}
                                className="text-zinc-600 hover:text-red-400 transition-colors" title="Remover">
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {reimbursementsDetail?.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 font-medium mb-2">Reembolsos</p>
                      <div className="space-y-1.5">
                        {reimbursementsDetail.map((r) => (
                          <div key={r.id} className="flex items-center gap-2 bg-zinc-800/40 px-3 py-2 rounded-lg">
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-sm text-zinc-300 truncate">{r.description}</span>
                              <span className="text-xs text-zinc-500">{formatDate(r.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-sm text-green-400 whitespace-nowrap">-{formatBRL(r.amount)}</span>
                              <button onClick={() => { deleteReimbursement(r.id).then(() => { fetchSummary(); onRefresh(); }); }}
                                className="text-zinc-600 hover:text-red-400 transition-colors" title="Remover">
                                <X size={13} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── EXPENSE TAB ── */}
        {activeTab === 'expense' && (
          <form onSubmit={handleExpense} className="space-y-4">
            <div>
              <label className="label">Descrição do Gasto</label>
              <input value={expForm.description} onChange={(e) => setExpForm(p => ({ ...p, description: e.target.value }))}
                className="input-field" placeholder="Ex: Troca de pneus" required />
            </div>
            <div>
              <label className="label">Valor (R$)</label>
              <input type="number" step="0.01" min="0.01" value={expForm.amount}
                onChange={(e) => setExpForm(p => ({ ...p, amount: e.target.value }))}
                className="input-field" placeholder="Ex: 350.00" required />
            </div>
            {expMsg && <p className="text-sm text-zinc-400">{expMsg}</p>}
            <Button type="submit" variant="primary" className="w-full" disabled={expLoading}>
              {expLoading ? 'Salvando…' : 'Adicionar Gasto'}
            </Button>
          </form>
        )}

        {/* ── REIMBURSEMENT TAB ── */}
        {activeTab === 'reimbursement' && (
          <form onSubmit={handleReimbursement} className="space-y-4">
            <div>
              <label className="label">Descrição do Reembolso</label>
              <input value={rmbForm.description} onChange={(e) => setRmbForm(p => ({ ...p, description: e.target.value }))}
                className="input-field" placeholder="Ex: Devolução de taxa" required />
            </div>
            <div>
              <label className="label">Valor (R$)</label>
              <input type="number" step="0.01" min="0.01" value={rmbForm.amount}
                onChange={(e) => setRmbForm(p => ({ ...p, amount: e.target.value }))}
                className="input-field" placeholder="Ex: 150.00" required />
            </div>
            {rmbMsg && <p className="text-sm text-zinc-400">{rmbMsg}</p>}
            <Button type="submit" variant="primary" className="w-full" disabled={rmbLoading}>
              {rmbLoading ? 'Salvando…' : 'Adicionar Reembolso'}
            </Button>
          </form>
        )}

        {/* ── CLOSE MONTH TAB ── */}
        {activeTab === 'close' && (() => {
          const isAlreadyClosed = isMonthClosed;
          return (
          <div className="space-y-5">
            {summary && (
              <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                <p className="text-xs text-zinc-500 mb-2 uppercase font-semibold">Prévia da Mensagem (WhatsApp)</p>
                <div className="bg-zinc-900/50 p-3 rounded-lg text-xs text-zinc-300 font-mono whitespace-pre-wrap break-words select-all max-h-40 overflow-y-auto">
                  {getWhatsAppMessageLines().join('\n')}
                </div>
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600/15 hover:bg-emerald-500/25
                             text-emerald-400 border border-emerald-600/40 rounded-xl py-2.5 text-sm font-medium
                             transition-all duration-200 active:scale-95 mt-3"
                >
                  <MessageCircle size={15} />
                  Enviar via WhatsApp
                </button>
              </div>
            )}

            <div className="bg-amber-900/20 border border-amber-700/40 rounded-xl p-4 flex gap-3">
              <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-300 mb-1">Atenção</p>
                <p className="text-xs text-amber-400/80">
                  Esta ação irá registrar o fechamento do mês de <strong>{monthLabel}</strong> para{' '}
                  <strong>{pilot.name}</strong>. Uma vez fechado, os valores ficam salvos no histórico.
                </p>
              </div>
            </div>

            {closeMsg && <p className="text-sm text-zinc-400">{closeMsg}</p>}

            {isAlreadyClosed ? (
              <div className="flex items-center gap-3 bg-emerald-900/20 border border-emerald-700/40 rounded-xl px-4 py-3.5">
                <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-300">Mês já fechado</p>
                  <p className="text-xs text-emerald-400/70 mt-0.5">
                    O fechamento de <strong>{monthLabel}</strong> já foi registrado. Consulte o histórico para detalhes.
                  </p>
                </div>
              </div>
            ) : !showCloseConfirm ? (
              <Button variant="danger" className="w-full" onClick={() => setShowCloseConfirm(true)}>
                Fechar Mês de {monthLabel}
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setShowCloseConfirm(false)}>Cancelar</Button>
                <Button variant="primary" className="flex-1" disabled={closeLoading} onClick={handleCloseMonth}>
                  {closeLoading ? 'Fechando…' : 'Confirmar'}
                </Button>
              </div>
            )}
          </div>
          );
        })()}
      </Modal>

      {/* Communication History Modal */}
      <CommHistoryModal
        isOpen={showCommHistory}
        onClose={() => setShowCommHistory(false)}
        pilot={pilot}
      />
    </>
  );
}
