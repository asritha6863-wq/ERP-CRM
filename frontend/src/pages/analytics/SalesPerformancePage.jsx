import { useState, useEffect, useCallback } from 'react';
import { Award, Users, Maximize2, Star, CheckCircle2 } from 'lucide-react';
import api from '../../services/api.js';
import { useGlobalFilter } from '../../context/GlobalFilterContext.jsx';

const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const pct = (v) => (v === null || v === undefined ? '—' : `${v.toFixed(1)}%`);

export default function SalesPerformancePage() {
  const { globalParams } = useGlobalFilter();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/analytics/sales-performance', { params: globalParams });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load sales performance');
    } finally { setLoading(false); }
  }, [globalParams]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const s = data?.summary;
  const e = data?.efficiency;

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">Sales Performance</h1>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md tracking-wide uppercase">
                Leaderboard
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Leaderboard, individual contribution and conversion metrics across sales staff</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-1.5 bg-white">
            <div>
              <p className="text-[10px] text-gray-400 leading-none tracking-wide">TOTAL REPS</p>
              <p className="text-lg font-bold text-gray-900 leading-tight text-right font-mono">{data?.totalReps ?? 0}</p>
            </div>
            <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-gray-400" />
            </span>
          </div>
          <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400" aria-label="Expand">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Revenue (Won)" value={inr(s?.revenue)}         hint="Pipeline conversions"        valueClass="text-gray-900 font-mono" />
        <StatCard label="Avg. Conv. Rate"     value={pct(s?.conversionRate)}  hint="Won leads vs all leads"      valueClass="text-emerald-600 font-mono" />
        <StatCard label="Active Pipeline"     value={s?.activePipeline ?? 0}  hint="Open active deals"           valueClass="text-indigo-600 font-mono" />
        <StatCard label="Staff Contributing"  value={s?.staffContributing ?? 0} hint="Active relationship managers" valueClass="text-gray-900 font-mono" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

        {/* Leaderboard */}
        <section className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-4">
            <Award className="w-4 h-4 text-amber-500" /> Top Performers Leaderboard
          </h2>

          {loading && <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>}
          {!loading && data?.leaderboard.length === 0 && (
            <p className="text-sm text-gray-400 py-8 text-center">No sales staff found. Add Sales or Manager users to see the leaderboard.</p>
          )}

          <ul className="space-y-3">
            {data?.leaderboard.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                <div className="flex items-center gap-4 min-w-0">
                  <span className="w-9 h-9 rounded-lg bg-gray-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    #{r.rank}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{r.name}</p>
                    <div className="flex gap-2 mt-1">
                      <Chip>Interactions: {r.interactions}</Chip>
                      <Chip>Won Deals: {r.wonDeals}</Chip>
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[10px] text-gray-400">Sales Generated</p>
                  <p className="text-sm font-bold text-gray-900 font-mono">{inr(r.sales)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Right column */}
        <div className="space-y-5">
          <section className="bg-white border border-gray-200 rounded-2xl p-6 text-center">
            <span className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto">
              <Star className="w-5 h-5 text-amber-400" />
            </span>
            <h3 className="text-sm font-bold text-gray-900 mt-3">Excellence Club</h3>
            {data?.excellence.length > 0 ? (
              <ul className="mt-3 space-y-1.5 text-left">
                {data.excellence.map((r) => (
                  <li key={r.id} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 text-gray-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {r.name}
                    </span>
                    <span className="font-mono text-gray-500">{r.wonDeals} won</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-400 mt-1">Relationship managers with at least one won deal appear here.</p>
            )}
          </section>

          <section className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-4">
              <CheckCircle2 className="w-4 h-4 text-indigo-500" /> Efficiency Index
            </h3>
            <div className="space-y-4">
              <Bar label="TASK COMPLIANCE" value={e?.taskCompliance === null || e?.taskCompliance === undefined ? '—' : `${Math.round(e.taskCompliance)}%`}
                   fill={e?.taskCompliance ?? 0} color="bg-emerald-500" />
              {/* Faster follow-up = fuller bar, measured against a 24h ceiling */}
              <Bar label="FOLLOW-UP TIME" value={e?.followUpHours === null || e?.followUpHours === undefined ? '—' : `${e.followUpHours.toFixed(1)} hrs`}
                   fill={e?.followUpHours == null ? 0 : (1 - Math.min(e.followUpHours, 24) / 24) * 100} color="bg-indigo-500" />
              <Bar label="CUSTOMER RATING" value={e?.customerRating == null ? '—' : `${e.customerRating.toFixed(1)}/5.0`}
                   fill={e?.customerRating == null ? 0 : (e.customerRating / 5) * 100} color="bg-amber-400" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, hint, valueClass }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueClass}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
    </div>
  );
}

function Chip({ children }) {
  return <span className="text-[10px] text-gray-500 bg-white border border-gray-200 rounded px-1.5 py-0.5">{children}</span>;
}

function Bar({ label, value, fill, color }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] font-semibold text-gray-400 tracking-wide mb-1.5">
        <span>{label}</span>
        <span className="font-mono text-gray-800">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(0, Math.min(100, fill))}%` }} />
      </div>
    </div>
  );
}
