import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shuffle } from 'lucide-react';
import { groupsService } from '../services/groupsService';
import { groupMatchesService } from '../services/groupMatchesService';
import { SearchBar } from '../components/common/SearchBar';
import { PaginatedGrid } from '../components/common/PaginatedGrid';
import { MemberCard } from '../components/groups/MemberCard';

const GroupDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([groupsService.getById(id), groupsService.members(id)])
      .then(([groupData, membersData]) => {
        setGroup(groupData);
        setMembers(membersData);
        setSelectedIds(new Set(membersData.map((m) => m.id)));
      })
      .catch((err) => console.error('Error loading group:', err))
      .finally(() => setLoading(false));
  }, [id]);

  const filteredMembers = useMemo(() => {
    if (!query) return members;
    const q = query.toLowerCase();
    return members.filter((m) => m.display_name.toLowerCase().includes(q));
  }, [members, query]);

  const toggleSelected = (memberId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const handleStart = async () => {
    setStarting(true);
    setError(null);
    try {
      const match = await groupMatchesService.start(id, Array.from(selectedIds));
      navigate(`/matches/${match.id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Não foi possível iniciar a partida.');
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <div className="loading-screen">Carregando grupo...</div>;
  if (!group) return <div className="lol-empty">Grupo não encontrado.</div>;

  return (
    <div className="lol-lobby">
      <h1>{group.name}</h1>
      <p className="lol-lobby-subtitle">
        Código de convite: <strong>{group.join_code}</strong>
      </p>

      <SearchBar placeholder="Buscar jogador..." onSearch={setQuery} />

      <PaginatedGrid
        items={filteredMembers}
        listClassName="lol-member-grid"
        emptyMessage="Nenhum jogador encontrado."
        renderItem={(member) => (
          <MemberCard
            key={member.id}
            member={member}
            selected={selectedIds.has(member.id)}
            onToggle={toggleSelected}
          />
        )}
      />

      <button
        className="lol-sync-button"
        onClick={handleStart}
        disabled={starting || selectedIds.size < 2}
      >
        <Shuffle size={16} />
        {starting ? 'Sorteando...' : 'Sortear e iniciar partida'}
      </button>
      {error && <p className="lol-form-error">{error}</p>}
    </div>
  );
};

export default GroupDetail;
