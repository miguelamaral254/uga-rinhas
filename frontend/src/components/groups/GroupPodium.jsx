import React from 'react';
import { Crown, Skull } from 'lucide-react';

const SLOTS = [
  { rank: 2, className: 'second' },
  { rank: 1, className: 'first' },
  { rank: 3, className: 'third' },
];

export const GroupPodium = ({ entries, metric = 'wins', variant = 'gold' }) => {
  const top3 = (entries || [])
    .filter((e) => e[metric] > 0)
    .slice()
    .sort((a, b) => b[metric] - a[metric])
    .slice(0, 3);
  if (top3.length === 0) return null;

  const suffix = metric === 'wins' ? 'V' : 'D';
  const Icon = variant === 'red' ? Skull : Crown;

  return (
    <div className={`lol-podium lol-podium--${variant}`}>
      {SLOTS.map(({ rank, className }) => {
        const entry = top3[rank - 1];
        if (!entry) return null;
        return (
          <div key={rank} className={`lol-podium-slot lol-podium-slot--${className}`}>
            {rank === 1 && <Icon size={16} className="lol-podium-crown" />}
            <span className="lol-podium-rank">#{rank}</span>
            <span className="lol-podium-name">{entry.display_name}</span>
            <span className="lol-podium-wins">
              {entry[metric]}
              {suffix}
            </span>
          </div>
        );
      })}
    </div>
  );
};
