import axios from 'axios';

let csrfToken = '';

const client = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  withCredentials: true,
});

client.interceptors.request.use((config) => {
  const method = config.method?.toUpperCase();
  if (csrfToken && method && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    config.headers['X-CSRF-Token'] = csrfToken;
  }
  return config;
});

export function setCSRFToken(value) {
  csrfToken = value || '';
}

export function getProblemMessage(error, fallback = 'Não foi possível concluir a operação') {
  return error?.response?.data?.detail
    || error?.response?.data?.message
    || error?.response?.data?.title
    || error?.response?.data?.error
    || error?.message
    || fallback;
}

export default client;

