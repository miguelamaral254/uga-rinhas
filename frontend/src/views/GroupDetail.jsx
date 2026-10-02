import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shuffle, ArrowRight, ArrowLeft, Play, Pencil, LogOut, Crown, UserMinus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { groupsService } from '../services/groupsService';
import { groupMatchesService } from '../services/groupMatchesService';
import { SearchBar } from '../components/common/SearchBar';
import { PaginatedGrid } from '../components/common/PaginatedGrid';
import { Modal } from '../components/common/Modal';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { MemberCard } from '../components/groups/MemberCard';
import { JoinRequestRow } from '../components/groups/JoinRequestRow';
import { GroupPodium } from '../components/groups/GroupPodium';
import { TeamBuilder } from '../components/groups/TeamBuilder';

const formatDuration = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const shuffleArray = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account } = useAuth();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  const [activeTab, setActiveTab] = useState('inicio');

  const [rinhaStep, setRinhaStep] = useState('select');
  const [pool, setPool] = useState([]);
  const [teamBlue, setTeamBlue] = useState([]);
  const [teamRed, setTeamRed] = useState([]);

  const [matchHistory, setMatchHistory] = useState([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [managingMember, setManagingMember] = useState(null);

  const isOwner = group && account && group.owner_id === account.id;

  const fetchAll = async () => {
    const [groupData, membersData, leaderboardData] = await Promise.all([
      groupsService.getById(id),
      groupsService.members(id),
      groupsService.leaderboard(id),
    ]);
    setGroup(groupData);
    setMembers(membersData);
    setLeaderboard(leaderboardData);
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

  useEffect(() => {
    if (activeTab !== 'historico' || historyLoaded) return;
    groupsService
      .matchHistory(id)
      .then((data) => {
        setMatchHistory(data);
        setHistoryLoaded(true);
      })
      .catch((err) => console.error('Error loading match history:', err));
  }, [activeTab, historyLoaded, id]);

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

  const handleShuffleAndNext = () => {
    const selectedMembers = shuffleArray(members.filter((m) => selectedIds.has(m.id)));
    const midpoint = Math.ceil(selectedMembers.length / 2);
    setPool([]);
    setTeamBlue(selectedMembers.slice(0, midpoint));
    setTeamRed(selectedMembers.slice(midpoint));
    setError(null);
    setRinhaStep('arrange');
  };

  const handleNext = () => {
    setPool(members.filter((m) => selectedIds.has(m.id)));
    setTeamBlue([]);
    setTeamRed([]);
    setError(null);
    setRinhaStep('arrange');
  };

  const handleConfirmStart = async () => {
    setStarting(true);
    setError(null);
    try {
      const match = await groupMatchesService.start(
        id,
        teamBlue.map((p) => p.id),
        teamRed.map((p) => p.id)
      );
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

  if (loading) return <LoadingScreen label="Carregando grupo" />;
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

      <div className="lol-tabs">
        <button
          type="button"
          className={`lol-tab${activeTab === 'inicio' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('inicio')}
        >
          Início
        </button>
        <button
          type="button"
          className={`lol-tab${activeTab === 'historico' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('historico')}
        >
          Histórico
        </button>
        <button
          type="button"
          className={`lol-tab${activeTab === 'rinha' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('rinha')}
        >
          Rinha!
        </button>
      </div>

      {activeTab === 'inicio' && (
        <>
          <div className="lol-group-header">
            <div className="lol-group-header-main">
              <p className="lol-lobby-subtitle">
                Código de convite: <strong>{group.join_code}</strong>
              </p>
              {!isOwner && (
                <button type="button" className="lol-leave-button" onClick={handleLeave}>
                  <LogOut size={14} /> Sair do grupo
                </button>
              )}
            </div>

            <GroupPodium entries={leaderboard} />
          </div>

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
        </>
      )}

      {activeTab === 'historico' && (
        <section className="lol-profile-section">
          {matchHistory.length === 0 ? (
            <p className="lol-profile-section-empty">Nenhuma rinha registrada ainda.</p>
          ) : (
            <table className="lol-match-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Time Azul</th>
                  <th>Time Vermelho</th>
                  <th>Duração</th>
                </tr>
              </thead>
              <tbody>
                {matchHistory.map((match) => (
                  <tr key={match.match_id}>
                    <td>{new Date(match.ended_at).toLocaleString('pt-BR')}</td>
                    <td className={match.winning_team === 'BLUE' ? 'lol-win' : undefined}>
                      {match.team_blue.map((p) => p.display_name).join(', ')}
                    </td>
                    <td className={match.winning_team === 'RED' ? 'lol-win' : undefined}>
                      {match.team_red.map((p) => p.display_name).join(', ')}
                    </td>
                    <td>{formatDuration(match.duration_seconds)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {activeTab === 'rinha' && (
        <>
          {rinhaStep === 'select' && (
            <>
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

              <div className="lol-rematch-buttons">
                <button
                  type="button"
                  className="lol-sync-button"
                  onClick={handleShuffleAndNext}
                  disabled={selectedIds.size < 2}
                >
                  <Shuffle size={16} /> Sortear e iniciar partida
                </button>
                <button
                  type="button"
                  className="lol-sync-button"
                  onClick={handleNext}
                  disabled={selectedIds.size < 2}
                >
                  Próximo <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}

          {rinhaStep === 'arrange' && (
            <>
              <TeamBuilder
                pool={pool}
                teamBlue={teamBlue}
                teamRed={teamRed}
                onChange={(nextPool, nextBlue, nextRed) => {
                  setPool(nextPool);
                  setTeamBlue(nextBlue);
                  setTeamRed(nextRed);
                }}
              />

              <div className="lol-rematch-buttons">
                <button
                  type="button"
                  className="lol-sync-button"
                  onClick={() => setRinhaStep('select')}
                >
                  <ArrowLeft size={16} /> Voltar
                </button>
                <button
                  type="button"
                  className="lol-sync-button"
                  onClick={handleConfirmStart}
                  disabled={starting || teamBlue.length === 0 || teamRed.length === 0}
                >
                  <Play size={16} /> {starting ? 'Iniciando...' : 'Iniciar partida'}
                </button>
              </div>
            </>
          )}
        </>
      )}

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
