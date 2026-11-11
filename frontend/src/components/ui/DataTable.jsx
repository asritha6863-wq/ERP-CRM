import { ChevronUp, ChevronDown, Inbox } from 'lucide-react';

// DataTable — reusable table with column config, sorting, loading skeleton, and empty state
// columns: [{ key, header, render?, sortable?, className? }]
// data: array of row objects
// onSort: (key, dir) => void
// sortKey, sortDir: current sort state
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  onSort,
  sortKey,
  sortDir = 'asc',
  emptyMessage = 'No records found',
  rowKey = 'id',
}) {
  const SKELETON_ROWS = 5;

  const handleSort = (col) => {
    if (!col.sortable || !onSort) return;
    const dir = sortKey === col.key && sortDir === 'asc' ? 'desc' : 'asc';
    onSort(col.key, dir);
  };

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => handleSort(col)}
                className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap ${
                  col.sortable ? 'cursor-pointer select-none hover:bg-gray-100' : ''
                } ${col.className || ''}`}
              >
                <span className="flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === col.key && (
                    sortDir === 'asc'
                      ? <ChevronUp className="w-3 h-3" />
                      : <ChevronDown className="w-3 h-3" />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {loading
            ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            : data.length === 0
            ? (
                <tr>
                  <td colSpan={columns.length} className="py-14 text-center">
                    <div className="flex flex-col items-center gap-2 text-gray-400">
                      <Inbox className="w-8 h-8" />
                      <p className="text-sm">{emptyMessage}</p>
                    </div>
                  </td>
                </tr>
              )
            : data.map((row) => (
                <tr key={row[rowKey]} className="hover:bg-gray-50 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3 text-gray-700 ${col.className || ''}`}>
                      {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
          }
        </tbody>
      </table>
    </div>
  );
}
