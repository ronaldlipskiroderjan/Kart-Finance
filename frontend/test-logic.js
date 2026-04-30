import fs from 'fs';

const pilot = {
  expenses: [
    { createdAt: "2026-04-10T10:00:00Z", amount: 100 }
  ],
  reimbursements: [],
  closingHistories: [
    { monthReference: "2026/03" }
  ]
};

function getPilotMonthTotals(pilot) {
  const now = new Date("2026-04-15T12:00:00Z"); // simulate april 2026
  let year = now.getFullYear();
  let month = now.getMonth() + 1;

  const closingHistories = pilot.closingHistories || pilot.ClosingHistories || [];
  
  if (closingHistories.length > 0) {
    const sortedHistory = [...closingHistories].sort((a, b) => {
      const refA = a.monthReference || a.MonthReference;
      const refB = b.monthReference || b.MonthReference;
      return refB.localeCompare(refA);
    });
    const latest = sortedHistory[0];
    const latestRef = latest.monthReference || latest.MonthReference;
    const [lYear, lMonth] = latestRef.split('/').map(Number);
    
    if (year < lYear || (year === lYear && month <= lMonth)) {
      month = lMonth + 1;
      year = lYear;
      if (month > 12) {
        month = 1;
        year++;
      }
    }
  }

  const rawExpenses = pilot.expenses || pilot.Expenses || [];
  const rawReimbursements = pilot.reimbursements || pilot.Reimbursements || [];

  const expenses = rawExpenses.filter((e) => {
    const d = new Date(e.createdAt || e.CreatedAt);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });
  console.log("Filtered expenses for", year, month, expenses);
}

getPilotMonthTotals(pilot);