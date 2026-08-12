import client from './client';
import { unwrapCollection } from './collections';

export async function getPilots() {
  return unwrapCollection(await client.get('/api/v1/pilot-overviews'));
}

export async function getPilotById(id) {
  const [pilot, expenses, reimbursements] = await Promise.all([
    client.get(`/api/v1/pilots/${id}`),
    client.get(`/api/v1/pilots/${id}/expenses`),
    client.get(`/api/v1/pilots/${id}/reimbursements`),
  ]);
  return {
    ...pilot,
    data: {
      ...pilot.data,
      expenses: expenses.data?.data ?? [],
      reimbursements: reimbursements.data?.data ?? [],
    },
  };
}

export const createPilot = (data) => client.post('/api/v1/pilots', data);
export const updatePilot = (id, data) => client.patch(`/api/v1/pilots/${id}`, data);
export const deletePilot = (id) => client.delete(`/api/v1/pilots/${id}`);

