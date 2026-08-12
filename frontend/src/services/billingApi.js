import client from './client';
import { unwrapCollection } from './collections';

const period = (year, month) => `${year}-${String(month).padStart(2, '0')}`;

export const getMonthlySummary = (pilotId, year, month) =>
  client.get(`/api/v1/pilots/${pilotId}/closing-preview`, { params: { period: period(year, month) } });

export const finalizeClosing = (pilotId, year, month) =>
  client.post(`/api/v1/pilots/${pilotId}/closings`, { period: period(year, month) });

export async function getPilotHistory(pilotId) {
  return unwrapCollection(await client.get(`/api/v1/pilots/${pilotId}/closings`));
}

export const payClosing = (closingId) => client.post(`/api/v1/closings/${closingId}/payments`);
export const deleteClosing = (closingId) => client.delete(`/api/v1/closings/${closingId}`);

export const createExpense = ({ pilot, description, amount, year, month }) =>
  client.post(`/api/v1/pilots/${pilot.id}/expenses`, { description, amount, period: period(year, month) });
export const deleteExpense = (id) => client.delete(`/api/v1/expenses/${id}`);

export const createReimbursement = ({ pilot, description, amount, year, month }) =>
  client.post(`/api/v1/pilots/${pilot.id}/reimbursements`, { description, amount, period: period(year, month) });
export const deleteReimbursement = (id) => client.delete(`/api/v1/reimbursements/${id}`);

