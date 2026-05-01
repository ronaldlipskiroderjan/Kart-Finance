import { formatBRL } from '../utils/formatters';
import Badge from './ui/Badge';
import { ChevronRight, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { getActiveBillingMonth, isSameMonth } from '../utils/billing';

const STATUS_BAR = {
  ATRASADO: 'bg-red-500',
  PENDENTE: 'bg-amber-400',
  'EM DIA': 'bg-emerald-500',
};

function getPilotMonthTotals(pilot) {
  const { year, month } = getActiveBillingMonth(pilot);

  const rawExpenses = pilot.expenses || pilot.Expenses || [];
  const rawReimbursements = pilot.reimbursements || pilot.Reimbursements || [];

  const expenses = rawExpenses.filter((e) => {
    const d = new Date(e.createdAt || e.CreatedAt);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });
  const reimbursements = rawReimbursements.filter((r) => {
    const d = new Date(r.createdAt || r.CreatedAt);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount || e.Amount || 0), 0);
  const totalReimbursements = reimbursements.reduce((s, r) => s + parseFloat(r.amount || r.Amount || 0), 0);
  const baseFee = parseFloat(pilot.baseFee || pilot.BaseFee || 0);

  return { baseFee, totalExpenses, totalReimbursements, year, month };
}

function shortMonthLabel(year, month) {
  const d = new Date(year, month - 1, 1);
  const mon = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d).replace('.', '');
  return `${mon.charAt(0).toUpperCase() + mon.slice(1)}/${String(year).slice(2)}`;
}

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 28 } },
};

export default function PilotCard({ pilot, onSelect }) {
  const { baseFee, totalExpenses, totalReimbursements, year, month } = getPilotMonthTotals(pilot);
  const netExpenses = totalExpenses - totalReimbursements;
  const isCurrentMonth = isSameMonth(year, month);

  const closingHistories = pilot.closingHistories || pilot.ClosingHistories || [];
  const previousDebt = closingHistories
    .filter(h => {
      const status = h.status || h.Status;
      return status === 'PENDENTE' || status === 'ATRASADO';
    })
    .reduce((s, h) => s + parseFloat(h.totalAmount || h.TotalAmount || 0), 0);

  const barColor = STATUS_BAR[pilot.status] || 'bg-emerald-500';

  return (
    <motion.button
      variants={cardVariants}
      onClick={() => onSelect(pilot)}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.98 }}
      className="relative overflow-hidden glass-card p-5 w-full text-left hover:border-zinc-700 hover:bg-zinc-800/60
                 transition-colors duration-200 group flex flex-col"
      aria-label={`Ver detalhes do piloto ${pilot.name}`}
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${barColor}`} />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 w-full">
        <div className="min-w-0">
          <h3 className="font-semibold text-zinc-100 text-base truncate">{pilot.name}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1">
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
        <ChevronRight
          size={18}
          className="text-zinc-600 group-hover:text-emerald-400 transition-colors shrink-0 mt-0.5"
        />
      </div>

      {/* Fee & totals */}
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800 w-full mt-auto">
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Mensalidade</p>
          <p className="text-sm font-medium text-zinc-300">{formatBRL(baseFee)}</p>
        </div>
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-xs text-zinc-500">Gastos Extras</p>
            {!isCurrentMonth && (
              <span className="text-[9px] font-semibold text-emerald-500/80 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                {shortMonthLabel(year, month)}
              </span>
            )}
          </div>
          <p className={`text-sm font-semibold ${netExpenses > 0 ? 'text-red-400' : netExpenses < 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
            {netExpenses > 0 ? '+' : ''}{formatBRL(netExpenses)}
          </p>
        </div>
        {previousDebt > 0 && (
          <div className="col-span-2 mt-1 bg-orange-900/20 border border-orange-700/30 rounded-lg p-2.5">
            <p className="text-xs text-orange-400 mb-0.5 font-medium flex items-center gap-1">
              ⚠ Dívida Acumulada
            </p>
            <p className="text-sm font-semibold text-orange-400">+{formatBRL(previousDebt)}</p>
          </div>
        )}
      </div>
    </motion.button>
  );
}
