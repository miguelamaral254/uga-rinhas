import React from 'react';
import { Crown } from 'lucide-react';

export const GroupLeaderCard = ({ leader }) => (
  <div className="lol-player-card lol-leader-card">
    <div className="lol-member-row-icon-frame">
      {leader.profile_icon_url ? (
        <img src={leader.profile_icon_url} alt="" draggable={false} className="lol-member-row-icon" />
      ) : (
        <div className="lol-member-row-icon lol-member-row-icon--placeholder" />
      )}
      {leader.summoner_level && (
        <span className="lol-member-row-level">{leader.summoner_level}</span>
      )}
    </div>

    <div className="lol-player-info">
      <p className="lol-player-name">
        {leader.display_name}
        <Crown size={14} className="lol-captain-icon" />
      </p>
      <p className="lol-player-riot-id">
        {leader.riot_game_name}#{leader.riot_tag_line}
      </p>
    </div>

    <div className="lol-leader-rank">
      {leader.solo_duo_rank ? (
        <>
          <img
            src={leader.solo_duo_rank.emblem_url}
            alt=""
            className="lol-rank-emblem lol-rank-emblem--small"
          />
          <span className="lol-rank-tier">
            {leader.solo_duo_rank.tier} {leader.solo_duo_rank.rank}
          </span>
        </>
      ) : (
        <span className="lol-rank-tier">Unranked</span>
      )}
    </div>

    <div className="lol-leader-wins">
      <strong>{leader.wins}</strong>
      <span>{leader.wins === 1 ? 'vitória na rinha' : 'vitórias na rinha'}</span>
    </div>
  </div>
);
