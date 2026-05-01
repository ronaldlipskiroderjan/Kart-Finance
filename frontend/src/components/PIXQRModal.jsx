import { useState } from 'react';
import Modal from './ui/Modal';
import { QRCode } from 'react-qr-code';
import { generatePixPayload } from '../utils/pixQR';
import { Copy, Check, QrCode, Sparkles } from 'lucide-react';
import { formatBRL } from '../utils/formatters';

export default function PIXQRModal({ isOpen, onClose, pixKey, merchantName, amount, pilotName, monthLabel }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !pixKey) return null;

  const payload = generatePixPayload({
    pixKey,
    merchantName: merchantName || 'RA Kart Racing',
    amount: amount || 0,
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const el = document.createElement('textarea');
      el.value = payload;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="sm">
      <div className="flex flex-col items-center gap-5 -mt-2">
        {/* Header */}
        <div className="text-center">
          <div className="w-12 h-12 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <QrCode size={22} className="text-emerald-400" />
          </div>
          <h3 className="text-lg font-bold text-zinc-100">PIX — QR Code</h3>
          {pilotName && <p className="text-sm text-zinc-400 mt-0.5">{pilotName}</p>}
          {monthLabel && <p className="text-xs text-zinc-500">{monthLabel}</p>}
        </div>

        {/* QR Code */}
        <div className="relative">
          <div className="bg-white p-4 rounded-2xl shadow-lg shadow-black/30">
            <QRCode value={payload} size={188} level="M" />
          </div>
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/40">
            <Sparkles size={12} className="text-white" />
          </div>
        </div>

        {/* Amount */}
        {amount > 0 && (
          <div className="w-full bg-emerald-500/10 border border-emerald-500/25 rounded-2xl px-5 py-3.5 text-center">
            <p className="text-xs text-emerald-600 mb-0.5 font-medium uppercase tracking-wider">Valor</p>
            <p className="text-2xl font-bold text-emerald-400">{formatBRL(amount)}</p>
          </div>
        )}

        {/* PIX Key */}
        <div className="w-full bg-zinc-800/60 rounded-xl px-4 py-3 border border-zinc-700/50">
          <p className="text-xs text-zinc-500 mb-1 font-medium">Chave PIX</p>
          <p className="text-sm text-zinc-300 font-mono break-all leading-relaxed">{pixKey}</p>
        </div>

        {/* Copy button */}
        <button
          onClick={handleCopy}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-300
            ${copied
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 scale-[0.98]'
              : 'btn-secondary hover:bg-zinc-700'}`}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Código copiado!' : 'Copiar código PIX'}
        </button>
      </div>
    </Modal>
  );
}
