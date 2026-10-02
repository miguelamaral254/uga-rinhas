import React from 'react';
import { CheckCircle2, Circle, X } from 'lucide-react';

export const MemberCard = ({ member, selected, onToggle, onRemove }) => (
  <div className={`lol-player-card lol-member-row${selected ? ' is-selected' : ''}`}>
    <button type="button" className="lol-member-row-main" onClick={() => onToggle(member.id)}>
      <div className="lol-member-row-icon-frame">
        {member.profile_icon_url ? (
          <img src={member.profile_icon_url} alt="" className="lol-member-row-icon" />
        ) : (
          <div className="lol-member-row-icon lol-member-row-icon--placeholder" />
        )}
        {member.summoner_level && (
          <span className="lol-member-row-level">{member.summoner_level}</span>
        )}
      </div>
      <div className="lol-player-info">
        <p className="lol-player-name">{member.display_name}</p>
        <p className="lol-player-riot-id">
          {member.riot_game_name}#{member.riot_tag_line}
        </p>
      </div>
    </button>
    <button
      type="button"
      className="lol-member-row-selection-btn"
      onClick={() => onToggle(member.id)}
      aria-label="Selecionar"
    >
      {selected ? <CheckCircle2 size={20} /> : <Circle size={20} />}
    </button>
    {onRemove && (
      <button
        type="button"
        className="lol-member-row-remove"
        onClick={() => onRemove(member.id)}
        aria-label="Remover do grupo"
      >
        <X size={16} />
      </button>
    )}
  </div>
);
