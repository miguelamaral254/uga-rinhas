import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Profile = () => {
  const { account, updateProfile, changePassword } = useAuth();

  const [displayName, setDisplayName] = useState(account?.display_name || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);
  const [profileError, setProfileError] = useState(null);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    newPasswordConfirmation: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileError(null);
    setProfileMessage(null);
    try {
      await updateProfile(displayName);
      setProfileMessage('Apelido atualizado.');
    } catch (err) {
      setProfileError(err.response?.data?.message || 'Não foi possível atualizar o apelido.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.newPasswordConfirmation) {
      setPasswordError('As senhas não conferem.');
      return;
    }
    setPasswordSaving(true);
    setPasswordError(null);
    setPasswordMessage(null);
    try {
      await changePassword(passwordForm);
      setPasswordMessage('Senha alterada.');
      setPasswordForm({ currentPassword: '', newPassword: '', newPasswordConfirmation: '' });
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Não foi possível trocar a senha.');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (!account) return null;

  return (
    <div className="lol-auth lol-profile-page">
      <h1>Meu perfil</h1>

      <section className="lol-profile-section">
        <h2>Riot ID vinculado</h2>
        <p className="lol-profile-section-empty">
          {account.riot_game_name}#{account.riot_tag_line} — não pode ser alterado ou removido.
        </p>
      </section>

      <section className="lol-profile-section">
        <h2>Apelido</h2>
        <form onSubmit={handleProfileSubmit} className="lol-auth-form">
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
          <button type="submit" disabled={profileSaving}>
            {profileSaving ? 'Salvando...' : 'Salvar apelido'}
          </button>
        </form>
        {profileMessage && <p className="lol-auth-success">{profileMessage}</p>}
        {profileError && <p className="lol-form-error">{profileError}</p>}
      </section>

      <section className="lol-profile-section">
        <h2>Trocar senha</h2>
        <form onSubmit={handlePasswordSubmit} className="lol-auth-form">
          <input
            type="password"
            placeholder="Senha atual"
            value={passwordForm.currentPassword}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, currentPassword: e.target.value })
            }
            required
          />
          <input
            type="password"
            placeholder="Nova senha"
            value={passwordForm.newPassword}
            onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
            minLength={8}
            required
          />
          <input
            type="password"
            placeholder="Confirmar nova senha"
            value={passwordForm.newPasswordConfirmation}
            onChange={(e) =>
              setPasswordForm({ ...passwordForm, newPasswordConfirmation: e.target.value })
            }
            minLength={8}
            required
          />
          <p className="lol-auth-hint">
            A senha precisa ter 8+ caracteres, com maiúscula, minúscula, número e símbolo.
          </p>
          <button type="submit" disabled={passwordSaving}>
            {passwordSaving ? 'Salvando...' : 'Trocar senha'}
          </button>
        </form>
        {passwordMessage && <p className="lol-auth-success">{passwordMessage}</p>}
        {passwordError && <p className="lol-form-error">{passwordError}</p>}
      </section>
    </div>
  );
};

export default Profile;
