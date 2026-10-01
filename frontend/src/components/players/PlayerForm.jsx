import React, { useState } from 'react';

export const PlayerForm = ({ onSubmit, loading }) => {
  const [displayName, setDisplayName] = useState('');
  const [riotId, setRiotId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const [riotGameName, riotTagLine] = riotId.split('#');
    onSubmit({ displayName, riotGameName, riotTagLine });
  };

  return (
    <form className="lol-player-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Apelido no grupo"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Riot ID (ex: Faker#KR1)"
        value={riotId}
        onChange={(e) => setRiotId(e.target.value)}
        pattern=".+#.+"
        title="Formato: nomeDeJogo#tag"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Adicionando...' : 'Adicionar jogador'}
      </button>
    </form>
  );
};
