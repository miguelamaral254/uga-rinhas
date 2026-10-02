import api from './api';

export const groupMatchesService = {
  start: async (groupId, playerIds) =>
    (await api.post('/api/group-matches', { group_id: groupId, player_ids: playerIds })).data,
  getById: async (id) => (await api.get(`/api/group-matches/${id}`)).data,
  begin: async (id) => (await api.post(`/api/group-matches/${id}/begin`)).data,
  rematch: async (id) => (await api.post(`/api/group-matches/${id}/rematch`)).data,
  finish: async (id, winningTeam) =>
    (await api.post(`/api/group-matches/${id}/finish`, { winning_team: winningTeam })).data,
};
