import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { PieChart as PieIcon, TrendingUp, Users, BarChart3, Activity, Sparkles } from 'lucide-react';
import api from '../../services/api.js';
import { useGlobalFilter } from '../../context/GlobalFilterContext.jsx';

const PERIODS = [
  { id: '7D',   label: '7D'   },
  { id: '30D',  label: '30D'  },
  { id: '90D',  label: '90D'  },
  { id: 'YEAR', label: 'YEAR' },
];
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Lakh format, e.g. ₹3.00L
const lakh = (n) => `₹${((n || 0) / 100000).toFixed(2)}L`;
const inr  = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const SENTIMENT = {
  POSITIVE: { label: 'Positive', bar: 'bg-emerald-500' },
  NEUTRAL:  { label: 'Neutral',  bar: 'bg-slate-400'   },
  NEGATIVE: { label: 'Negative', bar: 'bg-red-500'     },
};

export default function CrmAnalyticsPage() {
  const { globalParams } = useGlobalFilter();
  const [period, setPeriod]   = useState('30D');
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/analytics/crm', { params: { ...globalParams, period } });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load CRM analytics');
    } finally { setLoading(false); }
  }, [globalParams, period]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const f = data?.funnel;
  const funnelMax = Math.max(f?.totalLeads || 0, f?.pipelineDeals || 0, f?.qualifiedLeads || 0, f?.closedWon || 0, 1);
  const funnelRows = f ? [
    { label: 'TOTAL LEADS',     value: f.totalLeads,      color: 'bg-gray-900'    },
    { label: 'PIPELINE DEALS',  value: f.pipelineDeals,   color: 'bg-indigo-500'  },
    { label: 'QUALIFIED LEADS', value: f.qualifiedLeads,  color: 'bg-blue-500'    },
    { label: 'CLOSED WON',      value: f.closedWon,       color: 'bg-emerald-500' },
  ] : [];

  const monthly = data ? data.monthly.map((value, i) => ({ month: MONTHS[i], value })) : [];
  const distMax = Math.max(...(data?.distribution.map((d) => d.value) || [0]), 1);
  const sentimentTotal = data?.behavioral.reduce((s, b) => s + b.count, 0) || 0;

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
            <PieIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">CRM Analytics</h1>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md tracking-wide uppercase">
                Pipeline Funnel
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Real-time intelligence across sales pipelines, conversion rates, and touchpoints</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-1.5 bg-white">
            <div>
              <p className="text-[10px] text-gray-400 leading-none tracking-wide">TOTAL PIPELINE</p>
              <p className="text-lg font-bold text-gray-900 leading-tight font-mono">{lakh(data?.totalPipeline)}</p>
            </div>
            <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-gray-500" />
            </span>
          </div>

          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                onClick={() => setPeriod(p.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  period === p.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}
      {loading && !data && <p className="text-sm text-gray-400">Loading…</p>}

      {data && (
        <>
          {/* Row 1 — revenue distribution + managed database */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <section className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5 min-h-[160px]">
              <div className="flex items-start justify-between">
                <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                  <TrendingUp className="w-4 h-4 text-indigo-500" /> Revenue Distribution
                </h2>
                <div className="text-right">
                  <p className="text-[10px] text-gray-400">Total Pipeline Value</p>
                  <p className="text-lg font-bold text-gray-900 font-mono">{lakh(data.totalPipeline)}</p>
                </div>
              </div>

              {data.distribution.length === 0 ? (
                <p className="text-xs text-gray-400 mt-6">No open deals in this period</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {data.distribution.map((d) => (
                    <li key={d.stage}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">{d.stage}
                          <span className="text-gray-400 font-normal"> · {d.count} {d.count === 1 ? 'deal' : 'deals'}</span>
                        </span>
                        <span className="font-mono text-gray-800">{inr(d.value)}</span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full rounded-full bg-indigo-500" style={{ width: `${(d.value / distMax) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="bg-white border border-gray-200 rounded-2xl p-5 flex flex-col items-center justify-center text-center">
              <Users className="w-6 h-6 text-indigo-500" />
              <p className="text-[10px] font-bold text-gray-400 tracking-widest mt-2">MANAGED DATABASE</p>
              <p className="text-4xl font-bold text-gray-900 font-mono mt-1">{data.database.total.toLocaleString('en-IN')}</p>
              <span className="mt-3 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-3 py-1">
                {data.database.recentlyActive.toLocaleString('en-IN')} Recently Active
              </span>
            </section>
          </div>

          {/* Row 2 — monthly revenue + funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <section className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <BarChart3 className="w-4 h-4 text-indigo-500" /> Monthly Revenue Trends
                <span className="text-[10px] font-semibold text-gray-400 ml-1">{data.year}</span>
              </h2>
              <div className="h-64 mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(v) => [inr(v), 'Won revenue']} />
                    <Bar dataKey="value" fill="#0f172a" radius={[6, 6, 0, 0]} minPointSize={3} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>

            <section className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <Activity className="w-4 h-4 text-emerald-500" /> Conversion Funnel
              </h2>
              <div className="mt-5 space-y-4">
                {funnelRows.map((r) => (
                  <div key={r.label}>
                    <div className="flex items-center justify-between text-[10px] font-semibold tracking-wide text-gray-500 mb-1.5">
                      <span>{r.label}</span>
                      <span className="font-mono text-gray-900">{r.value.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-full rounded-full ${r.color}`} style={{ width: `${(r.value / funnelMax) * 100}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between border-t border-gray-100 mt-5 pt-4">
                <span className="text-[10px] font-semibold tracking-wide text-gray-500">OVERALL CONVERSION</span>
                <span className="text-2xl font-bold text-gray-900 font-mono">{f.conversionRate.toFixed(1)}%</span>
              </div>
            </section>
          </div>

          {/* Row 3 — behavioural distribution + intelligence summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <section className="bg-white border border-gray-200 rounded-2xl p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
                <span className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5 text-indigo-500" />
                </span>
                Behavioral Distribution
              </h2>
              {sentimentTotal === 0 ? (
                <p className="text-xs italic text-gray-400 mt-5">No behavioral segments found</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {data.behavioral.map((b) => (
                    <li key={b.label}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">{SENTIMENT[b.label].label}</span>
                        <span className="font-mono text-gray-800">{b.count} · {Math.round((b.count / sentimentTotal) * 100)}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className={`h-full rounded-full ${SENTIMENT[b.label].bar}`} style={{ width: `${(b.count / sentimentTotal) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[10px] text-gray-400 mt-4">Lead sentiment for leads created in this period</p>
            </section>

            <section className="bg-gray-900 text-white rounded-2xl p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold">
                <span className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </span>
                Intelligence Summary
              </h2>
              <p className="text-sm text-gray-300 leading-relaxed mt-4">
                Your conversion rate is currently at <strong className="text-white">{f.conversionRate.toFixed(1)}%</strong>.{' '}
                {data.activePipelineDeals > 0
                  ? <>Focus on converting the <strong className="text-white">{data.activePipelineDeals}</strong> active pipeline {data.activePipelineDeals === 1 ? 'deal' : 'deals'} to improve quarterly revenue yield.</>
                  : <>There are no active pipeline deals right now, so adding new deals is the quickest way to grow revenue.</>}
              </p>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
