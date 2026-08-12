import { useEffect, useState } from 'react';

import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import CustomSelect from '../../../components/ui/CustomSelect';
import { getPilots } from '../../../services/pilotsApi';
import {
  addRaceEntry,
  createRaceWeekend,
  getGuestPilots,
  updateRaceEntry,
  updateRaceWeekend,
} from '../../../services/racesApi';

// ─── WeekendFormModal ──────────────────────────────────────────────────────────

export function WeekendFormModal({ isOpen, onClose, onSave, initial }) {
  const [form, setForm] = useState({ Name: '', Date: '', Description: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setForm(initial
      ? { Name: initial.name, Date: initial.date?.slice(0, 10) ?? '', Description: initial.description ?? '' }
      : { Name: '', Date: '', Description: '' });
    setError('');
  }, [isOpen, initial]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.Name.trim() || !form.Date) { setError('Nome e data são obrigatórios.'); return; }
    setLoading(true); setError('');
    try {
      initial ? await updateRaceWeekend(initial.id, form) : await createRaceWeekend(form);
      onSave(); onClose();
    } catch { setError('Erro ao salvar. Tente novamente.'); }
    finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initial ? 'Editar Fim de Semana' : 'Novo Fim de Semana'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Nome do Evento</label>
          <input className="input-field" placeholder="Ex: Etapa 3 – RA Kart Racing" value={form.Name}
            onChange={e => setForm(p => ({ ...p, Name: e.target.value }))} required />
        </div>
        <div>
          <label className="label">Data</label>
          <input type="date" className="input-field" value={form.Date}
            onChange={e => setForm(p => ({ ...p, Date: e.target.value }))} required />
        </div>
        <div>
          <label className="label">Descrição (opcional)</label>
          <textarea className="input-field resize-none" rows={2} placeholder="Detalhes adicionais…"
            value={form.Description} onChange={e => setForm(p => ({ ...p, Description: e.target.value }))} />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={loading}>
            {loading ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── AddPilotModal ─────────────────────────────────────────────────────────────

export function AddPilotModal({ isOpen, onClose, onSave, raceId, existingPilotIds }) {
  const [mode, setMode]                   = useState('mensal'); // 'mensal' | 'convidado'
  const [pilots, setPilots]               = useState([]);
  const [guestPilots, setGuestPilots]     = useState([]);
  const [pilotId, setPilotId]             = useState('');
  const [guestName, setGuestName]         = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [amount, setAmount]               = useState('');
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setMode('mensal'); setPilotId(''); setGuestName(''); setAmount(''); setError(''); setShowSuggestions(false);
    getPilots().then(r => setPilots(r.data || [])).catch(() => {});
    getGuestPilots().then(r => setGuestPilots(r.data || [])).catch(() => {});
  }, [isOpen]);

  const filteredGuests = guestPilots.filter(g =>
    !guestName.trim() || g.name.toLowerCase().includes(guestName.toLowerCase().trim())
  );

  const available = pilots.filter(p => !existingPilotIds.includes(p.id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount) { setError('Informe o valor.'); return; }

    if (mode === 'mensal') {
      if (!pilotId) { setError('Selecione um piloto.'); return; }
    } else {
      if (!guestName.trim()) { setError('Informe o nome do piloto convidado.'); return; }
    }

    setLoading(true); setError('');
    try {
      const payload = mode === 'mensal'
        ? { PilotID: Number(pilotId), Amount: parseFloat(amount) }
        : { GuestPilotName: guestName.trim(), Amount: parseFloat(amount) };
      await addRaceEntry(raceId, payload);
      onSave(); onClose();
    } catch (err) { setError(err.response?.data?.error ?? 'Erro ao adicionar piloto.'); }
    finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Adicionar Piloto à Corrida" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* Toggle Mensal / Convidado */}
        <div className="flex rounded-xl overflow-hidden border border-zinc-700/60 text-xs font-semibold">
          <button
            type="button"
            onClick={() => { setMode('mensal'); setError(''); }}
            className={`flex-1 py-2 transition-colors ${mode === 'mensal'
              ? 'bg-emerald-600/25 text-emerald-400'
              : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Mensal
          </button>
          <button
            type="button"
            onClick={() => { setMode('convidado'); setError(''); }}
            className={`flex-1 py-2 transition-colors border-l border-zinc-700/60 ${mode === 'convidado'
              ? 'bg-violet-600/25 text-violet-400'
              : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            Convidado
          </button>
        </div>

        {mode === 'mensal' ? (
          <div>
            <label className="label">Piloto</label>
            <CustomSelect
              value={pilotId}
              onChange={setPilotId}
              options={available.map(p => ({ value: p.id, label: p.name }))}
              placeholder="Selecione…"
              disabled={available.length === 0}
            />
            {available.length === 0 && (
              <p className="text-xs text-zinc-500 mt-1">Todos os pilotos mensais já foram adicionados.</p>
            )}
          </div>
        ) : (
          <div>
            <label className="label">Nome do Piloto Convidado</label>
            <div className="relative">
              <input
                className="input-field"
                placeholder="Digite o nome ou selecione um salvo…"
                value={guestName}
                onChange={e => { setGuestName(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                autoComplete="off"
              />
              {showSuggestions && filteredGuests.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl">
                  <div className="max-h-44 overflow-y-auto">
                    {filteredGuests.map(g => (
                      <button
                        key={g.id}
                        type="button"
                        onMouseDown={() => { setGuestName(g.name); setShowSuggestions(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-700/70 transition-colors"
                      >
                        {g.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            {guestPilots.length > 0 && !showSuggestions && (
              <p className="text-[10px] text-zinc-600 mt-1">
                {guestPilots.length} nome{guestPilots.length !== 1 ? 's' : ''} salvo{guestPilots.length !== 1 ? 's' : ''} — clique no campo para ver.
              </p>
            )}
          </div>
        )}

        <div>
          <label className="label">Valor Individual (R$)</label>
          <input type="number" step="0.01" min="0.01" className="input-field" placeholder="Ex: 250.00"
            value={amount} onChange={e => setAmount(e.target.value)} required />
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button
            type="submit"
            variant="primary"
            className="flex-1"
            disabled={loading || (mode === 'mensal' && available.length === 0)}
          >
            {loading ? 'Adicionando…' : 'Adicionar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

// ─── EditEntryModal ────────────────────────────────────────────────────────────

export function EditEntryModal({ isOpen, onClose, onSave, entry }) {
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && entry) { setAmount(String(entry.amount)); setError(''); }
  }, [isOpen, entry]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount) { setError('Informe o valor.'); return; }
    setLoading(true); setError('');
    try { await updateRaceEntry(entry.id, { Amount: parseFloat(amount) }); onSave(); onClose(); }
    catch { setError('Erro ao atualizar valor.'); }
    finally { setLoading(false); }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Editar Valor Base — ${entry?.pilot?.name ?? entry?.guestPilot?.name ?? ''}`} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Novo Valor Base (R$)</label>
          <input type="number" step="0.01" min="0.01" className="input-field"
            value={amount} onChange={e => setAmount(e.target.value)} required />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 pt-1">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={loading}>
            {loading ? 'Salvando…' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

