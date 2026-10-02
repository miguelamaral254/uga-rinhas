import React from 'react';
import { Users } from 'lucide-react';

export const DiscoverGroupCard = ({ group, onClick }) => (
  <button type="button" className="lol-group-card" onClick={() => onClick(group)}>
    <span className="lol-group-name">{group.name}</span>
    <span className="lol-group-member-count">
      <Users size={14} />
      {group.member_count} {group.member_count === 1 ? 'integrante' : 'integrantes'}
    </span>
  </button>
);
