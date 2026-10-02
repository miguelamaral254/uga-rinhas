import api from './api';

export const playersService = {
  list: async () => (await api.get('/api/players')).data,
  getProfile: async (playerId) => (await api.get(`/api/players/${playerId}/profile`)).data,
};
