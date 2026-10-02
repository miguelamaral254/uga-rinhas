import React, { useState } from 'react';
import { KeyRound, Lock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/common/Modal';

const Profile = () => {
  const { account, updateProfile, changePassword } = useAuth();

  const [displayName, setDisplayName] = useState(account?.display_name || '');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);
  const [profileError, setProfileError] = useState(null);

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    newPasswordConfirmation: '',
  });
  const [passwordSaving, setPasswordSaving] = useState(false);
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

  const resetPasswordForm = () => {
    setPasswordForm({ currentPassword: '', newPassword: '', newPasswordConfirmation: '' });
    setPasswordError(null);
  };

  const closePasswordModal = () => {
    setPasswordModalOpen(false);
    resetPasswordForm();
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.newPasswordConfirmation) {
      setPasswordError('As senhas não conferem.');
      return;
    }
    setPasswordSaving(true);
    setPasswordError(null);
    try {
      await changePassword(passwordForm);
      closePasswordModal();
    } catch (err) {
      setPasswordError(err.response?.data?.message || 'Não foi possível trocar a senha.');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (!account) return null;

  return (
    <div className="lol-profile">
      <header className="lol-profile-header">
        <div className="lol-profile-icon-frame">
          {account.profile_icon_url ? (
            <img src={account.profile_icon_url} alt="" className="lol-profile-icon" />
          ) : (
            <div className="lol-profile-icon lol-profile-icon--placeholder" />
          )}
          {account.summoner_level && (
            <span className="lol-profile-level">{account.summoner_level}</span>
          )}
        </div>
        <div>
          <h1 className="lol-profile-name">{account.display_name}</h1>
          <p className="lol-profile-riot-id">
            {account.riot_game_name}
            <span className="lol-profile-tag">#{account.riot_tag_line}</span>
          </p>
          <p className="lol-settings-locked">
            <Lock size={12} /> Riot ID vinculado permanentemente
          </p>
        </div>
      </header>

      <div className="lol-settings-grid">
        <section className="lol-settings-card">
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

        <section className="lol-settings-card">
          <h2>Senha</h2>
          <p className="lol-profile-section-empty">
            Mantenha sua conta segura trocando a senha periodicamente.
          </p>
          <button
            type="button"
            className="lol-sync-button"
            onClick={() => setPasswordModalOpen(true)}
          >
            <KeyRound size={16} /> Trocar senha
          </button>
        </section>
      </div>

      <Modal isOpen={passwordModalOpen} onClose={closePasswordModal} title="Trocar senha">
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
          {passwordError && <p className="lol-form-error">{passwordError}</p>}
          <button type="submit" disabled={passwordSaving}>
            {passwordSaving ? 'Salvando...' : 'Trocar senha'}
          </button>
        </form>
      </Modal>
    </div>
  );
};

export default Profile;
