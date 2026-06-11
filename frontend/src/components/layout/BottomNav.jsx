import { NavLink } from 'react-router-dom';
import { motion, LayoutGroup } from 'framer-motion';
import { LayoutDashboard, Settings as SettingsIcon, BarChart2, CalendarDays, Flag } from 'lucide-react';

const LINKS = [
  { to: '/', end: true, icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/races', icon: Flag, label: 'Corridas' },
  { to: '/calendar', icon: CalendarDays, label: 'Calendário' },
  { to: '/settings', icon: SettingsIcon, label: 'Configurações' },
];

const glassShell = {
  borderRadius: '24px',
  background: 'linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
  backdropFilter: 'blur(32px) saturate(180%) brightness(1.06)',
  WebkitBackdropFilter: 'blur(32px) saturate(180%) brightness(1.06)',
  border: '1px solid rgba(255,255,255,0.09)',
  boxShadow: [
    '0 8px 24px rgba(0,0,0,0.4)',
    '0 2px 6px rgba(0,0,0,0.25)',
    'inset 0 1px 0 rgba(255,255,255,0.14)',
    'inset 0 -1px 0 rgba(0,0,0,0.1)',
  ].join(', '),
};

const activePill = {
  borderRadius: '13px',
  background: 'linear-gradient(145deg, rgba(52,211,153,0.16) 0%, rgba(52,211,153,0.06) 100%)',
  border: '1px solid rgba(52,211,153,0.18)',
  boxShadow: [
    '0 2px 10px rgba(52,211,153,0.12)',
    'inset 0 1px 0 rgba(255,255,255,0.1)',
  ].join(', '),
};

export default function BottomNav() {
  return (
    <LayoutGroup>
      <nav
        className="lg:hidden fixed left-3 right-3 z-40"
        style={{ bottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <div className="flex items-center justify-around px-1 py-0.5" style={glassShell}>
          {LINKS.map(({ to, end, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={end} className="flex-1 flex justify-center" title={label}>
              {({ isActive }) => (
                <div className="relative flex items-center justify-center p-3">
                  {isActive && (
                    <motion.div
                      layoutId="nav-glass-pill"
                      className="absolute w-10 h-10"
                      style={activePill}
                      transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                    />
                  )}
                  <Icon
                    size={22}
                    className={`relative z-10 transition-colors duration-200 ${
                      isActive ? 'text-emerald-400' : 'text-zinc-500'
                    }`}
                    strokeWidth={isActive ? 2.2 : 1.8}
                  />
                </div>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </LayoutGroup>
  );
}
