import { BarChart2 } from 'lucide-react';

// ChartCard — wrapper for Recharts charts with title, subtitle, loading and empty states
// Props: title, subtitle, loading, isEmpty, emptyMessage, height, children (the actual chart)
export default function ChartCard({
  title,
  subtitle,
  loading = false,
  isEmpty = false,
  emptyMessage = 'No data available for this period',
  height = 260,
  children,
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>

      {loading ? (
        <div
          className="rounded-lg bg-gray-50 animate-pulse flex items-center justify-center"
          style={{ height }}
        >
          <div className="text-gray-200">Loading…</div>
        </div>
      ) : isEmpty ? (
        <div
          className="flex flex-col items-center justify-center gap-2 text-gray-400 bg-gray-50 rounded-lg"
          style={{ height }}
        >
          <BarChart2 className="w-8 h-8 text-gray-300" />
          <p className="text-sm">{emptyMessage}</p>
        </div>
      ) : (
        <div style={{ height }}>{children}</div>
      )}
    </div>
  );
}
