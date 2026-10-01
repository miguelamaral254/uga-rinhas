import React, { useEffect, useState } from 'react';
import { playersService } from '../services/playersService';
import { PlayerForm } from '../components/players/PlayerForm';
import { PlayerCard } from '../components/players/PlayerCard';

const Players = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const fetchPlayers = async () => {
    try {
      setPlayers(await playersService.list());
    } catch (err) {
      console.error('Error loading players:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handleRegister = async ({ displayName, riotGameName, riotTagLine }) => {
    setSaving(true);
    setError(null);
    try {
      await playersService.register({ displayName, riotGameName, riotTagLine });
      await fetchPlayers();
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível adicionar o jogador.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading-screen">Carregando jogadores...</div>;

  return (
    <div className="lol-players">
      <h1>Jogadores</h1>
      <PlayerForm onSubmit={handleRegister} loading={saving} />
      {error && <p className="lol-form-error">{error}</p>}

      <div className="lol-player-list">
        {players.map((player, index) => (
          <PlayerCard key={player.id} player={player} rank={index + 1} />
        ))}
      </div>
    </div>
  );
};

export default Players;
