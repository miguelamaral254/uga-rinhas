import api from './api';

export const authService = {
  register: async ({
    username,
    password,
    passwordConfirmation,
    displayName,
    riotGameName,
    riotTagLine,
  }) =>
    (
      await api.post('/api/auth/register', {
        username,
        password,
        password_confirmation: passwordConfirmation,
        display_name: displayName,
        riot_game_name: riotGameName,
        riot_tag_line: riotTagLine,
      })
    ).data,
  login: async ({ username, password }) =>
    (await api.post('/api/auth/login', { username, password })).data,
  me: async () => (await api.get('/api/auth/me')).data,
  updateProfile: async (displayName) =>
    (await api.patch('/api/auth/me', { display_name: displayName })).data,
  changePassword: async ({ currentPassword, newPassword, newPasswordConfirmation }) =>
    (
      await api.post('/api/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation,
      })
    ).data,
};
