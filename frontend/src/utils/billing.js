/**
 * Returns the active billing month for a pilot.
 *
 * Rule: the month AFTER the most recent closing (any status).
 * If no closings exist, returns the current calendar month.
 * Never returns a future month — capped at today.
 */
export function getActiveBillingMonth(pilot) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const histories = [
    ...(pilot.closingHistories || []),
    ...(pilot.ClosingHistories || []),
  ];

  if (!histories.length) {
    return { year: currentYear, month: currentMonth };
  }

  const refs = histories
    .map(h => h.monthReference || h.MonthReference || '')
    .filter(Boolean)
    .sort()
    .reverse();

  if (!refs.length) {
    return { year: currentYear, month: currentMonth };
  }

  const parts = refs[0].split('-').map(Number);
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
    return { year: currentYear, month: currentMonth };
  }
  const [lastYear, lastMonth] = parts;

  let nextYear = lastYear;
  let nextMonth = lastMonth + 1;
  if (nextMonth > 12) { nextMonth = 1; nextYear++; }

  // Never go beyond the current month
  if (nextYear > currentYear || (nextYear === currentYear && nextMonth > currentMonth)) {
    return { year: currentYear, month: currentMonth };
  }

  return { year: nextYear, month: nextMonth };
}

export function isSameMonth(year, month) {
  const now = new Date();
  return year === now.getFullYear() && month === now.getMonth() + 1;
}
