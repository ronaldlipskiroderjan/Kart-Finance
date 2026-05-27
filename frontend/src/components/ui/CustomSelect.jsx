import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * CustomSelect — dropdown de seleção única no padrão visual do sistema.
 *
 * Props:
 *   value       — valor selecionado atualmente
 *   onChange    — (value) => void  chamado ao selecionar uma opção
 *   options     — [{ value, label }]
 *   placeholder — texto quando nenhum valor selecionado  (default: "Selecione…")
 *   className   — classes extras para o wrapper
 *   disabled    — desabilita o campo
 */
export default function CustomSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Selecione…',
  className = '',
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const selectedLabel = options.find(o => String(o.value) === String(value))?.label;

  // Fecha ao clicar fora
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="input-field w-full flex items-center justify-between gap-2 text-left cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={selectedLabel ? 'text-zinc-100 truncate' : 'text-zinc-500'}>
          {selectedLabel ?? placeholder}
        </span>
        <ChevronDown
          size={15}
          className={`shrink-0 text-zinc-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl">
          <div className="max-h-52 overflow-y-auto">
            {options.length === 0 ? (
              <p className="px-4 py-3 text-sm text-zinc-500">Nenhuma opção disponível.</p>
            ) : options.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors
                  ${String(opt.value) === String(value)
                    ? 'bg-emerald-600/20 text-emerald-400'
                    : 'text-zinc-300 hover:bg-zinc-700/70'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
