import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { playersService } from '../services/playersService';
import { matchesService } from '../services/matchesService';

const ROLE_ORDER = ['Topo', 'Selva', 'Meio', 'Atirador', 'Suporte', 'Não identificada'];

const PlayerDetail = () => {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([playersService.getProfile(id), matchesService.listForPlayer(id)])
      .then(([profileData, matchesData]) => {
        setProfile(profileData);
        setMatches(matchesData);
      })
      .catch((error) => console.error('Error loading player:', error))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="loading-screen">Carregando jogador...</div>;
  if (!profile) return <div className="lol-empty">Jogador não encontrado.</div>;

  const maxRoleGames = Math.max(1, ...profile.roles.map((r) => r.games));
  const orderedRoles = [...profile.roles].sort(
    (a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role)
  );

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
          <strong>{profile.played}</strong>
          <span>partidas</span>
        </div>
        <div className="lol-stat-line-divider" />
        <div className="lol-stat-line-item">
          <strong className="lol-win">{profile.wins}</strong>
          <span>vitórias</span>
        </div>
        <div className="lol-stat-line-divider" />
        <div className="lol-stat-line-item">
          <strong className="lol-loss">{profile.losses}</strong>
          <span>derrotas</span>
        </div>
        <div className="lol-stat-line-divider" />
        <div className="lol-stat-line-item">
          <strong>{profile.win_rate}%</strong>
          <span>win rate</span>
        </div>
        <div className="lol-stat-line-divider" />
        <div className="lol-stat-line-item">
          <strong>
            {profile.avg_kills}/{profile.avg_deaths}/{profile.avg_assists}
          </strong>
          <span>KDA médio</span>
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

      <div className="lol-profile-grid">
        <section className="lol-profile-section">
          <h2>Campeões mais jogados</h2>
          {profile.top_champions.length === 0 ? (
            <p className="lol-profile-section-empty">Nenhuma partida sincronizada ainda.</p>
          ) : (
            <ul className="lol-champion-list">
              {profile.top_champions.map((champ) => (
                <li key={champ.champion_name} className="lol-champion-row">
                  <img
                    src={champ.champion_icon_url}
                    alt=""
                    className="lol-champion-icon"
                    onError={(e) => (e.target.style.visibility = 'hidden')}
                  />
                  <span className="lol-champion-name">{champ.champion_name}</span>
                  <div className="lol-champion-bar-track">
                    <div
                      className="lol-champion-bar-fill"
                      style={{ width: `${champ.win_rate}%` }}
                    />
                  </div>
                  <span className="lol-champion-games">{champ.games}j</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="lol-profile-section">
          <h2>Rotas mais jogadas</h2>
          {orderedRoles.length === 0 ? (
            <p className="lol-profile-section-empty">Nenhuma partida sincronizada ainda.</p>
          ) : (
            <ul className="lol-role-list">
              {orderedRoles.map((role) => (
                <li key={role.role} className="lol-role-row">
                  <span className="lol-role-name">{role.role}</span>
                  <div className="lol-role-bar-track">
                    <div
                      className="lol-role-bar-fill"
                      style={{ width: `${(role.games / maxRoleGames) * 100}%` }}
                    />
                  </div>
                  <span className="lol-role-games">{role.games}j</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="lol-profile-section">
        <h2>Histórico de partidas</h2>
        {matches.length === 0 ? (
          <p className="lol-profile-section-empty">Nenhuma partida sincronizada ainda.</p>
        ) : (
          <table className="lol-match-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Campeão</th>
                <th>Resultado</th>
                <th>KDA</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((match) => (
                <tr key={match.match_id}>
                  <td>{new Date(match.game_creation).toLocaleString('pt-BR')}</td>
                  <td>{match.champion_name}</td>
                  <td className={match.win ? 'lol-win' : 'lol-loss'}>
                    {match.win ? 'Vitória' : 'Derrota'}
                  </td>
                  <td>
                    {match.kills}/{match.deaths}/{match.assists}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default PlayerDetail;
