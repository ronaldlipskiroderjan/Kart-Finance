const COLORS = {
  default: 'bg-zinc-700/60 text-zinc-300 border-zinc-600',
  emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  green: 'bg-green-900/60 text-green-400 border-green-800/50',
  red: 'bg-red-900/60 text-red-400 border-red-800/50',
  blue: 'bg-blue-900/60 text-blue-400 border-blue-800/50',
  amber: 'bg-amber-900/60 text-amber-500 border-amber-800/50',
};

const CATEGORY_COLORS = {
  '125cc': 'emerald',
  'F4': 'blue',
  'Cadete': 'green',
};

export default function Badge({ label, color }) {
  const resolvedColor = color ?? CATEGORY_COLORS[label] ?? 'default';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${COLORS[resolvedColor]}`}>
      {label}
    </span>
  );
}
