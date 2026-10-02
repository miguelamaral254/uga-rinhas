import React from 'react';
import { Crown } from 'lucide-react';

export const TeamMemberRow = ({ player, isCaptain }) => (
  <div className="lol-player-card lol-member-row">
    <div className="lol-member-row-main">
      <div className="lol-member-row-icon-frame">
        {player.profile_icon_url ? (
          <img
            src={player.profile_icon_url}
            alt=""
            draggable={false}
            className="lol-member-row-icon"
          />
        ) : (
          <div className="lol-member-row-icon lol-member-row-icon--placeholder" />
        )}
        {player.summoner_level && (
          <span className="lol-member-row-level">{player.summoner_level}</span>
        )}
      </div>
      <div className="lol-player-info">
        <p className="lol-player-name">
          {player.display_name}
          {isCaptain && <Crown size={14} className="lol-captain-icon" />}
        </p>
        <p className="lol-player-riot-id">
          {player.riot_game_name}#{player.riot_tag_line}
        </p>
      </div>
    </div>
  </div>
);
