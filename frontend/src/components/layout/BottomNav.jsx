import { NavLink } from 'react-router-dom';
import { LayoutDashboard } from 'lucide-react';

export default function BottomNav() {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-zinc-900/95 backdrop-blur border-t border-zinc-800 
                    flex items-center justify-around px-4 pb-safe"
         style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)' }}
    >
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `flex flex-col items-center gap-1 py-2 px-6 rounded-xl transition-colors ${
            isActive ? 'text-emerald-400' : 'text-zinc-500 hover:text-zinc-300'
          }`
        }
      >
        <LayoutDashboard size={22} />
        <span className="text-[10px] font-medium">Dashboard</span>
      </NavLink>
    </nav>
  );
}
