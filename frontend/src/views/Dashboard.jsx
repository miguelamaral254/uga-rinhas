import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { playersService } from '../services/playersService';
import { groupMatchesService } from '../services/groupMatchesService';

const formatDuration = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${minutes}:${seconds}`;
};

const Dashboard = () => {
  const { account, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!account) {
      setLoading(false);
      return;
    }
    Promise.all([
      playersService.getProfile(account.id),
      groupMatchesService.playerHistory(account.id),
    ])
      .then(([profileData, historyData]) => {
        setProfile(profileData);
        setHistory(historyData);
      })
      .catch((err) => console.error('Error loading dashboard:', err))
      .finally(() => setLoading(false));
  }, [account]);

  if (authLoading || loading) return <div className="loading-screen">Carregando...</div>;

  if (!account) {
    return (
      <div className="lol-dashboard">
        <h1>Início</h1>
        <p className="lol-lobby-subtitle">
          <Link to="/login">Entre na sua conta</Link> pra ver seu painel.
        </p>
      </div>
    );
  }

  if (!profile || !history) return <div className="lol-empty">Não foi possível carregar seu painel.</div>;

  return (
    <div className="lol-profile">
      <header className="lol-profile-header">
        <div className="lol-profile-icon-frame">
          {profile.profile_icon_url ? (
            <img src={profile.profile_icon_url} alt="" className="lol-profile-icon" />
          ) : (
            <div className="lol-profile-icon lol-profile-icon--placeholder" />
          )}
          {profile.summoner_level && (
            <span className="lol-profile-level">{profile.summoner_level}</span>
          )}
        </div>
        <div>
          <h1 className="lol-profile-name">{profile.display_name}</h1>
          <p className="lol-profile-riot-id">
            {profile.riot_game_name}
            <span className="lol-profile-tag">#{profile.riot_tag_line}</span>
          </p>
        </div>

        <div className="lol-ranks">
          {['Solo/Duo', 'Flex'].map((queue) => {
            const entry = profile.ranks.find((r) => r.queue === queue);
            return (
              <div key={queue} className="lol-rank-badge">
                {entry ? (
                  <img src={entry.emblem_url} alt="" className="lol-rank-emblem" />
                ) : (
                  <div className="lol-rank-emblem lol-rank-emblem--unranked" />
                )}
                <div className="lol-rank-info">
                  <span className="lol-rank-queue">{queue}</span>
                  {entry ? (
                    <>
                      <span className="lol-rank-tier">
                        {entry.tier} {entry.rank} · {entry.league_points} PDL
                      </span>
                      <span className="lol-rank-record">
                        {entry.wins}V {entry.losses}D
                      </span>
                    </>
                  ) : (
                    <span className="lol-rank-tier">Unranked</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </header>

      <div className="lol-stat-line">
        <div className="lol-stat-line-item">
          <strong>{history.played}</strong>
          <span>rinhas</span>
        </div>
        <div className="lol-stat-line-divider" />
        <div className="lol-stat-line-item">
          <strong className="lol-win">{history.wins}</strong>
          <span>vitórias</span>
        </div>
        <div className="lol-stat-line-divider" />
        <div className="lol-stat-line-item">
          <strong className="lol-loss">{history.losses}</strong>
          <span>derrotas</span>
        </div>
        <div className="lol-stat-line-divider" />
        <div className="lol-stat-line-item">
          <strong>{history.win_rate}%</strong>
          <span>win rate</span>
        </div>
      </div>

      <section className="lol-profile-section lol-mastery-section">
        <h2>Maestria de campeões</h2>
        {profile.masteries.length === 0 ? (
          <p className="lol-profile-section-empty">Sem dados de maestria.</p>
        ) : (
          <ul className="lol-mastery-list">
            {profile.masteries.map((m) => (
              <li key={m.champion_name} className="lol-mastery-item">
                <div className="lol-mastery-icon-frame">
                  <img
                    src={m.champion_icon_url}
                    alt=""
                    className="lol-mastery-icon"
                    onError={(e) => (e.target.style.visibility = 'hidden')}
                  />
                  <span className="lol-mastery-level">{m.level}</span>
                </div>
                <span className="lol-mastery-name">{m.champion_name}</span>
                <span className="lol-mastery-points">{m.points.toLocaleString('pt-BR')} pts</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="lol-profile-section">
        <h2>Últimas rinhas</h2>
        {history.recent_matches.length === 0 ? (
          <p className="lol-profile-section-empty">Nenhuma rinha registrada ainda.</p>
        ) : (
          <table className="lol-match-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Grupo</th>
                <th>Resultado</th>
                <th>Duração</th>
              </tr>
            </thead>
            <tbody>
              {history.recent_matches.map((match) => (
                <tr key={match.match_id}>
                  <td>{new Date(match.ended_at).toLocaleString('pt-BR')}</td>
                  <td>
                    <Link to={`/groups/${match.group_id}`}>{match.group_name}</Link>
                  </td>
                  <td className={match.result === 'WIN' ? 'lol-win' : 'lol-loss'}>
                    {match.result === 'WIN' ? 'Vitória' : 'Derrota'}
                  </td>
                  <td>{formatDuration(match.duration_seconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
