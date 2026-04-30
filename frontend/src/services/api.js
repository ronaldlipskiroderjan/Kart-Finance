import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json' },
});

// Helper to convert PascalCase to camelCase
const toCamel = (str) => {
  if (str === 'ID') return 'id';
  let camel = str.charAt(0).toLowerCase() + str.slice(1);
  if (camel.endsWith('ID')) {
    camel = camel.slice(0, -2) + 'Id';
  }
  return camel;
};

// Recursive function to apply the conversion to all object keys
const keysToCamel = (o) => {
  if (o === null || o === undefined) return o;
  if (Array.isArray(o)) {
    return o.map(keysToCamel);
  }
  if (typeof o === 'object') {
    const n = {};
    Object.keys(o).forEach((k) => {
      n[toCamel(k)] = keysToCamel(o[k]);
    });
    return n;
  }
  return o;
};

// Intercept responses to map Go PascalCase structs to camelCase
api.interceptors.response.use((response) => {
  if (response.data) {
    response.data = keysToCamel(response.data);
  }
  return response;
}, (error) => {
  if (error.response && error.response.data) {
    error.response.data = keysToCamel(error.response.data);
  }
  return Promise.reject(error);
});

// ─── Auth ─────────────────────────────────────────
/**
 * POST /api/auth/login
 * @param {{ email: string, password: string }} credentials
 * @returns {{ success: boolean, name: string, email: string }}
 */
export const loginUser = (credentials) => api.post('auth/login', credentials);

// ─── Admins ───────────────────────────────────────
export const getAdmins = () => api.get('admins');
export const createAdmin = (data) => api.post('admins', data);
export const updateAdmin = (id, data) => api.put(`admins/${id}`, data);
export const updatePassword = (id, data) => api.put(`admins/${id}/password`, data);
export const deleteAdmin = (id) => api.delete(`admins/${id}`);

// ─── Pilots ───────────────────────────────────────
export const getPilots = () => api.get('pilots');
export const getPilotById = (id) => api.get(`pilots/${id}`);
export const createPilot = (data) => api.post('pilots', data);
export const updatePilot = (id, data) => api.put(`pilots/${id}`, data);
export const deletePilot = (id) => api.delete(`pilots/${id}`);

// ─── Expenses ─────────────────────────────────────
export const getAllExpenses = () => api.get('expenses');
export const createExpense = (data) => api.post('expenses', data);
export const deleteExpense = (id) => api.delete(`expenses/${id}`);

// ─── Reimbursements ───────────────────────────────
export const getAllReimbursements = () => api.get('reimbursements');
export const createReimbursement = (data) => api.post('reimbursements', data);
export const deleteReimbursement = (id) => api.delete(`reimbursements/${id}`);

// ─── Closing ──────────────────────────────────────
export const getMonthlySummary = (pilotId, year, month) =>
  api.get(`closing/${pilotId}`, { params: { year, month } });

export const finalizeClosing = (pilotId, year, month) =>
  api.post(`closing/${pilotId}/finalize`, null, { params: { year, month } });

export const getPilotHistory = (pilotId) =>
  api.get(`closing/${pilotId}/history`);

export const payClosing = (closingId) =>
  api.put(`closing/history/${closingId}/pay`);

export default api;
