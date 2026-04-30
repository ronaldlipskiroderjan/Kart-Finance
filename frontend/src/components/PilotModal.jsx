import { useState, useEffect, useCallback } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Badge from './ui/Badge';
import {
  getMonthlySummary,
  getPilotHistory,
  finalizeClosing,
  createExpense,
  createReimbursement,
  deleteExpense,
  deleteReimbursement,
  deletePilot,
} from '../services/api';
import { formatBRL, formatDate, formatMonthLabel, currentYearMonth } from '../utils/formatters';
import {
  PlusCircle, MinusCircle, CheckSquare, BarChart2, Trash2, History,
  AlertTriangle, Pencil, X, MessageCircle, Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const TABS = [
  { id: 'summary', label: 'Resumo', icon: BarChart2 },
  { id: 'expense', label: 'Gasto', icon: PlusCircle },
  { id: 'reimbursement', label: 'Reembolso', icon: MinusCircle },
  { id: 'close', label: 'Fechar Mês', icon: CheckSquare },
];

export default function PilotModal({ pilot, isOpen, onClose, onRefresh, onEdit }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('summary');
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [isMonthPaid, setIsMonthPaid] = useState(false);

  // Expense form
  const [expForm, setExpForm] = useState({ description: '', amount: '' });
  const [expLoading, setExpLoading] = useState(false);
  const [expMsg, setExpMsg] = useState('');

  // Reimbursement form
  const [rmbForm, setRmbForm] = useState({ description: '', amount: '' });
  const [rmbLoading, setRmbLoading] = useState(false);
  const [rmbMsg, setRmbMsg] = useState('');

  // Close month
  const [closeLoading, setCloseLoading] = useState(false);
  const [closeMsg, setCloseMsg] = useState('');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // Delete pilot
  const [deleteLoading, setDeleteLoading] = useState(false);

  const { year, month } = currentYearMonth();
  const monthLabel = formatMonthLabel(year, month);

  const fetchSummary = useCallback(async () => {
    if (!pilot) return;
    setLoadingSummary(true);
    setSummaryError('');
    try {
      const res = await getMonthlySummary(pilot.id, year, month);
      
      const hRes = await getPilotHistory(pilot.id);
      const monthRef = `${year}/${month.toString().padStart(2, '0')}`;
      const historyRecord = hRes.data?.find(h => h.monthReference === monthRef);
      
      const isPaid = historyRecord && historyRecord.status === 'PAGO';
      setIsMonthPaid(!!isPaid);

      if (isPaid) {
        setSummary({
          ...res.data,
          totalExpenses: 0,
          totalReimbursements: 0,
          totalAmount: res.data.baseFee,
          previousDebt: 0
        });
      } else {
        setSummary(res.data);
      }
    } catch {
      setSummaryError('Não foi possível carregar o resumo.');
    } finally {
      setLoadingSummary(false);
    }
  }, [pilot, year, month]);

  useEffect(() => {
    if (isOpen && activeTab === 'summary') fetchSummary();
  }, [isOpen, fetchSummary, activeTab]);

  // Reset on pilot change
  useEffect(() => {
    setActiveTab('summary');
    setExpMsg('');
    setRmbMsg('');
    setCloseMsg('');
    setShowCloseConfirm(false);
    setIsMonthPaid(false);
  }, [pilot?.id]);

  if (!pilot) return null;

  // ── Expense submit ─────────────────────────────
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

  // ── Reimbursement submit ───────────────────────
  const handleReimbursement = async (e) => {
    e.preventDefault();
    setRmbLoading(true); setRmbMsg('');
    try {
      await createReimbursement({ pilot: { id: pilot.id }, description: rmbForm.description, amount: parseFloat(rmbForm.amount) });
      setRmbMsg('✅ Reembolso adicionado com sucesso!');
      setRmbForm({ description: '', amount: '' });
      onRefresh();
    } catch {
      setRmbMsg('❌ Erro ao adicionar reembolso.');
    } finally { setRmbLoading(false); }
  };

  // ── Close month ────────────────────────────────
  const handleCloseMonth = async () => {
    setCloseLoading(true); setCloseMsg('');
    try {
      await finalizeClosing(pilot.id, year, month);
      setCloseMsg(`✅ Mês ${monthLabel} fechado com sucesso!`);
      setShowCloseConfirm(false);
      onRefresh();
    } catch (err) {
      setCloseMsg(`❌ ${err.response?.data ?? 'Erro ao fechar mês.'}`);
      setShowCloseConfirm(false);
    } finally { setCloseLoading(false); }
  };

  // ── Delete pilot ───────────────────────────────
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="lg">
      {/* Pilot header */}
      <div className="flex items-start justify-between gap-3 mb-5 -mt-1">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">{pilot.name}</h2>
          <div className="flex items-center gap-2 mt-1.5">
            {pilot.category && <Badge label={pilot.category} />}
            {pilot.closingDay && (
              <div className="flex items-center gap-1 text-xs text-zinc-500">
                <Calendar size={12} />
                <span>Dia {pilot.closingDay}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
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
              onClick={() => { setActiveTab(tab.id); if (tab.id === 'summary') fetchSummary(); }}
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
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-medium">
              {monthLabel}
            </p>
            {isMonthPaid && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-600/30">
                <CheckSquare size={11} /> Pago
              </span>
            )}
          </div>
          {loadingSummary && <p className="text-zinc-500 text-sm">Carregando…</p>}
          {summaryError && <p className="text-red-400 text-sm">{summaryError}</p>}
          {summary && !loadingSummary && (
            <div className="space-y-4">
              {(() => {
                const expensesDetail = isMonthPaid ? [] : (pilot.expenses || []).filter(e => {
                  const d = new Date(e.createdAt);
                  return d.getFullYear() === year && d.getMonth() + 1 === month;
                });
                const reimbursementsDetail = isMonthPaid ? [] : (pilot.reimbursements || []).filter(r => {
                  const d = new Date(r.createdAt);
                  return d.getFullYear() === year && d.getMonth() + 1 === month;
                });
                const finalAmount = summary.totalAmount ?? summary.finalAmount;
                return (
                  <>
                    {/* Breakdown cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                <div className="bg-zinc-800/60 rounded-xl p-3">
                  <p className="text-xs text-zinc-500 mb-1">Mensalidade</p>
                  <p className="text-sm font-semibold text-zinc-300">{formatBRL(summary.baseFee)}</p>
                </div>
                <div className="bg-zinc-800/60 rounded-xl p-3">
                  <p className="text-xs text-zinc-500 mb-1">Gastos Extras</p>
                  <p className="text-sm font-semibold text-red-400">{formatBRL(summary.totalExpenses)}</p>
                </div>
                <div className="bg-zinc-800/60 rounded-xl p-3">
                  <p className="text-xs text-zinc-500 mb-1">Reembolsos</p>
                  <p className="text-sm font-semibold text-emerald-400">-{formatBRL(summary.totalReimbursements)}</p>
                </div>
                {/* Dívida Anterior */}
                {(summary.previousDebt ?? 0) > 0 && (
                  <div className="bg-orange-900/30 border border-orange-700/40 rounded-xl p-3">
                    <p className="text-xs text-orange-400 mb-1">⚠ Dívida Anterior</p>
                    <p className="text-sm font-semibold text-orange-400">+{formatBRL(summary.previousDebt)}</p>
                  </div>
                )}
              </div>

              {/* Divider + Total */}
              <div className="flex items-center justify-between bg-zinc-800/80 rounded-xl px-4 py-3 border border-zinc-700/50">
                <div className="text-xs text-zinc-400">
                  <span className="text-zinc-500">Mensalidade</span>
                  <span className="text-zinc-600 mx-1">+</span>
                  <span className="text-red-400">Extras</span>
                  <span className="text-zinc-600 mx-1">−</span>
                  <span className="text-emerald-400">Reemb.</span>
                  {(summary.previousDebt ?? 0) > 0 && (
                    <><span className="text-zinc-600 mx-1">+</span><span className="text-orange-400">Dívida</span></>
                  )}
                </div>
                <p className="text-base font-bold text-emerald-400">{formatBRL(finalAmount)}</p>
              </div>

              {/* WhatsApp CTA */}
              <button
                type="button"
                onClick={() => {
                  const debt = summary.previousDebt ?? 0;
                  const lines = [
                    `📋 *Fatura RA Kart Racing — ${pilot.name}*`,
                    `📅 Período: ${monthLabel}`,
                    ``,
                    `💰 Mensalidade: ${formatBRL(summary.baseFee)}`,
                    `📈 Gastos Extras: ${formatBRL(summary.totalExpenses)}`,
                    `📉 Reembolsos: -${formatBRL(summary.totalReimbursements)}`,
                    ...(debt > 0 ? [`⚠️ Dívida Anterior: ${formatBRL(debt)}`] : []),
                    ``,
                    `✅ *Total a pagar: ${formatBRL(finalAmount)}*`,
                  ];
                  const text = encodeURIComponent(lines.join('\n'));
                  window.open(`https://wa.me/?text=${text}`, '_blank');
                }}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600/15 hover:bg-emerald-500/25 
                           text-emerald-400 border border-emerald-600/40 rounded-xl py-2.5 text-sm font-medium 
                           transition-all duration-200 active:scale-95"
              >
                <MessageCircle size={16} />
                📲 Cobrar via WhatsApp
              </button>

              {/* Expenses detail */}
              {expensesDetail?.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 font-medium mb-2">Gastos</p>
                  <div className="space-y-1.5">
                    {expensesDetail.map((e) => (
                      <div key={e.id} className="flex items-center justify-between bg-zinc-800/40 px-3 py-2 rounded-lg">
                        <span className="text-sm text-zinc-300">{e.description}</span>
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

              {/* Reimbursements detail */}
              {reimbursementsDetail?.length > 0 && (
                <div>
                  <p className="text-xs text-zinc-500 font-medium mb-2">Reembolsos</p>
                  <div className="space-y-1.5">
                    {reimbursementsDetail.map((r) => (
                      <div key={r.id} className="flex items-center justify-between bg-zinc-800/40 px-3 py-2 rounded-lg">
                        <span className="text-sm text-zinc-300">{r.description}</span>
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
                  </>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* ── EXPENSE TAB ── */}
      {activeTab === 'expense' && (
        isMonthPaid ? (
          <div className="text-center py-8">
            <p className="text-sm text-zinc-400">Este mês já foi fechado e pago.</p>
          </div>
        ) : (
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
        )
      )}

      {/* ── REIMBURSEMENT TAB ── */}
      {activeTab === 'reimbursement' && (
        isMonthPaid ? (
          <div className="text-center py-8">
            <p className="text-sm text-zinc-400">Este mês já foi fechado e pago.</p>
          </div>
        ) : (
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
        )
      )}

      {/* ── CLOSE MONTH TAB ── */}
      {activeTab === 'close' && (
        isMonthPaid ? (
          <div className="text-center py-8">
            <p className="text-sm text-zinc-400">Este mês já foi fechado e pago.</p>
          </div>
        ) : (
          <div className="space-y-5">
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
              <Button
                variant="danger"
                className="w-full"
                onClick={() => setShowCloseConfirm(true)}
              >
                Fechar Mês de {monthLabel}
              </Button>
            ) : (
              <div className="flex gap-3">
                <Button variant="secondary" className="flex-1" onClick={() => setShowCloseConfirm(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" className="flex-1" disabled={closeLoading} onClick={handleCloseMonth}>
                  {closeLoading ? 'Fechando…' : 'Confirmar'}
                </Button>
              </div>
            )}
          </div>
        )
      )}
    </Modal>
  );
}
