import React from 'react';
import { Link } from 'react-router-dom';

export const MatchRosterEntry = ({ player }) => {
  const content = (
    <>
      <img src={player.icon_url} alt="" className="lol-match-card-roster-icon" />
      <span>{player.display_name}</span>
    </>
  );
  return player.player_id ? (
    <Link
      to={`/players/${player.player_id}`}
      className="lol-match-card-roster-entry"
      onClick={(e) => e.stopPropagation()}
    >
      {content}
    </Link>
  ) : (
    <span className="lol-match-card-roster-entry">{content}</span>
  );
};
