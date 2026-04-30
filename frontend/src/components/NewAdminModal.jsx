import { useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { createAdmin } from '../services/api';

export default function NewAdminModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
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
      await createAdmin(form);
      setForm({ name: '', email: '', password: '' });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar administrador');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Novo Administrador" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Nome</label>
          <input
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="label">Senha Provisória</label>
          <input
            name="password"
            type="text"
            value={form.password}
            onChange={handleChange}
            className="input-field"
            required
            minLength="6"
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
            {loading ? 'Criando…' : 'Criar Conta'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
