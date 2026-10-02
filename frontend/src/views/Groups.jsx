import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, LogIn } from 'lucide-react';
import { groupsService } from '../services/groupsService';
import { LoadingScreen } from '../components/common/LoadingScreen';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState(null);
  const [joinMessage, setJoinMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const fetchGroups = async () => {
    try {
      setGroups(await groupsService.listMine());
    } catch (err) {
      console.error('Error loading groups:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await groupsService.create(newGroupName);
      setNewGroupName('');
      await fetchGroups();
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível criar o grupo.');
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setJoinMessage(null);
    try {
      const result = await groupsService.join(joinCode);
      setJoinCode('');
      setJoinMessage(`Solicitação enviada para "${result.group_name}". Aguarde o dono aprovar.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Código inválido.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingScreen label="Carregando grupos" />;

  return (
    <div className="lol-groups">
      <h1>Grupos de rinha</h1>

      <div className="lol-groups-actions">
        <form onSubmit={handleCreate} className="lol-group-form">
          <input
            type="text"
            placeholder="Nome do novo grupo"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            required
          />
          <button type="submit" disabled={busy}>
            <Plus size={16} /> Criar
          </button>
        </form>

        <form onSubmit={handleJoin} className="lol-group-form">
          <input
            type="text"
            placeholder="Código de convite"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            required
          />
          <button type="submit" disabled={busy}>
            <LogIn size={16} /> Entrar
          </button>
        </form>
      </div>
      {joinMessage && <p className="lol-auth-success">{joinMessage}</p>}
      {error && <p className="lol-form-error">{error}</p>}

      {groups.length === 0 ? (
        <div className="lol-empty">Você ainda não faz parte de nenhum grupo.</div>
      ) : (
        <ul className="lol-group-list">
          {groups.map((group) => (
            <li key={group.id}>
              <Link to={`/groups/${group.id}`} className="lol-group-card">
                <span className="lol-group-name">{group.name}</span>
                <span className="lol-group-code">#{group.join_code}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Groups;
