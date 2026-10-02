import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { groupMatchesService } from '../services/groupMatchesService';
import { useAuth } from '../contexts/AuthContext';

const formatDuration = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const TeamColumn = ({ title, className, players, captainId }) => (
  <div className={`lol-team ${className}`}>
    <h2>{title}</h2>
    <ul>
      {players.map((p) => (
        <li key={p.id}>
          {p.display_name}
          {p.id === captainId && <Crown size={14} className="lol-captain-icon" />}
        </li>
      ))}
    </ul>
  </div>
);

const GroupMatch = () => {
  const { id } = useParams();
  const { account } = useAuth();
  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [finishing, setFinishing] = useState(false);
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

  const handleFinish = async (winningTeam) => {
    setFinishing(true);
    setError(null);
    try {
      setMatch(await groupMatchesService.finish(id, winningTeam));
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível finalizar a partida.');
    } finally {
      setFinishing(false);
    }
  };

  if (loading) return <div className="loading-screen">Carregando partida...</div>;
  if (!match) return <div className="lol-empty">Partida não encontrada.</div>;

  const isCaptain =
    account && (account.id === match.captain_blue_id || account.id === match.captain_red_id);

  return (
    <div className="lol-lobby">
      <h1>Partida em andamento</h1>

      <div className="lol-match-status">
        {match.status === 'IN_PROGRESS' ? (
          <span className="lol-match-timer">{formatDuration(elapsed)}</span>
        ) : (
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
          captainId={match.captain_blue_id}
        />
        <TeamColumn
          title="Time Vermelho"
          className="lol-team--red"
          players={match.team_red}
          captainId={match.captain_red_id}
        />
      </div>

      {match.status === 'IN_PROGRESS' && isCaptain && (
        <div className="lol-finish-actions">
          <p>Você é capitão — só você e o outro capitão podem finalizar a partida.</p>
          <div className="lol-finish-buttons">
            <button
              className="lol-finish-button lol-finish-button--blue"
              onClick={() => handleFinish('BLUE')}
              disabled={finishing}
            >
              Vitória Time Azul
            </button>
            <button
              className="lol-finish-button lol-finish-button--red"
              onClick={() => handleFinish('RED')}
              disabled={finishing}
            >
              Vitória Time Vermelho
            </button>
          </div>
        </div>
      )}
      {error && <p className="lol-form-error">{error}</p>}
    </div>
  );
};

export default GroupMatch;
