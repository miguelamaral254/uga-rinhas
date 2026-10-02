import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 10;

export const PaginatedGrid = ({
  items,
  renderItem,
  emptyMessage = 'Nenhum registro encontrado.',
  listClassName = 'lol-player-list',
}) => {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const start = currentPage * PAGE_SIZE;
  const pageItems = useMemo(() => items.slice(start, start + PAGE_SIZE), [items, start]);

  if (items.length === 0) {
    return <div className="lol-empty">{emptyMessage}</div>;
  }

  return (
    <div className="lol-paginated-grid">
      <div className={listClassName}>
        {pageItems.map((item, i) => renderItem(item, start + i))}
      </div>
      <div className="lol-pagination">
        <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={currentPage === 0}>
          <ChevronLeft size={16} />
        </button>
        <span>
          Página {currentPage + 1} de {totalPages}
        </span>
        <button
          onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
          disabled={currentPage === totalPages - 1}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};
