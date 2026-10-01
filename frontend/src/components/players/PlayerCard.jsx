import React from 'react';
import { Link } from 'react-router-dom';

export const PlayerCard = ({ player, rank }) => (
  <Link to={`/players/${player.id}`} className="lol-player-card">
    <span className="lol-player-rank">#{rank}</span>
    <div className="lol-player-info">
      <p className="lol-player-name">{player.display_name}</p>
      <p className="lol-player-riot-id">
        {player.riot_game_name}#{player.riot_tag_line}
      </p>
    </div>
    <div className="lol-player-stats">
      <span className="lol-player-stat lol-player-stat--win">{player.wins}V</span>
      <span className="lol-player-stat lol-player-stat--loss">{player.losses}D</span>
      <span className="lol-player-stat">{player.win_rate}%</span>
    </div>
  </Link>
);
