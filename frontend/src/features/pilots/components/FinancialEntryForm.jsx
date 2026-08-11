import Button from '../../../components/ui/Button';

const COPY = {
  expense: {
    descriptionLabel: 'Descrição do Gasto',
    descriptionPlaceholder: 'Ex: Troca de pneus',
    amountPlaceholder: 'Ex: 350.00',
    submitLabel: 'Adicionar Gasto',
  },
  reimbursement: {
    descriptionLabel: 'Descrição do Reembolso',
    descriptionPlaceholder: 'Ex: Devolução de taxa',
    amountPlaceholder: 'Ex: 150.00',
    submitLabel: 'Adicionar Reembolso',
  },
};

export default function FinancialEntryForm({ kind, form, onChange, onSubmit, message, loading }) {
  const copy = COPY[kind];

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label">{copy.descriptionLabel}</label>
        <input
          value={form.description}
          onChange={(event) => onChange({ ...form, description: event.target.value })}
          className="input-field"
          placeholder={copy.descriptionPlaceholder}
          required
        />
      </div>
      <div>
        <label className="label">Valor (R$)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          value={form.amount}
          onChange={(event) => onChange({ ...form, amount: event.target.value })}
          className="input-field"
          placeholder={copy.amountPlaceholder}
          required
        />
      </div>
      {message && <p className="text-sm text-zinc-400" role="status">{message}</p>}
      <Button type="submit" variant="primary" className="w-full" disabled={loading}>
        {loading ? 'Salvando…' : copy.submitLabel}
      </Button>
    </form>
  );
}
