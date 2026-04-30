import { useState } from 'react';
import { formatBRL, currentYearMonth } from '../utils/formatters';
import Badge from './ui/Badge';
import { ChevronRight, TrendingUp, TrendingDown, Calendar } from 'lucide-react';

function getPilotMonthTotals(pilot) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  const expenses = (pilot.expenses ?? []).filter((e) => {
    const d = new Date(e.createdAt);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });
  const reimbursements = (pilot.reimbursements ?? []).filter((r) => {
    const d = new Date(r.createdAt);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

  const totalExpenses = expenses.reduce((s, e) => s + parseFloat(e.amount ?? 0), 0);
  const totalReimbursements = reimbursements.reduce((s, r) => s + parseFloat(r.amount ?? 0), 0);
  const baseFee = parseFloat(pilot.baseFee ?? 0);
  const total = baseFee + totalExpenses - totalReimbursements;

  return { baseFee, totalExpenses, totalReimbursements, total };
}

export default function PilotCard({ pilot, onSelect }) {
  const { baseFee, totalExpenses, totalReimbursements } = getPilotMonthTotals(pilot);
  const netExpenses = totalExpenses - totalReimbursements;

  return (
    <button
      onClick={() => onSelect(pilot)}
      className="glass-card p-5 w-full text-left hover:border-zinc-700 hover:bg-zinc-800/60 
                 transition-all duration-200 active:scale-[0.98] group"
      aria-label={`Ver detalhes do piloto ${pilot.name}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-zinc-100 text-base truncate">{pilot.name}</h3>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {pilot.category && <Badge label={pilot.category} />}
            {pilot.status && (
              <Badge 
                label={pilot.status === 'ATRASADO' ? 'Em Atraso' : (pilot.status === 'PENDENTE' ? 'Pendente' : 'Em Dia')} 
                color={pilot.status === 'ATRASADO' ? 'red' : (pilot.status === 'PENDENTE' ? 'amber' : 'green')} 
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
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800">
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Mensalidade</p>
          <p className="text-sm font-medium text-zinc-300">{formatBRL(baseFee)}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-0.5">Gastos Extras</p>
          <p className={`text-sm font-semibold ${netExpenses > 0 ? 'text-red-400' : (netExpenses < 0 ? 'text-emerald-400' : 'text-zinc-500')}`}>
            {netExpenses > 0 ? '+' : ''}{formatBRL(netExpenses)}
          </p>
        </div>
      </div>
    </button>
  );
}
