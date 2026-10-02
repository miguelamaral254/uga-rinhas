import React from 'react';
import { Check } from 'lucide-react';

export const MemberCard = ({ member, selected, onToggle }) => (
  <button
    type="button"
    className={`lol-member-card${selected ? ' is-selected' : ''}`}
    onClick={() => onToggle(member.id)}
  >
    {selected && (
      <span className="lol-member-check">
        <Check size={12} />
      </span>
    )}
    <div className="lol-member-icon-frame">
      {member.profile_icon_url ? (
        <img src={member.profile_icon_url} alt="" className="lol-member-icon" />
      ) : (
        <div className="lol-member-icon lol-member-icon--placeholder" />
      )}
      {member.summoner_level && <span className="lol-member-level">{member.summoner_level}</span>}
    </div>
    <p className="lol-member-name">{member.display_name}</p>
    <p className="lol-member-riot-id">
      {member.riot_game_name}#{member.riot_tag_line}
    </p>
  </button>
);
