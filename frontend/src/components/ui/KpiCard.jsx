import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// KpiCard — displays a single KPI metric
// Props: title, value, subtitle, icon (lucide component), trend ('up'|'down'|'neutral'), trendLabel, loading, colorClass
export default function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  loading = false,
  colorClass = 'bg-indigo-500',
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-600' : trend === 'down' ? 'text-red-500' : 'text-gray-400';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        {Icon && (
          <div className={`${colorClass} rounded-lg p-2 text-white`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      {loading ? (
        <div className="h-8 w-24 bg-gray-100 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
      )}

      {(trendLabel || subtitle) && (
        <div className="flex items-center gap-1.5">
          {trendLabel && (
            <>
              <TrendIcon className={`w-3.5 h-3.5 ${trendColor}`} />
              <span className={`text-xs font-medium ${trendColor}`}>{trendLabel}</span>
            </>
          )}
          {subtitle && <span className="text-xs text-gray-400">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
