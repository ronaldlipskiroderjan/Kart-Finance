import Modal from './ui/Modal';
import { useCommHistory } from '../context/CommHistoryContext';
import { MessageCircle, Trash2, Clock, Send } from 'lucide-react';
import { formatBRL } from '../utils/formatters';

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'agora mesmo';
  if (mins < 60) return `há ${mins} min`;
  if (hrs < 24) return `há ${hrs}h`;
  if (days < 7) return `há ${days} dia${days > 1 ? 's' : ''}`;
  return new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function CommHistoryModal({ isOpen, onClose, pilot }) {
  const { getForPilot, clearForPilot } = useCommHistory();

  if (!pilot) return null;

  const entries = getForPilot(pilot.id);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Histórico de Cobranças" size="md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Send size={15} className="text-emerald-400" />
          <p className="text-sm text-zinc-400">
            <span className="font-semibold text-zinc-200">{entries.length}</span> mensagem{entries.length !== 1 ? 's' : ''} enviada{entries.length !== 1 ? 's' : ''}
          </p>
        </div>
        {entries.length > 0 && (
          <button
            onClick={() => clearForPilot(pilot.id)}
            className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded-lg hover:bg-red-900/20"
          >
            <Trash2 size={12} />
            Limpar
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center mb-3">
            <MessageCircle size={24} className="text-zinc-600" />
          </div>
          <p className="text-sm font-medium text-zinc-400 mb-1">Nenhuma cobrança enviada</p>
          <p className="text-xs text-zinc-600">As cobranças via WhatsApp aparecem aqui automaticamente</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {entries.map((entry, idx) => (
            <div
              key={entry.id}
              className={`bg-zinc-800/50 rounded-xl p-4 border border-zinc-700/40 transition-opacity ${idx > 0 ? 'opacity-80' : ''}`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Clock size={11} />
                  <span>{timeAgo(entry.sentAt)}</span>
                  <span className="text-zinc-700">·</span>
                  <span>{new Date(entry.sentAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}</span>
                </div>
                {entry.amount > 0 && (
                  <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    {formatBRL(entry.amount)}
                  </span>
                )}
              </div>
              {entry.monthLabel && (
                <p className="text-xs text-zinc-400 mb-2 font-medium">
                  📅 {entry.monthLabel}
                </p>
              )}
              <div className="bg-zinc-900/60 p-3 rounded-lg text-xs text-zinc-400 font-mono whitespace-pre-wrap break-all leading-relaxed border border-zinc-800/50 overflow-hidden">
                {entry.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
