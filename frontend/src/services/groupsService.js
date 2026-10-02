import api from './api';

export const groupsService = {
  listMine: async () => (await api.get('/api/groups/mine')).data,
  getById: async (groupId) => (await api.get(`/api/groups/${groupId}`)).data,
  create: async (name) => (await api.post('/api/groups', { name })).data,
  join: async (joinCode) => (await api.post('/api/groups/join', { join_code: joinCode })).data,
  members: async (groupId) => (await api.get(`/api/groups/${groupId}/members`)).data,
  leaderboard: async (groupId) => (await api.get(`/api/groups/${groupId}/leaderboard`)).data,
};
