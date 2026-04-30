import { formatBRL } from '../utils/formatters';
import Badge from './ui/Badge';
import { ChevronRight, Calendar } from 'lucide-react';

function getPilotMonthTotals(pilot) {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  const closingHistories = pilot.closingHistories || pilot.ClosingHistories || [];
  
  if (closingHistories.length > 0) {
    const sortedHistory = [...closingHistories].sort((a, b) => {
      const refA = a.monthReference || a.MonthReference;
      const refB = b.monthReference || b.MonthReference;
      return refB.localeCompare(refA);
    });
    const latest = sortedHistory[0];
    const latestRef = latest.monthReference || latest.MonthReference;
    const [lYear, lMonth] = latestRef.split('/').map(Number);
    
    if (year < lYear || (year === lYear && month <= lMonth)) {
      month = lMonth + 1;
      year = lYear;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
  }

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
  const total = baseFee + totalExpenses - totalReimbursements;

  return { baseFee, totalExpenses, totalReimbursements, total };
}

export default function PilotCard({ pilot, onSelect }) {
  const { baseFee, totalExpenses, totalReimbursements } = getPilotMonthTotals(pilot);
  const netExpenses = totalExpenses - totalReimbursements;

  const closingHistories = pilot.closingHistories || pilot.ClosingHistories || [];
  const previousDebt = closingHistories
    .filter(h => {
       const status = h.status || h.Status;
       return status === 'PENDENTE' || status === 'ATRASADO';
    })
    .reduce((s, h) => s + parseFloat(h.totalAmount || h.TotalAmount || 0), 0);

  return (
    <button
      onClick={() => onSelect(pilot)}
      className="relative overflow-hidden glass-card p-5 w-full text-left hover:border-zinc-700 hover:bg-zinc-800/60 
                 transition-all duration-200 active:scale-[0.98] group flex flex-col"
      aria-label={`Ver detalhes do piloto ${pilot.name}`}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
      
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4 w-full">
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
      <div className="grid grid-cols-2 gap-3 pt-3 border-t border-zinc-800 w-full mt-auto">
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
        {previousDebt > 0 && (
          <div className="col-span-2 mt-1 bg-orange-900/20 border border-orange-700/30 rounded-lg p-2.5">
            <p className="text-xs text-orange-400 mb-0.5 font-medium flex items-center gap-1">
              ⚠ Dívida Acumulada
            </p>
            <p className="text-sm font-semibold text-orange-400">+{formatBRL(previousDebt)}</p>
          </div>
        )}
      </div>
    </button>
  );
}
