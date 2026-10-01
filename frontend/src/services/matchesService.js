import api from './api';

export const matchesService = {
  listForPlayer: async (playerId) => (await api.get(`/api/matches/players/${playerId}`)).data,
  sync: async () => (await api.post('/api/matches/sync')).data,
};
