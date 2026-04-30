import { useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { updatePassword } from '../services/api';
import { Key } from 'lucide-react';

export default function ChangePasswordModal({ isOpen, onClose, userId, onSuccess }) {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.newPassword !== form.confirmPassword) {
      setError('As novas senhas não coincidem.');
      return;
    }

    setLoading(true);
    try {
      await updatePassword(userId, {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao atualizar senha.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Alterar Senha" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Senha Atual</label>
          <input
            name="currentPassword"
            type="password"
            value={form.currentPassword}
            onChange={handleChange}
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="label">Nova Senha</label>
          <input
            name="newPassword"
            type="password"
            value={form.newPassword}
            onChange={handleChange}
            className="input-field"
            required
            minLength="6"
          />
        </div>
        <div>
          <label className="label">Confirmar Nova Senha</label>
          <input
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
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
          <Button type="submit" variant="primary" className="flex-1 flex items-center justify-center gap-2" disabled={loading}>
            <Key size={16} />
            {loading ? 'Atualizando…' : 'Atualizar Senha'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
