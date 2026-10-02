import React, { useEffect, useState } from 'react';
import { TeamMemberRow } from './TeamMemberRow';

const MAX_TEAM_SIZE = 5;

const ZONES = [
  { key: 'pool', title: 'Não alocados', className: 'lol-team--pool', max: null },
  { key: 'blue', title: 'Time Azul', className: 'lol-team--blue', max: MAX_TEAM_SIZE },
  { key: 'red', title: 'Time Vermelho', className: 'lol-team--red', max: MAX_TEAM_SIZE },
];

export const TeamBuilder = ({ pool, teamBlue, teamRed, onChange }) => {
  const [dragOverZone, setDragOverZone] = useState(null);
  const [error, setError] = useState(null);
  const zoneItems = { pool, blue: teamBlue, red: teamRed };

  // A drop that lands outside a recognized zone (e.g. the gap between columns)
  // would otherwise fall through to the browser's default action - navigating
  // the whole page to the dragged image's URL. Block that globally while this
  // wizard step is mounted.
  useEffect(() => {
    const preventDefault = (e) => e.preventDefault();
    window.addEventListener('dragover', preventDefault);
    window.addEventListener('drop', preventDefault);
    return () => {
      window.removeEventListener('dragover', preventDefault);
      window.removeEventListener('drop', preventDefault);
    };
  }, []);

  const handleDrop = (targetKey) => (e) => {
    e.preventDefault();
    setDragOverZone(null);
    const playerId = e.dataTransfer.getData('text/plain');
    if (!playerId) return;

    if (targetKey !== 'pool' && zoneItems[targetKey].length >= MAX_TEAM_SIZE) {
      setError(`Cada time pode ter no máximo ${MAX_TEAM_SIZE} jogadores.`);
      return;
    }

    const next = { pool: [...pool], blue: [...teamBlue], red: [...teamRed] };
    let moved = null;
    for (const key of Object.keys(next)) {
      const idx = next[key].findIndex((p) => p.id === playerId);
      if (idx !== -1) {
        [moved] = next[key].splice(idx, 1);
        break;
      }
    }
    if (!moved) return;
    setError(null);
    next[targetKey].push(moved);
    onChange(next.pool, next.blue, next.red);
  };

  return (
    <>
      <div className="lol-team-builder">
        {ZONES.map(({ key, title, className, max }) => (
          <div
            key={key}
            className={`lol-team lol-team-zone ${className}${dragOverZone === key ? ' is-drag-over' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverZone(key);
            }}
            onDragLeave={() => setDragOverZone((z) => (z === key ? null : z))}
            onDrop={handleDrop(key)}
          >
            <h2>
              {title}
              {max && ` (${zoneItems[key].length}/${max})`}
            </h2>
            <div className="lol-player-list">
              {zoneItems[key].length === 0 && (
                <p className="lol-profile-section-empty">Arraste jogadores pra cá.</p>
              )}
              {zoneItems[key].map((player, index) => (
                <div
                  key={player.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', player.id)}
                  className="lol-draggable-row"
                >
                  <TeamMemberRow player={player} isCaptain={key !== 'pool' && index === 0} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      {error && <p className="lol-form-error">{error}</p>}
    </>
  );
};
