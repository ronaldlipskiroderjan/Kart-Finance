import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Receipt, X } from 'lucide-react';

import Modal from '../../../components/ui/Modal';
import Button from '../../../components/ui/Button';
import { formatBRL } from '../../../utils/formatters';
import { getProblemMessage } from '../../../services/client';
import {
  addRaceAgendaExpense,
  deleteRaceAgendaExpense,
  getRaceAgenda,
  setRaceAgendaSaldo,
} from '../../../services/racesApi';

export default function RaceAgendaModal({ isOpen, onClose, race }) {
  const [agenda, setAgenda] = useState(null);
  const [loading, setLoading] = useState(false);
  const [balance, setBalance] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const refresh = useCallback(async () => {
    if (!race) return;
    setLoading(true);
    try {
      const response = await getRaceAgenda(race.id);
      setAgenda(response.data);
      setBalance(response.data.saldo > 0 ? String(response.data.saldo) : '');
    } catch (error) {
      setMessage({ type: 'error', text: getProblemMessage(error, 'Erro ao carregar a agenda') });
    } finally {
      setLoading(false);
    }
  }, [race]);

  useEffect(() => {
    if (!isOpen) return;
    setDescription('');
    setAmount('');
    setMessage(null);
    refresh();
  }, [isOpen, refresh]);

  const totals = useMemo(() => {
    const expenses = agenda?.expenses ?? [];
    const spent = expenses.reduce((total, entry) => total + Number(entry.amount || 0), 0);
    const available = Number(agenda?.saldo || 0);
    return { expenses, spent, available, remaining: available - spent };
  }, [agenda]);

  const saveBalance = async () => {
    const parsed = Number(balance);
    if (!Number.isFinite(parsed) || parsed < 0) return;
    setSaving(true);
    try {
      const response = await setRaceAgendaSaldo(race.id, { saldo: parsed });
      setAgenda(response.data);
      setMessage({ type: 'success', text: 'Saldo salvo com sucesso.' });
    } catch (error) {
      setMessage({ type: 'error', text: getProblemMessage(error, 'Erro ao salvar saldo') });
    } finally {
      setSaving(false);
    }
  };

  const addExpense = async () => {
    const parsed = Number(amount);
    if (!description.trim() || !Number.isFinite(parsed) || parsed <= 0) return;
    setSaving(true);
    try {
      const response = await addRaceAgendaExpense(race.id, { description: description.trim(), amount: parsed });
      setAgenda(response.data);
      setDescription('');
      setAmount('');
      setMessage({ type: 'success', text: 'Gasto adicionado.' });
    } catch (error) {
      setMessage({ type: 'error', text: getProblemMessage(error, 'Erro ao adicionar gasto') });
    } finally {
      setSaving(false);
    }
  };

  const removeExpense = async (expenseId) => {
    try {
      await deleteRaceAgendaExpense(expenseId);
      await refresh();
    } catch (error) {
      setMessage({ type: 'error', text: getProblemMessage(error, 'Erro ao remover gasto') });
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Viagem — ${race?.name ?? ''}`} size="md">
      {loading ? (
        <div className="py-10 flex justify-center" role="status">
          <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          {message && (
            <p className={`text-xs ${message.type === 'error' ? 'text-red-400' : 'text-emerald-400'}`} role="status">
              {message.text}
            </p>
          )}

          <div className="grid grid-cols-3 gap-2">
            <Balance label="Saldo" value={totals.available} tone="text-blue-400" />
            <Balance label="Gastos" value={totals.spent} tone="text-red-400" />
            <Balance label="Restante" value={totals.remaining} tone={totals.remaining >= 0 ? 'text-emerald-400' : 'text-red-400'} />
          </div>

          <section>
            <Label>Saldo disponível (R$)</Label>
            <div className="flex gap-2">
              <MoneyInput value={balance} onChange={setBalance} placeholder="Ex: 500,00" />
              <Button variant="primary" className="px-4 text-xs" onClick={saveBalance} disabled={saving || balance === ''}>
                {saving ? '…' : 'Salvar'}
              </Button>
            </div>
          </section>

          <section>
            <Label>Adicionar gasto</Label>
            <div className="flex gap-2">
              <input className="input-field flex-1 text-xs py-1.5" placeholder="Descrição" value={description} onChange={(event) => setDescription(event.target.value)} />
              <MoneyInput value={amount} onChange={setAmount} className="w-24" placeholder="R$" />
              <button onClick={addExpense} disabled={saving || !description.trim() || !amount} className="flex items-center gap-1 bg-red-600/20 text-red-400 text-xs px-2.5 py-1.5 rounded-lg disabled:opacity-40">
                <Plus size={12} /> Add
              </button>
            </div>
          </section>

          <section>
            <Label><Receipt size={10} /> Gastos</Label>
            {totals.expenses.length === 0 ? (
              <p className="text-xs text-zinc-600">Nenhum gasto registrado ainda.</p>
            ) : totals.expenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between bg-zinc-800/60 rounded-lg px-2.5 py-2 mb-1.5">
                <span className="text-xs text-zinc-200 truncate">{expense.description}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-red-400">−{formatBRL(expense.amount)}</span>
                  <button onClick={() => removeExpense(expense.id)} aria-label={`Remover ${expense.description}`} className="text-zinc-600 hover:text-red-400"><X size={12} /></button>
                </div>
              </div>
            ))}
          </section>
        </div>
      )}
    </Modal>
  );
}

function Balance({ label, value, tone }) {
  return <div className="bg-zinc-800/60 rounded-xl p-2.5 text-center"><p className="text-[10px] text-zinc-500">{label}</p><p className={`text-xs font-bold ${tone}`}>{formatBRL(value)}</p></div>;
}

function Label({ children }) {
  return <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1">{children}</p>;
}

function MoneyInput({ value, onChange, className = 'flex-1', placeholder }) {
  return <input type="number" min="0" step="0.01" className={`input-field text-sm ${className}`} placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} />;
}
