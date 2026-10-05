import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Play, RotateCcw, Shuffle } from 'lucide-react';
import { groupMatchesService } from '../services/groupMatchesService';
import { useAuth } from '../contexts/AuthContext';
import { TeamMemberRow } from '../components/groups/TeamMemberRow';
import { LoadingScreen } from '../components/common/LoadingScreen';

const formatDuration = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const TeamColumn = ({ title, className, players, leaderId }) => (
  <div className={`lol-team ${className}`}>
    <h2>{title}</h2>
    <div className="lol-player-list">
      {players.map((p) => (
        <TeamMemberRow key={p.id} player={p} isCaptain={p.id === leaderId} />
      ))}
    </div>
  </div>
);

const GroupMatch = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { account } = useAuth();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    groupMatchesService
      .getById(id)
      .then(setMatch)
      .catch((err) => console.error('Error loading match:', err))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!match || match.status !== 'IN_PROGRESS') return undefined;
    const tick = () => setElapsed((Date.now() - new Date(match.started_at).getTime()) / 1000);
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [match]);

  const isLeader = match && account && account.id === match.leader_id;

  const handleBegin = async () => {
    setBusy(true);
    setError(null);
    try {
      setMatch(await groupMatchesService.begin(id));
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível iniciar a partida.');
    } finally {
      setBusy(false);
    }
  };

  const handleRematch = async () => {
    setBusy(true);
    setError(null);
    try {
      const newMatch = await groupMatchesService.rematch(id);
      navigate(`/matches/${newMatch.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível iniciar a revanche.');
      setBusy(false);
    }
  };

  const handleFinish = async (winningTeam) => {
    setBusy(true);
    setError(null);
    try {
      setMatch(await groupMatchesService.finish(id, winningTeam));
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível finalizar a partida.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingScreen label="Carregando partida" />;
  if (!match) return <div className="lol-empty">Partida não encontrada.</div>;

  return (
    <div className="lol-lobby">
      <h1>
        {match.status === 'DRAFT' && 'Times sorteados'}
        {match.status === 'IN_PROGRESS' && 'Partida em andamento'}
        {match.status === 'FINISHED' && 'Partida finalizada'}
      </h1>

      <div className="lol-match-status">
        {match.status === 'IN_PROGRESS' && (
          <span className="lol-match-timer">{formatDuration(elapsed)}</span>
        )}
        {match.status === 'FINISHED' && (
          <span className="lol-match-timer lol-match-timer--finished">
            {formatDuration(match.duration_seconds)} · Vitória do Time{' '}
            {match.winning_team === 'BLUE' ? 'Azul' : 'Vermelho'}
          </span>
        )}
      </div>

      <div className="lol-teams-grid">
        <TeamColumn
          title="Time Azul"
          className="lol-team--blue"
          players={match.team_blue}
          leaderId={match.leader_id}
        />
        <TeamColumn
          title="Time Vermelho"
          className="lol-team--red"
          players={match.team_red}
          leaderId={match.leader_id}
        />
      </div>

      {match.status === 'DRAFT' && isLeader && (
        <div className="lol-finish-actions">
          <p>Confira os times. Quando todos estiverem prontos, inicie a partida.</p>
          <button className="lol-sync-button" onClick={handleBegin} disabled={busy}>
            <Play size={16} /> {busy ? 'Iniciando...' : 'Iniciar partida'}
          </button>
        </div>
      )}

      {match.status === 'IN_PROGRESS' && isLeader && (
        <div className="lol-finish-actions">
          <p>Você é o líder da partida — só você pode finalizá-la.</p>
          <div className="lol-finish-buttons">
            <button
              className="lol-finish-button lol-finish-button--blue"
              onClick={() => handleFinish('BLUE')}
              disabled={busy}
            >
              Vitória Time Azul
            </button>
            <button
              className="lol-finish-button lol-finish-button--red"
              onClick={() => handleFinish('RED')}
              disabled={busy}
            >
              Vitória Time Vermelho
            </button>
          </div>
        </div>
      )}

      {match.status === 'FINISHED' && (
        <div className="lol-finish-actions">
          <div className="lol-rematch-buttons">
            {isLeader && (
              <button className="lol-sync-button" onClick={handleRematch} disabled={busy}>
                <RotateCcw size={16} /> {busy ? 'Iniciando...' : 'Iniciar outra partida (mesmo time)'}
              </button>
            )}
            <button
              className="lol-sync-button"
              onClick={() => navigate(`/groups/${match.group_id}`)}
              disabled={busy}
            >
              <Shuffle size={16} /> Sortear outra partida
            </button>
          </div>
        </div>
      )}

      {error && <p className="lol-form-error">{error}</p>}
    </div>
  );
};

export default GroupMatch;
