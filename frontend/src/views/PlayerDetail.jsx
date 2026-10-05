import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Crown } from 'lucide-react';
import { playersService } from '../services/playersService';
import { matchesService } from '../services/matchesService';
import { LoadingScreen } from '../components/common/LoadingScreen';
import { Modal } from '../components/common/Modal';
import { MatchRosterEntry } from '../components/matches/MatchRosterEntry';
import { formatDuration, formatRelativeTime } from '../utils/matchFormat';

const ROLE_ORDER = ['Topo', 'Selva', 'Meio', 'Atirador', 'Suporte', 'Não identificada'];

const ItemSlots = ({ items, className = '' }) => (
  <div className={`lol-match-items ${className}`.trim()}>
    {items.map((url, i) => (
      <div key={i} className="lol-match-item-slot">
        {url && <img src={url} alt="" className="lol-match-item-icon" />}
      </div>
    ))}
  </div>
);

const MatchHistoryCard = ({ match, onClick }) => (
  <div
    className={`lol-match-card ${match.win ? 'lol-match-card--win' : 'lol-match-card--loss'}`}
    onClick={onClick}
  >
    <div className="lol-match-card-meta">
      <span className="lol-match-card-queue">{match.queue_label}</span>
      <span className="lol-match-card-time">{formatRelativeTime(match.game_creation)}</span>
      <span className={`lol-match-card-result ${match.win ? 'lol-win' : 'lol-loss'}`}>
        {match.win ? 'Vitória' : 'Derrota'}
      </span>
      <span className="lol-match-card-duration">
        {formatDuration(match.game_duration_seconds)}
      </span>
    </div>

    <div className="lol-match-card-champion-col">
      <div className="lol-match-card-champion">
        <div className="lol-match-card-champion-frame">
          <img src={match.champion_icon_url} alt="" className="lol-match-card-champion-icon" />
          <span className="lol-match-card-champion-level">{match.champion_level}</span>
        </div>
        <div className="lol-match-card-spells">
          {match.summoner_spell_icon_urls.map((url, i) => (
            <img key={i} src={url} alt="" className="lol-match-card-spell-icon" />
          ))}
        </div>
      </div>
      <ItemSlots items={match.item_icon_urls} className="lol-match-card-items" />
    </div>

    <div className="lol-match-card-kda">
      <p>
        {match.kills} / <span className="lol-loss">{match.deaths}</span> / {match.assists}
      </p>
      <span>{match.kda_ratio}:1 KDA</span>
    </div>

    <div className="lol-match-card-stats">
      <span>P/Kill {match.kill_participation}%</span>
      <span>CS {match.cs}</span>
    </div>

    <div className="lol-match-card-roster">
      <div className="lol-match-card-roster-col">
        {match.teammates.map((p, i) => (
          <MatchRosterEntry key={i} player={{ ...p, icon_url: p.champion_icon_url }} />
        ))}
      </div>
      <div className="lol-match-card-roster-col">
        {match.opponents.map((p, i) => (
          <MatchRosterEntry key={i} player={{ ...p, icon_url: p.champion_icon_url }} />
        ))}
      </div>
    </div>
  </div>
);

const MatchParticipantRow = ({ participant, highlighted }) => (
  <div className={`lol-player-card lol-match-participant-row${highlighted ? ' is-selected' : ''}`}>
    <div className="lol-match-card-champion-frame">
      <img src={participant.champion_icon_url} alt="" className="lol-match-card-champion-icon" />
      <span className="lol-match-card-champion-level">{participant.champion_level}</span>
    </div>
    <div className="lol-match-card-spells">
      {participant.summoner_spell_icon_urls.map((url, i) => (
        <img key={i} src={url} alt="" className="lol-match-card-spell-icon" />
      ))}
    </div>
    <p className="lol-match-detail-name">{participant.display_name}</p>
    <p className="lol-match-participant-kda">
      {participant.kills} / <span className="lol-loss">{participant.deaths}</span> /{' '}
      {participant.assists}
    </p>
    <ItemSlots items={participant.item_icon_urls} />
  </div>
);

const PlayerDetail = () => {
  const { id } = useParams();
  const [profile, setProfile] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatchId, setSelectedMatchId] = useState(null);
  const [matchDetail, setMatchDetail] = useState(null);

  useEffect(() => {
    Promise.all([playersService.getProfile(id), matchesService.listForPlayer(id)])
      .then(([profileData, matchesData]) => {
        setProfile(profileData);
        setMatches(matchesData);
      })
      .catch((error) => console.error('Error loading player:', error))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!selectedMatchId) {
      setMatchDetail(null);
      return;
    }
    matchesService
      .getDetail(selectedMatchId)
      .then(setMatchDetail)
      .catch((error) => console.error('Error loading match detail:', error));
  }, [selectedMatchId]);

  if (loading) return <LoadingScreen label="Carregando jogador" />;
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
                  <span className="lol-champion-games">{champ.games}</span>
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
                  <span className="lol-role-games">{role.games}</span>
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
          <div className="lol-match-card-list">
            {matches.map((match) => (
              <MatchHistoryCard
                key={match.match_id}
                match={match}
                onClick={() => setSelectedMatchId(match.match_id)}
              />
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={!!selectedMatchId}
        onClose={() => setSelectedMatchId(null)}
        title="Detalhes da partida"
        size="xl"
      >
        {matchDetail && (
          <>
            <div className="lol-match-status">
              <span
                className={`lol-match-timer lol-match-timer--finished ${
                  matchDetail.winning_team_id === 100 ? 'lol-win' : 'lol-loss'
                }`}
              >
                Vitória do Time {matchDetail.winning_team_id === 100 ? 'Azul' : 'Vermelho'} ·{' '}
                {formatDuration(matchDetail.game_duration_seconds)}
              </span>
            </div>
            <p className="lol-lobby-subtitle">
              {new Date(matchDetail.game_creation).toLocaleString('pt-BR')}
            </p>

            <div className="lol-teams-grid">
              <div className="lol-team lol-team--blue">
                <h2>
                  Time Azul
                  {matchDetail.winning_team_id === 100 && (
                    <Crown size={14} className="lol-captain-icon" />
                  )}
                </h2>
                <div className="lol-player-list">
                  {matchDetail.team_blue.map((p, i) => (
                    <MatchParticipantRow key={i} participant={p} highlighted={p.player_id === id} />
                  ))}
                </div>
              </div>
              <div className="lol-team lol-team--red">
                <h2>
                  Time Vermelho
                  {matchDetail.winning_team_id === 200 && (
                    <Crown size={14} className="lol-captain-icon" />
                  )}
                </h2>
                <div className="lol-player-list">
                  {matchDetail.team_red.map((p, i) => (
                    <MatchParticipantRow key={i} participant={p} highlighted={p.player_id === id} />
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

export default PlayerDetail;
