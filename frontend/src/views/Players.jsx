import React, { useEffect, useMemo, useState } from 'react';
import { playersService } from '../services/playersService';
import { PlayerCard } from '../components/players/PlayerCard';
import { SearchBar } from '../components/common/SearchBar';
import { PaginatedGrid } from '../components/common/PaginatedGrid';

const Players = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    playersService
      .list()
      .then(setPlayers)
      .catch((err) => console.error('Error loading players:', err))
      .finally(() => setLoading(false));
  }, []);

  const filteredPlayers = useMemo(() => {
    if (!query) return players;
    const q = query.toLowerCase();
    return players.filter(
      (p) => p.display_name.toLowerCase().includes(q) || p.riot_game_name.toLowerCase().includes(q)
    );
  }, [players, query]);

  if (loading) return <div className="loading-screen">Carregando jogadores...</div>;

  return (
    <div className="lol-players">
      <h1>Jogadores</h1>
      <SearchBar placeholder="Buscar jogador..." onSearch={setQuery} />
      <PaginatedGrid
        items={filteredPlayers}
        emptyMessage="Nenhum jogador encontrado."
        renderItem={(player, index) => (
          <PlayerCard key={player.id} player={player} rank={index + 1} />
        )}
      />
    </div>
  );
};

export default Players;
