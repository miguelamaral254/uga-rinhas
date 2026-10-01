import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { playersService } from '../services/playersService';
import { matchesService } from '../services/matchesService';
import { PlayerCard } from '../components/players/PlayerCard';

const Dashboard = () => {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchPlayers = async () => {
    try {
      setPlayers(await playersService.list());
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await matchesService.sync();
      await fetchPlayers();
    } catch (error) {
      console.error('Error syncing matches:', error);
    } finally {
      setSyncing(false);
    }
  };

  if (loading) return <div className="loading-screen">Carregando placar...</div>;

  return (
    <div className="lol-dashboard">
      <div className="lol-dashboard-header">
        <h1>Placar do grupo</h1>
        <button className="lol-sync-button" onClick={handleSync} disabled={syncing}>
          <RefreshCw size={16} className={syncing ? 'lol-spin' : ''} />
          {syncing ? 'Sincronizando...' : 'Sincronizar partidas'}
        </button>
      </div>

      {players.length === 0 ? (
        <div className="lol-empty">Nenhum jogador cadastrado ainda.</div>
      ) : (
        <div className="lol-player-list">
          {players.map((player, index) => (
            <PlayerCard key={player.id} player={player} rank={index + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
