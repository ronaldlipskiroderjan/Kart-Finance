import { useState, useEffect } from 'react';
import { getPilots } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import { ChevronLeft, ChevronRight, Calendar, Flag, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Badge from '../components/ui/Badge';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function getDaysInMonth(year, month) { return new Date(year, month, 0).getDate(); }
function getFirstDay(year, month) { return new Date(year, month - 1, 1).getDay(); }

function getStatusForPilotMonth(pilot, year, month) {
  const ref = `${year}-${String(month).padStart(2, '0')}`;
  const hist = (pilot.closingHistories || []).find(h => h.monthReference === ref);
  return hist?.status || null;
}

const STATUS_DOT = {
  PAGO: 'bg-emerald-500',
  PENDENTE: 'bg-amber-400',
  ATRASADO: 'bg-red-500',
};

const STATUS_CHIP = {
  PAGO: 'bg-emerald-500/20 text-emerald-400',
  PENDENTE: 'bg-amber-500/20 text-amber-400',
  ATRASADO: 'bg-red-500/20 text-red-400',
};

export default function CalendarView() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [pilots, setPilots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState(null);

  const load = () => {
    setLoading(true);
    getPilots().then(res => { setPilots(res.data || []); }).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const prevMonth = () => {
    setSelectedDay(null);
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };

  const nextMonth = () => {
    setSelectedDay(null);
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, 1));

  const pilotsForDay = (day) => pilots.filter(p => p.closingDay === day);

  const selectedDayPilots = selectedDay ? pilotsForDay(selectedDay).map(p => ({
    pilot: p,
    status: getStatusForPilotMonth(p, year, month),
  })) : [];

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur border-b border-zinc-800 px-4 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Calendário</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Datas de fechamento dos pilotos</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} disabled={loading} className="btn-secondary p-2 rounded-xl mr-1">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button onClick={prevMonth} className="btn-secondary p-2 rounded-xl" aria-label="Mês anterior">
              <ChevronLeft size={17} />
            </button>
            <span className="text-sm font-semibold text-zinc-200 capitalize min-w-[140px] text-center">{monthLabel}</span>
            <button onClick={nextMonth} className="btn-secondary p-2 rounded-xl" aria-label="Próximo mês">
              <ChevronRight size={17} />
            </button>
          </div>
        </header>

        <div className="flex-1 px-4 lg:px-8 py-6 pb-28 lg:pb-8 space-y-4">
          {/* Legend */}
          <div className="flex items-center gap-4 text-xs text-zinc-500">
            {Object.entries(STATUS_DOT).map(([k, cls]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${cls}`} />
                <span className="capitalize">{k === 'PAGO' ? 'Pago' : k === 'PENDENTE' ? 'Pendente' : 'Atrasado'}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
              <span>Sem fechamento</span>
            </div>
          </div>

          {/* Calendar grid */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="glass-card overflow-hidden"
          >
            {/* Weekday headers */}
            <div className="grid grid-cols-7 border-b border-zinc-800">
              {WEEKDAYS.map(d => (
                <div key={d} className="py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  {d}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7">
              {Array.from({ length: totalCells }, (_, i) => {
                const day = i - firstDay + 1;
                const isValid = day >= 1 && day <= daysInMonth;
                const pilotsToday = isValid ? pilotsForDay(day) : [];
                const isToday = isValid && day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();
                const isSelected = selectedDay === day && isValid;
                const hasPilots = pilotsToday.length > 0;

                return (
                  <button
                    key={i}
                    onClick={() => isValid && hasPilots && setSelectedDay(isSelected ? null : day)}
                    disabled={!isValid || !hasPilots}
                    className={`
                      min-h-[76px] sm:min-h-[88px] p-1.5 border-b border-r border-zinc-800/40 text-left
                      transition-all duration-150
                      ${!isValid ? 'bg-zinc-900/20 cursor-default' : ''}
                      ${isValid && hasPilots ? 'hover:bg-zinc-800/30 cursor-pointer' : ''}
                      ${isSelected ? 'bg-emerald-500/8 ring-1 ring-inset ring-emerald-500/25' : ''}
                    `}
                  >
                    {isValid && (
                      <>
                        <span className={`
                          text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full mb-1
                          ${isToday ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/40' : 'text-zinc-500'}
                          ${isSelected && !isToday ? 'text-emerald-400' : ''}
                        `}>
                          {day}
                        </span>
                        <div className="space-y-0.5">
                          {pilotsToday.slice(0, 2).map(p => {
                            const status = getStatusForPilotMonth(p, year, month);
                            return (
                              <div
                                key={p.id}
                                className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded font-semibold truncate
                                  ${status ? STATUS_CHIP[status] : 'bg-zinc-700/50 text-zinc-400'}`}
                              >
                                {p.name.split(' ')[0]}
                              </div>
                            );
                          })}
                          {pilotsToday.length > 2 && (
                            <p className="text-[9px] text-zinc-600 pl-1">+{pilotsToday.length - 2}</p>
                          )}
                        </div>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Selected day detail */}
          <AnimatePresence>
            {selectedDay && selectedDayPilots.length > 0 && (
              <motion.div
                key={`detail-${selectedDay}`}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="glass-card p-5"
              >
                <h3 className="text-sm font-semibold text-zinc-200 mb-3 flex items-center gap-2">
                  <Calendar size={14} className="text-emerald-400" />
                  Dia {selectedDay} — {selectedDayPilots.length} piloto{selectedDayPilots.length !== 1 ? 's' : ''}
                </h3>
                <div className="space-y-2.5">
                  {selectedDayPilots.map(({ pilot, status }) => (
                    <div key={pilot.id} className="flex items-center justify-between bg-zinc-800/50 rounded-xl px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-8 rounded-full ${status ? STATUS_DOT[status] : 'bg-zinc-600'}`} />
                        <div>
                          <p className="text-sm font-semibold text-zinc-200">{pilot.name}</p>
                          {pilot.category && <p className="text-xs text-zinc-500">{pilot.category}</p>}
                        </div>
                      </div>
                      <Badge
                        label={!status ? 'Sem fechamento' : status === 'PAGO' ? 'Pago' : status === 'ATRASADO' ? 'Atrasado' : 'Pendente'}
                        color={!status ? 'default' : status === 'PAGO' ? 'green' : status === 'ATRASADO' ? 'red' : 'amber'}
                      />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* If no pilots with closing days set */}
          {!loading && pilots.length > 0 && pilots.every(p => !p.closingDay) && (
            <div className="glass-card p-8 text-center">
              <Flag size={28} className="text-zinc-600 mx-auto mb-3" />
              <p className="text-sm text-zinc-400 font-medium">Nenhum piloto tem dia de fechamento configurado</p>
              <p className="text-xs text-zinc-600 mt-1">Configure o dia de fechamento ao cadastrar ou editar um piloto</p>
            </div>
          )}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
