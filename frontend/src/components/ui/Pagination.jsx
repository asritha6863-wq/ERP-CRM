import { ChevronLeft, ChevronRight } from 'lucide-react';

// Pagination — page-based navigator
// Props: page, pages, total, limit, onPage
export default function Pagination({ page, pages, total, limit, onPage }) {
  if (pages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  return (
    <div className="flex items-center justify-between text-sm text-gray-600">
      <span>{start}–{end} of {total}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-2">{page} / {pages}</span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-30"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
