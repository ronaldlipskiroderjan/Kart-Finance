import client from './client';

const racePayload = (data) => ({
  name: data.name ?? data.Name,
  date: data.date ?? data.Date,
  description: data.description ?? data.Description ?? '',
});

const entryPayload = (data) => ({
  pilotId: data.pilotId ?? data.PilotID ?? null,
  guestPilotName: data.guestPilotName ?? data.GuestPilotName ?? '',
  amount: data.amount ?? data.Amount,
});

const amountPayload = (data) => ({ amount: data.amount ?? data.Amount });
const detailPayload = (data) => ({
  description: data.description ?? data.Description,
  amount: data.amount ?? data.Amount,
});

export const getPilotRaceEntries = (pilotId) => client.get(`/api/v1/pilots/${pilotId}/race-entries`);
export const getRaceWeekends = () => client.get('/api/v1/race-weekends');
export const getRaceWeekendById = (id) => client.get(`/api/v1/race-weekends/${id}`);
export const createRaceWeekend = (data) => client.post('/api/v1/race-weekends', racePayload(data));
export const updateRaceWeekend = (id, data) => client.patch(`/api/v1/race-weekends/${id}`, racePayload(data));
export const deleteRaceWeekend = (id) => client.delete(`/api/v1/race-weekends/${id}`);

export const getGuestPilots = () => client.get('/api/v1/guest-pilots');
export const addRaceEntry = (raceId, data) => client.post(`/api/v1/race-weekends/${raceId}/entries`, entryPayload(data));
export const updateRaceEntry = (entryId, data) => client.patch(`/api/v1/race-entries/${entryId}`, amountPayload(data));
export const removeRaceEntry = (entryId) => client.delete(`/api/v1/race-entries/${entryId}`);
export const payRaceEntry = (entryId) => client.post(`/api/v1/race-entries/${entryId}/payments`);
export const addRaceEntryExpense = (entryId, data) => client.post(`/api/v1/race-entries/${entryId}/expenses`, detailPayload(data));
export const deleteRaceEntryExpense = (expenseId) => client.delete(`/api/v1/race-entry-expenses/${expenseId}`);
export const addRaceEntryReimbursement = (entryId, data) => client.post(`/api/v1/race-entries/${entryId}/reimbursements`, detailPayload(data));
export const deleteRaceEntryReimbursement = (id) => client.delete(`/api/v1/race-entry-reimbursements/${id}`);

export const getRaceAgenda = (raceId) => client.get(`/api/v1/race-weekends/${raceId}/agenda`);
export const setRaceAgendaSaldo = (raceId, data) => client.put(`/api/v1/race-weekends/${raceId}/agenda`, { saldo: data.saldo ?? data.Saldo });
export const addRaceAgendaExpense = (raceId, data) => client.post(`/api/v1/race-weekends/${raceId}/agenda/expenses`, detailPayload(data));
export const deleteRaceAgendaExpense = (id) => client.delete(`/api/v1/race-agenda-expenses/${id}`);

