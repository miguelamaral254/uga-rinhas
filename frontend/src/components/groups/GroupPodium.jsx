import React from 'react';
import { Crown } from 'lucide-react';

const SLOTS = [
  { rank: 2, className: 'lol-podium-slot--second' },
  { rank: 1, className: 'lol-podium-slot--first' },
  { rank: 3, className: 'lol-podium-slot--third' },
];

export const GroupPodium = ({ entries }) => {
  const top3 = (entries || []).filter((e) => e.wins > 0).slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <div className="lol-podium">
      {SLOTS.map(({ rank, className }) => {
        const entry = top3[rank - 1];
        if (!entry) return null;
        return (
          <div key={rank} className={`lol-podium-slot ${className}`}>
            {rank === 1 && <Crown size={16} className="lol-podium-crown" />}
            <span className="lol-podium-rank">#{rank}</span>
            <span className="lol-podium-name">{entry.display_name}</span>
            <span className="lol-podium-wins">{entry.wins}V</span>
          </div>
        );
      })}
    </div>
  );
};
