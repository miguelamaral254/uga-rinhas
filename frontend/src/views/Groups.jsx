import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, KeyRound } from 'lucide-react';
import { groupsService } from '../services/groupsService';
import { SearchBar } from '../components/common/SearchBar';
import { PaginatedGrid } from '../components/common/PaginatedGrid';
import { Modal } from '../components/common/Modal';
import { GroupCard } from '../components/groups/GroupCard';
import { DiscoverGroupCard } from '../components/groups/DiscoverGroupCard';
import { GroupInfoModal } from '../components/groups/GroupInfoModal';
import { LoadingScreen } from '../components/common/LoadingScreen';

const Groups = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('mine');
  const [myGroups, setMyGroups] = useState([]);
  const [discoverableGroups, setDiscoverableGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mineQuery, setMineQuery] = useState('');
  const [discoverQuery, setDiscoverQuery] = useState('');

  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [createError, setCreateError] = useState(null);

  const [codeOpen, setCodeOpen] = useState(false);
  const [codeValue, setCodeValue] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeError, setCodeError] = useState(null);

  const [infoGroup, setInfoGroup] = useState(null);

  const fetchAll = async () => {
    const [mine, discoverable] = await Promise.all([
      groupsService.listMine(),
      groupsService.discover(),
    ]);
    setMyGroups(mine);
    setDiscoverableGroups(discoverable);
  };

  useEffect(() => {
    fetchAll()
      .catch((err) => console.error('Error loading groups:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const joinCode = searchParams.get('join');
    if (!joinCode) return;
    groupsService
      .lookupByCode(joinCode)
      .then(setInfoGroup)
      .catch((err) => console.error('Error looking up invite link:', err))
      .finally(() => {
        const next = new URLSearchParams(searchParams);
        next.delete('join');
        setSearchParams(next, { replace: true });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredMine = useMemo(() => {
    if (!mineQuery) return myGroups;
    const q = mineQuery.toLowerCase();
    return myGroups.filter((g) => g.name.toLowerCase().includes(q));
  }, [myGroups, mineQuery]);

  const filteredDiscoverable = useMemo(() => {
    if (!discoverQuery) return discoverableGroups;
    const q = discoverQuery.toLowerCase();
    return discoverableGroups.filter((g) => g.name.toLowerCase().includes(q));
  }, [discoverableGroups, discoverQuery]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      await groupsService.create(newGroupName);
      setNewGroupName('');
      setCreateOpen(false);
      await fetchAll();
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Não foi possível criar o grupo.');
    } finally {
      setCreating(false);
    }
  };

  const handleLookupByCode = async (e) => {
    e.preventDefault();
    setCodeBusy(true);
    setCodeError(null);
    try {
      const group = await groupsService.lookupByCode(codeValue.trim());
      setCodeOpen(false);
      setCodeValue('');
      setInfoGroup(group);
    } catch (err) {
      setCodeError(err.response?.data?.message || 'Código inválido.');
    } finally {
      setCodeBusy(false);
    }
  };

  if (loading) return <LoadingScreen label="Carregando grupos" />;

  return (
    <div className="lol-groups">
      <h1>Grupos de rinha</h1>

      <div className="lol-tabs">
        <button
          type="button"
          className={`lol-tab${activeTab === 'mine' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('mine')}
        >
          Meus grupos
        </button>
        <button
          type="button"
          className={`lol-tab${activeTab === 'discover' ? ' is-active' : ''}`}
          onClick={() => setActiveTab('discover')}
        >
          Encontrar grupo
        </button>
      </div>

      {activeTab === 'mine' && (
        <>
          <SearchBar placeholder="Buscar grupo..." onSearch={setMineQuery} />
          <PaginatedGrid
            key="mine"
            items={filteredMine}
            emptyMessage="Você ainda não faz parte de nenhum grupo."
            listClassName="lol-group-list"
            renderItem={(group) => <GroupCard key={group.id} group={group} />}
          />
        </>
      )}

      {activeTab === 'discover' && (
        <>
          <div className="lol-discover-header">
            <SearchBar placeholder="Buscar grupo..." onSearch={setDiscoverQuery} />
            <div className="lol-discover-actions">
              <button type="button" className="lol-sync-button" onClick={() => setCreateOpen(true)}>
                <Plus size={16} /> Criar
              </button>
              <button type="button" className="lol-sync-button" onClick={() => setCodeOpen(true)}>
                <KeyRound size={16} /> Código de convite
              </button>
            </div>
          </div>
          <PaginatedGrid
            key="discover"
            items={filteredDiscoverable}
            emptyMessage="Nenhum grupo disponível pra entrar no momento."
            listClassName="lol-group-list"
            renderItem={(group) => (
              <DiscoverGroupCard key={group.id} group={group} onClick={setInfoGroup} />
            )}
          />
        </>
      )}

      <Modal isOpen={createOpen} onClose={() => setCreateOpen(false)} title="Criar grupo">
        <form onSubmit={handleCreate} className="lol-auth-form">
          <input
            type="text"
            placeholder="Nome do grupo"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            required
          />
          <button type="submit" disabled={creating}>
            {creating ? 'Criando...' : 'Criar'}
          </button>
        </form>
        {createError && <p className="lol-form-error">{createError}</p>}
      </Modal>

      <Modal isOpen={codeOpen} onClose={() => setCodeOpen(false)} title="Entrar com código">
        <form onSubmit={handleLookupByCode} className="lol-auth-form">
          <input
            type="text"
            placeholder="Código de convite"
            value={codeValue}
            onChange={(e) => setCodeValue(e.target.value.toUpperCase())}
            required
          />
          <button type="submit" disabled={codeBusy}>
            {codeBusy ? 'Buscando...' : 'Buscar grupo'}
          </button>
        </form>
        {codeError && <p className="lol-form-error">{codeError}</p>}
      </Modal>

      <GroupInfoModal group={infoGroup} isOpen={!!infoGroup} onClose={() => setInfoGroup(null)} />
    </div>
  );
};

export default Groups;
