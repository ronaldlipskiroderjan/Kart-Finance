import client, { setCSRFToken } from './client';

export async function createSession(credentials) {
  const response = await client.post('/api/v1/auth/sessions', credentials);
  setCSRFToken(response.data.csrfToken);
  return response;
}

export async function getCurrentUser() {
  const response = await client.get('/api/v1/me');
  setCSRFToken(response.data.csrfToken);
  return response;
}

export async function deleteCurrentSession() {
  try {
    return await client.delete('/api/v1/auth/sessions/current');
  } finally {
    setCSRFToken('');
  }
}

