import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings as SettingsIcon, BarChart2, CalendarDays } from 'lucide-react';

const LINKS = [
  { to: '/', end: true, icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendário' },
  { to: '/settings', icon: SettingsIcon, label: 'Config.' },
];

export default function BottomNav() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-zinc-900/95 backdrop-blur border-t border-zinc-800
                 flex items-center justify-around px-2"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
    >
      {LINKS.map(({ to, end, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-colors min-w-0 ${
              isActive ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
            }`
          }
        >
          <Icon size={20} />
          <span className="text-[9px] font-medium truncate">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
