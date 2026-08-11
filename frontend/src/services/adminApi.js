import client from './client';

export const getAdmins = () => client.get('/api/v1/admins');
export const createAdmin = (data) => client.post('/api/v1/admins', data);
export const updateAdmin = (id, data) => client.patch(`/api/v1/admins/${id}`, data);
export const updatePassword = (id, data) => client.put(`/api/v1/admins/${id}/password`, data);
export const deleteAdmin = (id) => client.delete(`/api/v1/admins/${id}`);

