/**
 * Formats a number (or string) as Brazilian Real currency.
 * e.g. 1234.56 → "R$ 1.234,56"
 */
export function formatBRL(value) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(num);
}

/**
 * Formats an ISO date string as DD/MM/YYYY.
 * e.g. "2025-04-23T00:00:00Z" → "23/04/2025"
 */
export function formatDate(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Sao_Paulo',
  }).format(date);
}

/**
 * Returns "Abril/2025" style label from year+month numbers.
 */
export function formatMonthLabel(year, month) {
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
}

/**
 * Returns current year and month as { year, month }.
 */
export function currentYearMonth() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}
