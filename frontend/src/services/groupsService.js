import api from './api';

export const groupsService = {
  listMine: async () => (await api.get('/api/groups/mine')).data,
  discover: async () => (await api.get('/api/groups/discover')).data,
  lookupByCode: async (joinCode) => (await api.get(`/api/groups/lookup/${joinCode}`)).data,
  getById: async (groupId) => (await api.get(`/api/groups/${groupId}`)).data,
  create: async (name) => (await api.post('/api/groups', { name })).data,
  join: async (joinCode) => (await api.post('/api/groups/join', { join_code: joinCode })).data,
  members: async (groupId) => (await api.get(`/api/groups/${groupId}/members`)).data,
  leader: async (groupId) => (await api.get(`/api/groups/${groupId}/leader`)).data,
  leaderboard: async (groupId) => (await api.get(`/api/groups/${groupId}/leaderboard`)).data,
  matchHistory: async (groupId) => (await api.get(`/api/groups/${groupId}/matches`)).data,
  updateName: async (groupId, name) =>
    (await api.patch(`/api/groups/${groupId}`, { name })).data,
  uploadImage: async (groupId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return (
      await api.post(`/api/groups/${groupId}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    ).data;
  },
  removeMember: async (groupId, playerId) =>
    api.delete(`/api/groups/${groupId}/members/${playerId}`),
  listRequests: async (groupId) => (await api.get(`/api/groups/${groupId}/requests`)).data,
  approveRequest: async (groupId, playerId) =>
    api.post(`/api/groups/${groupId}/requests/${playerId}/approve`),
  rejectRequest: async (groupId, playerId) =>
    api.post(`/api/groups/${groupId}/requests/${playerId}/reject`),
  transferOwnership: async (groupId, newOwnerId) =>
    (await api.post(`/api/groups/${groupId}/transfer-owner`, { new_owner_id: newOwnerId })).data,
};
