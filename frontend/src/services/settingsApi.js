import client from './client';

export const getConfig = () => client.get('/api/v1/settings');
export const updateConfig = (data) => client.patch('/api/v1/settings', data);

