import React from 'react';
import { Link } from 'react-router-dom';

export const GroupCard = ({ group }) => (
  <Link to={`/groups/${group.id}`} className="lol-group-card">
    <span className="lol-group-name">{group.name}</span>
    <span className="lol-group-code">#{group.join_code}</span>
  </Link>
);
