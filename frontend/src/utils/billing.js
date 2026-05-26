/**
 * Returns the active billing month for a pilot.
 *
 * Rule: the month AFTER the most recent closing (any status).
 * If no closings exist, returns the current calendar month.
 *
 * Exception to the "never future" cap:
 * If the current calendar month is ALREADY closed (manual close mid-month),
 * we advance to the next month so the card opens clean — without the
 * previous month's expenses. The closed month's data remains accessible
 * in history or via the month navigation arrows.
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

  const parts = refs[0].split(/[-\/]/).map(Number);
  if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) {
    return { year: currentYear, month: currentMonth };
  }
  const [lastYear, lastMonth] = parts;

  let nextYear = lastYear;
  let nextMonth = lastMonth + 1;
  if (nextMonth > 12) { nextMonth = 1; nextYear++; }

  // Cap at current month — BUT only if the current calendar month is NOT
  // already closed. If it is closed (e.g. manual close on day 7 out of 10),
  // we advance to the next month so the new period starts clean.
  if (nextYear > currentYear || (nextYear === currentYear && nextMonth > currentMonth)) {
    const currentMonthRef = `${currentYear}/${String(currentMonth).padStart(2, '0')}`;
    const currentMonthAlreadyClosed = refs.includes(currentMonthRef);

    if (!currentMonthAlreadyClosed) {
      // Current month is open — stay on it
      return { year: currentYear, month: currentMonth };
    }
    // Current month is already closed — open the next one (clean start)
  }

  return { year: nextYear, month: nextMonth };
}

export function isSameMonth(year, month) {
  const now = new Date();
  return year === now.getFullYear() && month === now.getMonth() + 1;
}
