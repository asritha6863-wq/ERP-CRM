import { Search, X } from 'lucide-react';

// FilterBar — search input + optional filter slots + clear all
// Props:
//   search: string — current search value
//   onSearch: (val) => void
//   placeholder: string
//   onClear: () => void — clears all filters
//   children: additional filter controls (selects, date pickers, etc.)
export default function FilterBar({ search = '', onSearch, placeholder = 'Search…', onClear, children }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={placeholder}
          className="pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-56"
        />
      </div>

      {children}

      {(search || onClear) && (
        <button
          onClick={() => { onSearch(''); onClear?.(); }}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      )}
    </div>
  );
}
