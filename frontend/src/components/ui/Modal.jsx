import { useEffect } from 'react';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    if (isOpen) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4',
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={`relative w-full ${sizes[size]} bg-zinc-900 border border-zinc-800 
                    rounded-t-3xl sm:rounded-2xl shadow-2xl shadow-black/50 
                    max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-4 duration-300`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 shrink-0">
          <h2 className="text-lg font-semibold text-zinc-100">{title}</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg p-1.5 transition-colors"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>
        {/* Content */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {children}
        </div>
      </div>
    </div>
  );
}
