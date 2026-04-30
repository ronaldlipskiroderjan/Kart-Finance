import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Sidebar() {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-zinc-900 border-r border-zinc-800 min-h-screen sticky top-0">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-zinc-800">
        <span className="text-xl font-black tracking-tight">
          <span className="text-emerald-400">RA Kart</span>
          <span className="text-zinc-100"> Racing</span>
        </span>
        <p className="text-xs text-zinc-500 mt-0.5">Painel Administrativo</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
            }`
          }
        >
          <LayoutDashboard size={18} />
          Dashboard
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
            }`
          }
        >
          <SettingsIcon size={18} />
          Configurações
        </NavLink>
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-zinc-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium 
                     text-zinc-400 hover:text-red-400 hover:bg-red-900/20 transition-colors"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}
