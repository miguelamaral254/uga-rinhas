import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { groupsService } from '../services/groupsService';
import { PlayerCard } from '../components/players/PlayerCard';

const GroupScoreboard = ({ group }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    groupsService
      .leaderboard(group.id)
      .then(setEntries)
      .catch((err) => console.error('Error loading leaderboard:', err))
      .finally(() => setLoading(false));
  }, [group.id]);

  return (
    <section className="lol-group-scoreboard">
      <h2>{group.name}</h2>
      {loading ? (
        <p className="lol-profile-section-empty">Carregando...</p>
      ) : entries.length === 0 ? (
        <p className="lol-profile-section-empty">Nenhuma partida registrada ainda.</p>
      ) : (
        <div className="lol-player-list">
          {entries.map((entry, index) => (
            <PlayerCard key={entry.id} player={entry} rank={index + 1} />
          ))}
        </div>
      )}
    </section>
  );
};

const Dashboard = () => {
  const { account, loading: authLoading } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!account) {
      setLoading(false);
      return;
    }
    groupsService
      .listMine()
      .then(setGroups)
      .catch((err) => console.error('Error loading groups:', err))
      .finally(() => setLoading(false));
  }, [account]);

  if (authLoading || loading) return <div className="loading-screen">Carregando...</div>;

  if (!account) {
    return (
      <div className="lol-dashboard">
        <h1>Placar</h1>
        <p className="lol-lobby-subtitle">
          <Link to="/login">Entre na sua conta</Link> pra ver o placar dos seus grupos.
        </p>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="lol-dashboard">
        <h1>Placar</h1>
        <p className="lol-lobby-subtitle">
          Você ainda não participa de nenhum grupo. <Link to="/groups">Crie ou entre em um</Link>.
        </p>
      </div>
    );
  }

  return (
    <div className="lol-dashboard">
      <h1>Placar</h1>
      {groups.map((group) => (
        <GroupScoreboard key={group.id} group={group} />
      ))}
    </div>
  );
};

export default Dashboard;
