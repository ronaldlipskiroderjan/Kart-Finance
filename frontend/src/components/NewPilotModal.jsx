import { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { createPilot, updatePilot } from '../services/api';

const CATEGORIES = ['125cc', 'F4', 'Cadete', 'Shifter'];

const EMPTY = { name: '', categories: [], baseFee: '', closingDay: 10, observations: '' };

function parseCategoriesFromPilot(pilot) {
  if (!pilot?.category) return [];
  return pilot.category.split(',').map((c) => c.trim()).filter(Boolean);
}

export default function NewPilotModal({ isOpen, onClose, onSuccess, pilot = null }) {
  const isEditing = !!pilot;
  const [form, setForm] = useState(
    isEditing
      ? {
          ...pilot,
          categories: parseCategoriesFromPilot(pilot),
          baseFee: pilot.baseFee?.toString() ?? '',
          closingDay: pilot.closingDay?.toString() ?? '10',
        }
      : EMPTY
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleToggleCategory = (cat) => {
    setForm((prev) => {
      const already = prev.categories.includes(cat);
      return {
        ...prev,
        categories: already ? prev.categories.filter((c) => c !== cat) : [...prev.categories, cat],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { categories, ...rest } = form;
      const payload = {
        ...rest,
        category: categories.join(','),
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

  const selectedLabel =
    form.categories.length === 0 ? null : form.categories.join(', ');

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
          <div ref={dropdownRef} className="relative">
            <label className="label">Categoria</label>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="input-field w-full flex items-center justify-between gap-2 text-left"
            >
              <span className={selectedLabel ? 'text-zinc-100 truncate' : 'text-zinc-500'}>
                {selectedLabel ?? 'Selecionar…'}
              </span>
              <ChevronDown
                size={15}
                className={`shrink-0 text-zinc-400 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
              />
            </button>

            {dropdownOpen && (
              <div className="absolute z-20 left-0 right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-xl shadow-xl overflow-hidden">
                {CATEGORIES.map((cat) => {
                  const checked = form.categories.includes(cat);
                  return (
                    <label
                      key={cat}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-zinc-700/60 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleToggleCategory(cat)}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-700 accent-emerald-500 cursor-pointer"
                      />
                      <span className="text-sm text-zinc-200">{cat}</span>
                    </label>
                  );
                })}
              </div>
            )}
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
