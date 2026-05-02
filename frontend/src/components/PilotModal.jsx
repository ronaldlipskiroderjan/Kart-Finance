import { useState, useEffect, useCallback, useRef } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Badge from './ui/Badge';
import PIXQRModal from './PIXQRModal';
import CommHistoryModal from './CommHistoryModal';
import {
  getMonthlySummary, finalizeClosing,
  createExpense, createReimbursement, deleteExpense, deleteReimbursement, deletePilot,
} from '../services/api';
import { formatBRL, formatDate, formatMonthLabel, currentYearMonth } from '../utils/formatters';
import { getActiveBillingMonth, isSameMonth } from '../utils/billing';
import {
  PlusCircle, MinusCircle, CheckSquare, BarChart2, Trash2, History,
  AlertTriangle, Pencil, X, MessageCircle, Calendar, QrCode,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCommHistory } from '../context/CommHistoryContext';
import { generatePixPayload } from '../utils/pixQR';

const TABS = [
  { id: 'summary', label: 'Resumo', icon: BarChart2 },
  { id: 'expense', label: 'Gasto', icon: PlusCircle },
  { id: 'reimbursement', label: 'Reembolso', icon: MinusCircle },
  { id: 'close', label: 'Fechar Mês', icon: CheckSquare },
];

export default function PilotModal({ pilot, isOpen, onClose, onRefresh, onEdit }) {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const [showPIXModal, setShowPIXModal] = useState(false);
  const [showCommHistory, setShowCommHistory] = useState(false);

  const [activeYear, setActiveYear] = useState(() => currentYearMonth().year);
  const [activeMonth, setActiveMonth] = useState(() => currentYearMonth().month);
  const skipAutoAdvanceRef = useRef(false);

  const monthLabel = formatMonthLabel(activeYear, activeMonth);
  const isAtCurrentMonth = isSameMonth(activeYear, activeMonth);

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

  // Re-fetch when modal opens or month/tab changes
  useEffect(() => {
    if (isOpen && (activeTab === 'summary' || activeTab === 'close')) {
      fetchSummary(activeYear, activeMonth);
    }
  }, [isOpen, fetchSummary, activeTab, activeYear, activeMonth]);

  // Month navigation
  const goToPrevMonth = () => {
    let m = activeMonth - 1, y = activeYear;
    if (m < 1) { m = 12; y--; }
    setActiveYear(y);
    setActiveMonth(m);
  };

  const goToNextMonth = () => {
    if (isAtCurrentMonth) return;
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
      await createExpense({ pilot: { id: pilot.id }, description: expForm.description, amount: parseFloat(expForm.amount) });
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
      setCloseMsg(`❌ ${err.response?.data ?? 'Erro ao fechar mês.'}`);
      setShowCloseConfirm(false);
    } finally { setCloseLoading(false); }
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

    const pixPayload = user?.pixKey
      ? generatePixPayload({
          pixKey: user.pixKey,
          merchantName: user.name || 'RA Kart Racing',
          amount: finalAmount,
        })
      : null;

    return [
      `📋 *Fatura RA Kart Racing — ${pilot.name}*`,
      `📅 Período: ${monthLabel}`,
      ``,
      `💰 Mensalidade: ${formatBRL(summary.baseFee)}`,
      `📈 Gastos Extras: ${netExpenses > 0 ? '+' : ''}${formatBRL(netExpenses)}`,
      ...(debt > 0 ? [
        ``,
        `🚨 *ATENÇÃO*: O valor total está mais alto devido ao atraso de ${summary.unpaidMonthsCount || 1} mês(es) anterior(es).`,
        `⚠️ Dívida Acumulada: ${formatBRL(debt)}`
      ] : []),
      ``,
      `✅ *Total a pagar: ${formatBRL(finalAmount)}*`,
      ...(pixPayload ? [
        ``,
        `📲 *Código PIX (Copia e Cola):*`,
        pixPayload,
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
        <div className="flex items-start justify-between gap-3 mb-5 -mt-1">
          <div>
            <h2 className="text-xl font-bold text-zinc-100">{pilot.name}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              {pilot.category && <Badge label={pilot.category} />}
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
          <div className="flex items-center gap-1.5">
            {user?.pixKey && (
              <button
                onClick={() => setShowPIXModal(true)}
                className="text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg p-1.5 transition-colors"
                title="QR Code PIX"
              >
                <QrCode size={16} />
              </button>
            )}
            <button
              onClick={() => setShowCommHistory(true)}
              className="text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded-lg p-1.5 transition-colors"
              title="Histórico de cobranças"
            >
              <MessageCircle size={16} />
            </button>
            <button
              onClick={() => { onClose(); onEdit(pilot); }}
              className="text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800 rounded-lg p-1.5 transition-colors"
              title="Editar piloto"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={() => { onClose(); navigate(`/history/${pilot.id}`); }}
              className="text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 rounded-lg p-1.5 transition-colors"
              title="Ver histórico"
            >
              <History size={16} />
            </button>
            <button
              onClick={handleDelete}
              disabled={deleteLoading}
              className="text-zinc-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg p-1.5 transition-colors"
              title="Excluir piloto"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-zinc-800/60 rounded-xl p-1 mb-5 gap-0.5">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); if (tab.id === 'summary' || tab.id === 'close') fetchSummary(); }}
                className={`flex-1 flex flex-col sm:flex-row items-center gap-1 py-2 px-1 sm:px-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-zinc-900 text-emerald-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon size={15} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── SUMMARY TAB ── */}
        {activeTab === 'summary' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={goToPrevMonth}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                aria-label="Mês anterior"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="text-center">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{monthLabel}</p>
                {!isAtCurrentMonth && (
                  <p className="text-[9px] text-amber-400/70 mt-0.5">↑ período aberto</p>
                )}
              </div>
              <button
                onClick={goToNextMonth}
                disabled={isAtCurrentMonth}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                aria-label="Próximo mês"
              >
                <ChevronRight size={14} />
              </button>
            </div>
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

                  <div className="flex items-center justify-between bg-zinc-800/80 rounded-xl px-4 py-3 border border-zinc-700/50">
                    <div className="text-xs text-zinc-400">
                      <span className="text-zinc-500">Mensalidade</span>
                      <span className="text-zinc-600 mx-1">+</span>
                      <span className="text-red-400">Extras</span>
                      {(summary.previousDebt ?? 0) > 0 && (
                        <><span className="text-zinc-600 mx-1">+</span><span className="text-orange-400">Dívida</span></>
                      )}
                    </div>
                    <p className="text-base font-bold text-emerald-400">{formatBRL(finalAmount)}</p>
                  </div>

                  {/* Action buttons row */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleSendWhatsApp}
                      className="flex items-center justify-center gap-2 bg-emerald-600/15 hover:bg-emerald-500/25
                                 text-emerald-400 border border-emerald-600/40 rounded-xl py-2.5 text-sm font-medium
                                 transition-all duration-200 active:scale-95"
                    >
                      <MessageCircle size={15} />
                      Cobrar via WA
                    </button>
                    {user?.pixKey && (
                      <button
                        type="button"
                        onClick={() => setShowPIXModal(true)}
                        className="flex items-center justify-center gap-2 bg-blue-600/15 hover:bg-blue-500/25
                                   text-blue-400 border border-blue-600/40 rounded-xl py-2.5 text-sm font-medium
                                   transition-all duration-200 active:scale-95"
                      >
                        <QrCode size={15} />
                        QR Code PIX
                      </button>
                    )}
                  </div>

                  {expensesDetail?.length > 0 && (
                    <div>
                      <p className="text-xs text-zinc-500 font-medium mb-2">Gastos</p>
                      <div className="space-y-1.5">
                        {expensesDetail.map((e) => (
                          <div key={e.id} className="flex items-center justify-between bg-zinc-800/40 px-3 py-2 rounded-lg">
                            <div className="flex flex-col">
                              <span className="text-sm text-zinc-300">{e.description}</span>
                              <span className="text-xs text-zinc-500">{formatDate(e.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-red-400">+{formatBRL(e.amount)}</span>
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
                          <div key={r.id} className="flex items-center justify-between bg-zinc-800/40 px-3 py-2 rounded-lg">
                            <div className="flex flex-col">
                              <span className="text-sm text-zinc-300">{r.description}</span>
                              <span className="text-xs text-zinc-500">{formatDate(r.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-green-400">-{formatBRL(r.amount)}</span>
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
        {activeTab === 'close' && (
          <div className="space-y-5">
            {/* Month navigation */}
            <div className="flex items-center justify-between">
              <button
                onClick={goToPrevMonth}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                aria-label="Mês anterior"
              >
                <ChevronLeft size={14} />
              </button>
              <div className="text-center">
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">{monthLabel}</p>
                {!isAtCurrentMonth && (
                  <p className="text-[9px] text-amber-400/70 mt-0.5">↑ período aberto</p>
                )}
              </div>
              <button
                onClick={goToNextMonth}
                disabled={isAtCurrentMonth}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-25 disabled:cursor-not-allowed"
                aria-label="Próximo mês"
              >
                <ChevronRight size={14} />
              </button>
            </div>

            {summary && (
              <div className="bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/50">
                <p className="text-xs text-zinc-500 mb-2 uppercase font-semibold">Prévia da Mensagem (WhatsApp)</p>
                <div className="bg-zinc-900/50 p-3 rounded-lg text-sm text-zinc-300 font-mono whitespace-pre-wrap break-all select-all overflow-hidden">
                  {getWhatsAppMessageLines().join('\n')}
                </div>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleSendWhatsApp}
                    className="flex items-center justify-center gap-2 bg-emerald-600/15 hover:bg-emerald-500/25
                               text-emerald-400 border border-emerald-600/40 rounded-xl py-2.5 text-sm font-medium
                               transition-all duration-200 active:scale-95"
                  >
                    <MessageCircle size={15} />
                    Enviar via WhatsApp
                  </button>
                  {user?.pixKey && (
                    <button
                      type="button"
                      onClick={() => setShowPIXModal(true)}
                      className="flex items-center justify-center gap-2 bg-blue-600/15 hover:bg-blue-500/25
                                 text-blue-400 border border-blue-600/40 rounded-xl py-2.5 text-sm font-medium
                                 transition-all duration-200 active:scale-95"
                    >
                      <QrCode size={15} />
                      QR Code PIX
                    </button>
                  )}
                </div>
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

            {!showCloseConfirm ? (
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
        )}
      </Modal>

      {/* PIX QR Modal */}
      <PIXQRModal
        isOpen={showPIXModal}
        onClose={() => setShowPIXModal(false)}
        pixKey={user?.pixKey}
        merchantName={user?.name || 'RA Kart Racing'}
        amount={finalAmount}
        pilotName={pilot.name}
        monthLabel={monthLabel}
      />

      {/* Communication History Modal */}
      <CommHistoryModal
        isOpen={showCommHistory}
        onClose={() => setShowCommHistory(false)}
        pilot={pilot}
      />
    </>
  );
}
