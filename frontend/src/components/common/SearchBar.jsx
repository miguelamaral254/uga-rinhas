import React, { useState } from 'react';
import { Search } from 'lucide-react';

export const SearchBar = ({ placeholder = 'Buscar...', onSearch }) => {
  const [value, setValue] = useState('');

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSearch(value.trim());
    }
  };

  return (
    <div className="lol-search-bar">
      <Search size={16} />
      <input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};
