import { NavLink } from 'react-router-dom';
import { motion, LayoutGroup } from 'framer-motion';
import { LayoutDashboard, Settings as SettingsIcon, BarChart2, CalendarDays, Flag } from 'lucide-react';

const LINKS = [
  { to: '/', end: true, icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/races', icon: Flag, label: 'Corridas' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendário' },
  { to: '/settings', icon: SettingsIcon, label: 'Config.' },
];

export default function BottomNav() {
  return (
    <LayoutGroup>
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-zinc-900/95 backdrop-blur
                   border-t border-zinc-800 flex items-center justify-around px-2 overflow-visible"
        style={{ height: 'calc(60px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {LINKS.map(({ to, end, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={end} className="flex-1 flex justify-center items-center">
            {({ isActive }) =>
              isActive ? (
                <motion.div
                  layoutId="nav-bubble"
                  className="flex flex-col items-center -translate-y-6"
                  transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                >
                  <div className="w-12 h-12 rounded-full bg-emerald-500 shadow-xl shadow-emerald-500/50
                                  flex items-center justify-center">
                    <Icon size={22} className="text-white" strokeWidth={2.2} />
                  </div>
                  <span className="text-[9px] font-semibold text-emerald-400 mt-1 leading-none">
                    {label}
                  </span>
                </motion.div>
              ) : (
                <div className="flex flex-col items-center gap-0.5 py-2 px-3
                                text-zinc-500 hover:text-zinc-300 transition-colors min-w-0">
                  <Icon size={20} />
                  <span className="text-[9px] font-medium truncate">{label}</span>
                </div>
              )
            }
          </NavLink>
        ))}
      </nav>
    </LayoutGroup>
  );
}
