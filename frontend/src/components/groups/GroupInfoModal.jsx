import React, { useEffect, useState } from 'react';
import { Check, Link as LinkIcon, UserPlus } from 'lucide-react';
import { Modal } from '../common/Modal';
import { TeamMemberRow } from './TeamMemberRow';
import { groupsService } from '../../services/groupsService';

export const GroupInfoModal = ({ group, isOpen, onClose }) => {
  const [joining, setJoining] = useState(false);
  const [joinMessage, setJoinMessage] = useState(null);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setJoining(false);
      setJoinMessage(null);
      setError(null);
      setCopied(false);
    }
  }, [isOpen, group?.id]);

  if (!group) return null;

  const handleJoin = async () => {
    setJoining(true);
    setError(null);
    try {
      await groupsService.join(group.join_code);
      setJoinMessage('Solicitação enviada! Aguarde o dono do grupo aprovar.');
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível pedir para entrar.');
    } finally {
      setJoining(false);
    }
  };

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/groups?join=${group.join_code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={group.name}>
      <p className="lol-lobby-subtitle">
        {group.member_count} {group.member_count === 1 ? 'integrante' : 'integrantes'}
      </p>

      <TeamMemberRow player={group.owner} isCaptain />

      <div className="lol-group-info-actions">
        {!joinMessage && (
          <button type="button" className="lol-sync-button" onClick={handleJoin} disabled={joining}>
            <UserPlus size={16} /> {joining ? 'Enviando...' : 'Pedir para entrar'}
          </button>
        )}
        <button type="button" className="lol-sync-button" onClick={handleCopyLink}>
          {copied ? <Check size={16} /> : <LinkIcon size={16} />}
          {copied ? 'Copiado!' : 'Copiar link de convite'}
        </button>
      </div>

      {joinMessage && <p className="lol-auth-success">{joinMessage}</p>}
      {error && <p className="lol-form-error">{error}</p>}
    </Modal>
  );
};
