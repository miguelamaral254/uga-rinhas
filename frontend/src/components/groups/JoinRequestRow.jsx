import React from 'react';
import { Check, X } from 'lucide-react';

export const JoinRequestRow = ({ request, onApprove, onReject }) => (
  <div className="lol-player-card lol-member-row">
    <div className="lol-member-row-icon-frame">
      {request.profile_icon_url ? (
        <img src={request.profile_icon_url} alt="" className="lol-member-row-icon" />
      ) : (
        <div className="lol-member-row-icon lol-member-row-icon--placeholder" />
      )}
      {request.summoner_level && (
        <span className="lol-member-row-level">{request.summoner_level}</span>
      )}
    </div>
    <div className="lol-player-info">
      <p className="lol-player-name">{request.display_name}</p>
      <p className="lol-player-riot-id">
        {request.riot_game_name}#{request.riot_tag_line}
      </p>
    </div>
    <div className="lol-request-actions">
      <button
        type="button"
        className="lol-request-approve"
        onClick={() => onApprove(request.id)}
        aria-label="Aceitar"
      >
        <Check size={18} />
      </button>
      <button
        type="button"
        className="lol-request-reject"
        onClick={() => onReject(request.id)}
        aria-label="Recusar"
      >
        <X size={18} />
      </button>
    </div>
  </div>
);
