import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shuffle, Pencil, LogOut, Crown, UserMinus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { groupsService } from '../services/groupsService';
import { groupMatchesService } from '../services/groupMatchesService';
import { SearchBar } from '../components/common/SearchBar';
import { PaginatedGrid } from '../components/common/PaginatedGrid';
import { Modal } from '../components/common/Modal';
import { MemberCard } from '../components/groups/MemberCard';
import { JoinRequestRow } from '../components/groups/JoinRequestRow';

const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account } = useAuth();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [managingMember, setManagingMember] = useState(null);

  const isOwner = group && account && group.owner_id === account.id;

  const fetchAll = async () => {
    const [groupData, membersData] = await Promise.all([
      groupsService.getById(id),
      groupsService.members(id),
    ]);
    setGroup(groupData);
    setMembers(membersData);
    setSelectedIds((prev) => {
      const next = new Set(membersData.map((m) => m.id));
      return prev.size === 0 ? next : new Set([...prev].filter((pid) => next.has(pid)));
    });
    if (account && groupData.owner_id === account.id) {
      setRequests(await groupsService.listRequests(id));
    }
  };

  useEffect(() => {
    fetchAll()
      .catch((err) => console.error('Error loading group:', err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const filteredMembers = useMemo(() => {
    if (!query) return members;
    const q = query.toLowerCase();
    return members.filter((m) => m.display_name.toLowerCase().includes(q));
  }, [members, query]);

  const toggleSelected = (memberId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const handleStart = async () => {
    setStarting(true);
    setError(null);
    try {
      const match = await groupMatchesService.start(id, Array.from(selectedIds));
      navigate(`/matches/${match.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível iniciar a partida.');
    } finally {
      setStarting(false);
    }
  };

  const handleSaveName = async (e) => {
    e.preventDefault();
    try {
      setGroup(await groupsService.updateName(id, nameDraft));
      setEditingName(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível renomear o grupo.');
    }
  };

  const handleLeave = async () => {
    try {
      await groupsService.removeMember(id, account.id);
      navigate('/groups');
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível sair do grupo.');
    }
  };

  const handleRemoveMember = async () => {
    try {
      await groupsService.removeMember(id, managingMember.id);
      setMembers((prev) => prev.filter((m) => m.id !== managingMember.id));
      setManagingMember(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível remover o jogador.');
    }
  };

  const handlePromoteMember = async () => {
    try {
      setGroup(await groupsService.transferOwnership(id, managingMember.id));
      setManagingMember(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível promover o jogador.');
    }
  };

  const handleApproveRequest = async (playerId) => {
    await groupsService.approveRequest(id, playerId);
    setRequests((prev) => prev.filter((r) => r.id !== playerId));
    setMembers(await groupsService.members(id));
  };

  const handleRejectRequest = async (playerId) => {
    await groupsService.rejectRequest(id, playerId);
    setRequests((prev) => prev.filter((r) => r.id !== playerId));
  };

  if (loading) return <div className="loading-screen">Carregando grupo...</div>;
  if (!group) return <div className="lol-empty">Grupo não encontrado.</div>;

  return (
    <div className="lol-lobby">
      <div className="lol-group-title-row">
        <h1>{group.name}</h1>
        {isOwner && (
          <button
            type="button"
            className="lol-nav-icon-btn"
            onClick={() => {
              setNameDraft(group.name);
              setEditingName(true);
            }}
            aria-label="Editar nome do grupo"
          >
            <Pencil size={16} />
          </button>
        )}
      </div>
      <p className="lol-lobby-subtitle">
        Código de convite: <strong>{group.join_code}</strong>
      </p>

      {!isOwner && (
        <button type="button" className="lol-leave-button" onClick={handleLeave}>
          <LogOut size={14} /> Sair do grupo
        </button>
      )}

      {isOwner && requests.length > 0 && (
        <section className="lol-profile-section">
          <h2>Pedidos para entrar</h2>
          <div className="lol-player-list">
            {requests.map((r) => (
              <JoinRequestRow
                key={r.id}
                request={r}
                onApprove={handleApproveRequest}
                onReject={handleRejectRequest}
              />
            ))}
          </div>
        </section>
      )}

      <SearchBar placeholder="Buscar jogador..." onSearch={setQuery} />

      <PaginatedGrid
        items={filteredMembers}
        emptyMessage="Nenhum jogador encontrado."
        renderItem={(member) => (
          <MemberCard
            key={member.id}
            member={member}
            selected={selectedIds.has(member.id)}
            onToggle={toggleSelected}
            onOpenOptions={isOwner && member.id !== account.id ? setManagingMember : null}
          />
        )}
      />

      <button
        className="lol-sync-button"
        onClick={handleStart}
        disabled={starting || selectedIds.size < 2}
      >
        <Shuffle size={16} />
        {starting ? 'Sorteando...' : 'Sortear e iniciar partida'}
      </button>
      {error && <p className="lol-form-error">{error}</p>}

      <Modal isOpen={editingName} onClose={() => setEditingName(false)} title="Editar nome do grupo">
        <form onSubmit={handleSaveName} className="lol-auth-form">
          <input
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            required
          />
          <button type="submit">Salvar</button>
        </form>
      </Modal>

      <Modal
        isOpen={!!managingMember}
        onClose={() => setManagingMember(null)}
        title={managingMember?.display_name || ''}
      >
        <div className="lol-member-options">
          <button type="button" className="lol-member-option" onClick={handlePromoteMember}>
            <Crown size={16} /> Promover a líder
          </button>
          <button
            type="button"
            className="lol-member-option lol-member-option--danger"
            onClick={handleRemoveMember}
          >
            <UserMinus size={16} /> Remover do grupo
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default GroupDetail;
