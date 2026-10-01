import api from './api';

export const playersService = {
  list: async () => (await api.get('/api/players')).data,
  getProfile: async (playerId) => (await api.get(`/api/players/${playerId}/profile`)).data,
  register: async ({ displayName, riotGameName, riotTagLine }) =>
    (
      await api.post('/api/players', {
        display_name: displayName,
        riot_game_name: riotGameName,
        riot_tag_line: riotTagLine,
      })
    ).data,
};
