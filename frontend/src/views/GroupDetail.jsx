import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Shuffle,
  ArrowRight,
  ArrowLeft,
  Play,
  Pencil,
  LogOut,
  Crown,
  UserMinus,
  Image as ImageIcon,
} from 'lucide-react';
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
import { GroupLeaderCard } from '../components/groups/GroupLeaderCard';
import { TeamBuilder } from '../components/groups/TeamBuilder';
import { TeamMemberRow } from '../components/groups/TeamMemberRow';
import { MatchRosterEntry } from '../components/matches/MatchRosterEntry';
import { formatDuration, formatRelativeTime } from '../utils/matchFormat';

const REQUIRED_PLAYERS = 10;
const MAX_IMAGE_BYTES = 1024 * 1024;

const shuffleArray = (items) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const GroupMatchCard = ({ match, onClick }) => (
  <div className="lol-match-card lol-group-match-card" onClick={onClick}>
    <div className="lol-match-card-meta">
      <span className="lol-match-card-queue">Rinha 5x5</span>
      <span className="lol-match-card-time">{formatRelativeTime(match.ended_at)}</span>
      <span className="lol-match-card-duration">{formatDuration(match.duration_seconds)}</span>
    </div>

    <div className="lol-group-match-teams">
      <div className="lol-group-match-team lol-team lol-team--blue">
        <h2>
          Time Azul
          {match.winning_team === 'BLUE' && <Crown size={13} className="lol-captain-icon" />}
        </h2>
        <div className="lol-match-card-roster-col">
          {match.team_blue.map((p) => (
            <MatchRosterEntry
              key={p.id}
              player={{ player_id: p.id, display_name: p.display_name, icon_url: p.profile_icon_url }}
            />
          ))}
        </div>
      </div>
      <div className="lol-group-match-team lol-team lol-team--red">
        <h2>
          Time Vermelho
          {match.winning_team === 'RED' && <Crown size={13} className="lol-captain-icon" />}
        </h2>
        <div className="lol-match-card-roster-col">
          {match.team_red.map((p) => (
            <MatchRosterEntry
              key={p.id}
              player={{ player_id: p.id, display_name: p.display_name, icon_url: p.profile_icon_url }}
            />
          ))}
        </div>
      </div>
    </div>
  </div>
);

const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account } = useAuth();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [requests, setRequests] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [leader, setLeader] = useState(null);
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

  const [editingGroup, setEditingGroup] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [groupSaving, setGroupSaving] = useState(false);
  const [managingMember, setManagingMember] = useState(null);
  const [selectedMatch, setSelectedMatch] = useState(null);

  const isOwner = group && account && group.owner_id === account.id;

  const fetchAll = async () => {
    const [groupData, membersData, leaderboardData, leaderData] = await Promise.all([
      groupsService.getById(id),
      groupsService.members(id),
      groupsService.leaderboard(id),
      groupsService.leader(id),
    ]);
    setGroup(groupData);
    setMembers(membersData);
    setLeaderboard(leaderboardData);
    setLeader(leaderData);
    setSelectedIds((prev) => {
      const next = new Set(membersData.slice(0, REQUIRED_PLAYERS).map((m) => m.id));
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
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        if (next.size >= REQUIRED_PLAYERS) {
          setError(`Uma rinha precisa de exatamente ${REQUIRED_PLAYERS} jogadores (5 por time).`);
          return prev;
        }
        next.add(memberId);
      }
      setError(null);
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
    const isLeaderInTeam =
      teamBlue.some((p) => p.id === account.id) || teamRed.some((p) => p.id === account.id);
    if (!isLeaderInTeam) {
      setError('Você precisa estar em um dos times para liderar a partida.');
      return;
    }

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

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_BYTES) {
      setError('A imagem precisa ter no máximo 1MB.');
      e.target.value = '';
      return;
    }
    setError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSaveGroup = async (e) => {
    e.preventDefault();
    setGroupSaving(true);
    setError(null);
    try {
      let updated = group;
      if (nameDraft !== group.name) {
        updated = await groupsService.updateName(id, nameDraft);
      }
      if (imageFile) {
        updated = await groupsService.uploadImage(id, imageFile);
      }
      setGroup(updated);
      setEditingGroup(false);
      setImageFile(null);
      setImagePreview(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível salvar o grupo.');
    } finally {
      setGroupSaving(false);
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
        <div className="lol-group-image-frame">
          {group.image_url ? (
            <img src={group.image_url} alt="" className="lol-group-image" />
          ) : (
            <div className="lol-group-image lol-group-image--placeholder">
              <ImageIcon size={18} />
            </div>
          )}
        </div>
        <h1>{group.name}</h1>
        {isOwner && (
          <button
            type="button"
            className="lol-edit-group-button"
            onClick={() => {
              setNameDraft(group.name);
              setImageFile(null);
              setImagePreview(null);
              setEditingGroup(true);
            }}
          >
            <Pencil size={14} /> Editar grupo
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

          {leader && (
            <section className="lol-profile-section">
              <h2>Líder do grupo</h2>
              <GroupLeaderCard leader={leader} />
            </section>
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
        </>
      )}

      {activeTab === 'historico' && (
        <section className="lol-profile-section">
          <div className="lol-podium-row">
            <div>
              <h2 className="lol-podium-heading">Mais vitórias</h2>
              <GroupPodium entries={leaderboard} metric="wins" />
            </div>
            <div>
              <h2 className="lol-podium-heading lol-podium-heading--red">Mais derrotas</h2>
              <GroupPodium entries={leaderboard} metric="losses" variant="red" />
            </div>
          </div>

          {matchHistory.length === 0 ? (
            <p className="lol-profile-section-empty">Nenhuma rinha registrada ainda.</p>
          ) : (
            <div className="lol-match-card-list">
              {matchHistory.map((match) => (
                <GroupMatchCard
                  key={match.id}
                  match={match}
                  onClick={() => setSelectedMatch(match)}
                />
              ))}
            </div>
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

              <p className="lol-lobby-subtitle">
                Selecionados: {selectedIds.size}/{REQUIRED_PLAYERS}
              </p>

              <div className="lol-rematch-buttons">
                <button
                  type="button"
                  className="lol-sync-button"
                  onClick={handleShuffleAndNext}
                  disabled={selectedIds.size !== REQUIRED_PLAYERS}
                >
                  <Shuffle size={16} /> Sortear e iniciar partida
                </button>
                <button
                  type="button"
                  className="lol-sync-button"
                  onClick={handleNext}
                  disabled={selectedIds.size !== REQUIRED_PLAYERS}
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
                leaderId={account.id}
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

      <Modal isOpen={editingGroup} onClose={() => setEditingGroup(false)} title="Editar grupo">
        <form onSubmit={handleSaveGroup} className="lol-auth-form">
          <div className="lol-group-image-picker">
            {imagePreview || group.image_url ? (
              <img
                src={imagePreview || group.image_url}
                alt=""
                className="lol-group-image lol-group-image--lg"
              />
            ) : (
              <div className="lol-group-image lol-group-image--lg lol-group-image--placeholder">
                <ImageIcon size={24} />
              </div>
            )}
            <div>
              <label className="lol-group-image-upload-label">
                Trocar imagem
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleImageSelect}
                />
              </label>
              <p className="lol-auth-hint">Até 1MB.</p>
            </div>
          </div>
          <input
            type="text"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            required
          />
          <button type="submit" disabled={groupSaving}>
            {groupSaving ? 'Salvando...' : 'Salvar'}
          </button>
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

      <Modal
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        title="Detalhes da rinha"
        size="lg"
      >
        {selectedMatch && (
          <>
            <div className="lol-match-status">
              <span className="lol-match-timer lol-match-timer--finished">
                Vitória do Time {selectedMatch.winning_team === 'BLUE' ? 'Azul' : 'Vermelho'} ·{' '}
                {formatDuration(selectedMatch.duration_seconds)}
              </span>
            </div>
            <p className="lol-lobby-subtitle">
              {new Date(selectedMatch.ended_at).toLocaleString('pt-BR')}
            </p>

            <div className="lol-teams-grid">
              <div className="lol-team lol-team--blue">
                <h2>
                  Time Azul
                  {selectedMatch.winning_team === 'BLUE' && (
                    <Crown size={14} className="lol-captain-icon" />
                  )}
                </h2>
                <div className="lol-player-list">
                  {selectedMatch.team_blue.map((p) => (
                    <TeamMemberRow key={p.id} player={p} />
                  ))}
                </div>
              </div>
              <div className="lol-team lol-team--red">
                <h2>
                  Time Vermelho
                  {selectedMatch.winning_team === 'RED' && (
                    <Crown size={14} className="lol-captain-icon" />
                  )}
                </h2>
                <div className="lol-player-list">
                  {selectedMatch.team_red.map((p) => (
                    <TeamMemberRow key={p.id} player={p} />
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default GroupDetail;
