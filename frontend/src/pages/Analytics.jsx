import { useState, useEffect } from 'react';
import { getPilots } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import BottomNav from '../components/layout/BottomNav';
import { formatBRL } from '../utils/formatters';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { TrendingUp, Users, AlertCircle, DollarSign, Award, RefreshCw } from 'lucide-react';

const PIE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2.5 shadow-2xl">
      <p className="text-xs text-zinc-400 mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold" style={{ color: p.color }}>
          {p.name}: {formatBRL(p.value)}
        </p>
      ))}
    </div>
  );
}

function KPICard({ icon: Icon, label, value, color, sub, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, type: 'spring', stiffness: 300 }}
      className="glass-card p-5 relative overflow-hidden"
    >
      <div className={`absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 blur-2xl -translate-y-1/2 translate-x-1/2 ${color}`} />
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 bg-zinc-800/80`}>
        <Icon size={19} className={color.replace('bg-', 'text-').replace('/20', '-400')} />
      </div>
      <p className="text-xs text-zinc-500 mb-1 font-medium">{label}</p>
      <p className="text-xl font-bold text-zinc-100 truncate">{value}</p>
      {sub && <p className="text-xs text-zinc-600 mt-0.5">{sub}</p>}
    </motion.div>
  );
}

function SectionTitle({ children, delay = 0 }) {
  return (
    <motion.h2
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay }}
      className="text-base font-semibold text-zinc-100 mb-4"
    >
      {children}
    </motion.h2>
  );
}

export default function Analytics() {
  const [pilots, setPilots] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    getPilots()
      .then(res => setPilots(res.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const now = new Date();
  const allClosings = pilots.flatMap(p => p.closingHistories || []);
  const thisMonthRef = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const totalPending = allClosings
    .filter(h => h.status === 'PENDENTE' || h.status === 'ATRASADO')
    .reduce((s, h) => s + (h.totalAmount || 0), 0);

  const receivedThisMonth = allClosings
    .filter(h => h.status === 'PAGO' && h.monthReference === thisMonthRef)
    .reduce((s, h) => s + (h.totalAmount || 0), 0);

  const overdueCount = pilots.filter(p => p.status === 'ATRASADO').length;

  // Last 6 months chart data
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const ref = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(d).replace('.', '');
    const paid = allClosings.filter(h => h.status === 'PAGO' && h.monthReference === ref)
      .reduce((s, h) => s + (h.totalAmount || 0), 0);
    const pending = allClosings.filter(h => (h.status === 'PENDENTE' || h.status === 'ATRASADO') && h.monthReference === ref)
      .reduce((s, h) => s + (h.totalAmount || 0), 0);
    return { label, paid, pendente: pending };
  });

  // Category distribution
  const categoryData = Object.entries(
    pilots.reduce((acc, p) => {
      const cat = p.category || 'Sem categoria';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Top debtors
  const debtors = pilots
    .map(p => ({
      ...p,
      debt: (p.closingHistories || [])
        .filter(h => h.status === 'PENDENTE' || h.status === 'ATRASADO')
        .reduce((s, h) => s + (h.totalAmount || 0), 0),
    }))
    .filter(p => p.debt > 0)
    .sort((a, b) => b.debt - a.debt)
    .slice(0, 5);

  // Per-pilot bar chart (top 8 by baseFee)
  const pilotBars = pilots
    .slice(0, 8)
    .map(p => ({ name: p.name.split(' ')[0], mensalidade: p.baseFee || 0 }));

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-zinc-950/90 backdrop-blur border-b border-zinc-800 px-4 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-zinc-100">Analytics</h1>
            <p className="text-xs text-zinc-500 mt-0.5">Visão financeira completa</p>
          </div>
          <button onClick={load} disabled={loading} className="btn-secondary px-3 py-2" aria-label="Recarregar">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
        </header>

        <div className="flex-1 px-4 lg:px-8 py-6 pb-28 lg:pb-8 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard icon={Users} label="Total Pilotos" value={pilots.length} color="bg-blue-500/20" delay={0} />
            <KPICard icon={DollarSign} label="A Receber" value={formatBRL(totalPending)} color="bg-amber-500/20" delay={0.06} sub="Pendente + Atrasado" />
            <KPICard icon={TrendingUp} label="Recebido Este Mês" value={formatBRL(receivedThisMonth)} color="bg-emerald-500/20" delay={0.12} />
            <KPICard icon={AlertCircle} label="Em Atraso" value={overdueCount} color="bg-red-500/20" delay={0.18} sub={`de ${pilots.length} pilotos`} />
          </div>

          {/* Monthly Revenue Area Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="glass-card p-5"
          >
            <SectionTitle delay={0.24}>Receita dos Últimos 6 Meses</SectionTitle>
            {loading ? (
              <div className="h-52 animate-pulse bg-zinc-800/50 rounded-xl" />
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <AreaChart data={monthlyData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradPaid" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="label" tick={{ fill: '#71717a', fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => v >= 1000 ? `R$${(v / 1000).toFixed(0)}k` : `R$${v}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend formatter={v => <span className="text-xs text-zinc-400">{v === 'paid' ? 'Pago' : 'Pendente'}</span>} />
                  <Area type="monotone" dataKey="paid" name="paid" stroke="#10b981" fill="url(#gradPaid)" strokeWidth={2.5} dot={{ fill: '#10b981', r: 3 }} />
                  <Area type="monotone" dataKey="pendente" name="pendente" stroke="#f59e0b" fill="url(#gradPending)" strokeWidth={2.5} dot={{ fill: '#f59e0b', r: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          {/* Pilot mensalidades bar + Category pie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.28 }}
              className="glass-card p-5"
            >
              <SectionTitle delay={0.3}>Mensalidades por Piloto</SectionTitle>
              {loading ? (
                <div className="h-40 animate-pulse bg-zinc-800/50 rounded-xl" />
              ) : pilotBars.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-zinc-600 text-sm">Sem dados</div>
              ) : (
                <ResponsiveContainer width="100%" height={170}>
                  <BarChart data={pilotBars} margin={{ top: 0, right: 4, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#71717a', fontSize: 10 }} axisLine={false} tickLine={false}
                      tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="mensalidade" name="mensalidade" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32 }}
              className="glass-card p-5"
            >
              <SectionTitle delay={0.34}>Distribuição por Categoria</SectionTitle>
              {loading ? (
                <div className="h-40 animate-pulse bg-zinc-800/50 rounded-xl" />
              ) : categoryData.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-zinc-600 text-sm">Sem dados</div>
              ) : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width={130} height={130}>
                    <PieChart>
                      <Pie data={categoryData} cx="50%" cy="50%" innerRadius={32} outerRadius={58} dataKey="value" paddingAngle={3}>
                        {categoryData.map((_, i) => (
                          <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-2">
                    {categoryData.map((c, i) => (
                      <div key={c.name} className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-sm text-zinc-300 flex-1 truncate">{c.name}</span>
                        <span className="text-xs font-bold text-zinc-400">{c.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>

          {/* Top debtors */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36 }}
            className="glass-card p-5"
          >
            <SectionTitle delay={0.38}>Maiores Devedores</SectionTitle>
            {loading ? (
              <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-12 animate-pulse bg-zinc-800/50 rounded-xl" />)}</div>
            ) : debtors.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Award size={32} className="text-emerald-500/50 mb-2" />
                <p className="text-sm font-medium text-zinc-400">Todos os pagamentos em dia!</p>
                <p className="text-xs text-zinc-600 mt-0.5">Nenhum piloto com dívida pendente</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {debtors.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 bg-zinc-800/40 rounded-xl px-4 py-3">
                    <span className={`text-sm font-bold w-5 shrink-0 ${i === 0 ? 'text-amber-400' : i === 1 ? 'text-zinc-400' : 'text-zinc-600'}`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-zinc-200 truncate">{p.name}</p>
                      {p.category && <p className="text-xs text-zinc-500">{p.category}</p>}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-400">{formatBRL(p.debt)}</p>
                      <p className="text-xs text-zinc-600">em dívida</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
