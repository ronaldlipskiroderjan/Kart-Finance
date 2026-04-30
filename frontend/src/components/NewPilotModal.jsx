import { useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { createPilot, updatePilot } from '../services/api';

const CATEGORIES = ['125cc', 'F4', 'Cadete'];

const EMPTY = { name: '', category: '', baseFee: '', closingDay: 10, observations: '' };

export default function NewPilotModal({ isOpen, onClose, onSuccess, pilot = null }) {
  const isEditing = !!pilot;
  const [form, setForm] = useState(
    isEditing
      ? { ...pilot, baseFee: pilot.baseFee?.toString() ?? '', closingDay: pilot.closingDay?.toString() ?? '10' }
      : EMPTY
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        ...form,
        baseFee: parseFloat(form.baseFee) || 0,
        closingDay: parseInt(form.closingDay) || 10,
      };
      if (isEditing) {
        await updatePilot(pilot.id, payload);
      } else {
        await createPilot(payload);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message ?? 'Erro ao salvar piloto.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Piloto' : 'Novo Piloto'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Nome completo</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            className="input-field"
            placeholder="Ex: João Silva"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Categoria</label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              className="input-field"
            >
              <option value="">Selecionar…</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Dia de Fechamento</label>
            <input
              name="closingDay"
              type="number"
              min={1}
              max={31}
              value={form.closingDay}
              onChange={handleChange}
              className="input-field"
              placeholder="Ex: 10"
              required
            />
          </div>
        </div>

        <div>
          <label className="label">Mensalidade Base (R$)</label>
          <input
            name="baseFee"
            type="number"
            step="0.01"
            min={0}
            value={form.baseFee}
            onChange={handleChange}
            className="input-field"
            placeholder="Ex: 1500.00"
            required
          />
        </div>

        <div>
          <label className="label">Observações</label>
          <textarea
            name="observations"
            value={form.observations}
            onChange={handleChange}
            rows={3}
            className="input-field resize-none"
            placeholder="Notas internas sobre o piloto…"
          />
        </div>

        {error && (
          <div className="bg-red-900/40 border border-red-800/50 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="primary" className="flex-1" disabled={loading}>
            {loading ? 'Salvando…' : isEditing ? 'Salvar' : 'Criar Piloto'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
