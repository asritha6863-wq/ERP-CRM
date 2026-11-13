import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts';
import { BarChart3, PieChart as PieIcon, Download } from 'lucide-react';
import api from '../../services/api.js';
import { useGlobalFilter } from '../../context/GlobalFilterContext.jsx';

const COLORS = ['#ec4899', '#be185d', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#10b981', '#64748b'];
const inr = (n) => `₹${(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// Client-side CSV download of whatever rows are currently shown
function downloadCsv(filename, headers, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

export default function LocationSalesPage() {
  const { globalParams } = useGlobalFilter();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [tab, setTab]         = useState('city');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/analytics/location-sales', { params: globalParams });
      setData(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load location sales');
    } finally { setLoading(false); }
  }, [globalParams]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const t = data?.totals;

  const exportCurrent = () => {
    if (tab === 'city') {
      downloadCsv('sales-by-city.csv', ['City', 'State', 'Orders', 'Value'],
        data.byCity.map((r) => [r.city, r.state, r.orders, r.value]));
    } else {
      downloadCsv('sales-by-pincode.csv', ['Pincode', 'Orders', 'Value'],
        data.byPincode.map((r) => [r.pincode, r.orders, r.value]));
    }
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Location Wise Sales</h1>
        <p className="text-xs text-gray-400 mt-0.5">Won deals by branch, state, city and pincode</p>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}
      {loading && !data && <p className="text-sm text-gray-400">Loading…</p>}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Value Collected" value={inr(t.value)} />
            <StatCard label="Total Order Quantity"  value={t.orders.toLocaleString('en-IN')} />
            <StatCard label="Average Value / Sale"  value={inr(t.average)} />
            <StatCard label="Cities Covered"        value={t.cities.toLocaleString('en-IN')} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Sales by branch */}
            <Panel
              title="Sales By Branch" icon={BarChart3}
              onExport={() => downloadCsv('sales-by-branch.csv', ['Branch', 'Orders', 'Value'], data.byBranch.map((r) => [r.name, r.orders, r.value]))}
            >
              {data.byBranch.length === 0 ? <Empty /> : (
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.byBranch} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={(v) => (v.length > 22 ? `${v.slice(0, 20)}…` : v)} />
                      <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                      <Tooltip formatter={(v) => inr(v)} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {data.byBranch.map((_, i) => <Cell key={i} fill={COLORS[i % 2]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Panel>

            {/* Sales by state */}
            <Panel
              title="Sales By State" icon={PieIcon}
              onExport={() => downloadCsv('sales-by-state.csv', ['State', 'Orders', 'Value'], data.byState.map((r) => [r.name, r.orders, r.value]))}
            >
              {data.byState.length === 0 ? <Empty /> : (
                <div className="flex items-center gap-4 flex-wrap h-72">
                  <div className="h-56 w-56 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.byState} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={1}>
                          {data.byState.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={(v) => inr(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <ul className="flex-1 min-w-[200px] space-y-2.5 overflow-y-auto max-h-64">
                    {data.byState.map((s, i) => (
                      <li key={s.name} className="flex items-start justify-between gap-3 text-xs">
                        <span className="flex items-center gap-2 text-gray-700">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                          {s.name}
                        </span>
                        <span className="text-right">
                          <span className="block font-semibold text-gray-800">{inr(s.value)}</span>
                          <span className="block text-[10px] text-gray-400">{s.orders} ORDERS</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Panel>
          </div>

          {/* City / pincode breakdown */}
          <section className="bg-white border border-gray-200 rounded-2xl">
            <div className="flex items-center justify-between px-5 pt-4 border-b border-gray-100">
              <div className="flex gap-6">
                {[['city', 'City breakdown'], ['pincode', 'Pincode breakdown']].map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setTab(id)}
                    className={`pb-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      tab === id ? 'text-pink-600 border-pink-500' : 'text-gray-500 border-transparent hover:text-gray-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={exportCurrent}
                className="mb-3 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-xs font-semibold transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export current view
              </button>
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {(tab === 'city' ? ['CITY', 'STATE', 'ORDERS', 'VALUE'] : ['PINCODE', 'ORDERS', 'VALUE']).map((h) => (
                    <th key={h} className="text-left text-xs font-semibold text-gray-500 tracking-wide px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(tab === 'city' ? data.byCity : data.byPincode).length === 0 && (
                  <tr><td colSpan={4} className="text-center text-sm text-gray-400 py-10">No sales yet</td></tr>
                )}
                {tab === 'city' && data.byCity.map((r) => (
                  <tr key={r.name} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{r.city}</td>
                    <td className="px-5 py-3 text-gray-600">{r.state}</td>
                    <td className="px-5 py-3 text-gray-600">{r.orders}</td>
                    <td className="px-5 py-3 font-mono text-gray-900">{inr(r.value)}</td>
                  </tr>
                ))}
                {tab === 'pincode' && data.byPincode.map((r) => (
                  <tr key={r.name} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900 font-mono">{r.pincode}</td>
                    <td className="px-5 py-3 text-gray-600">{r.orders}</td>
                    <td className="px-5 py-3 font-mono text-gray-900">{inr(r.value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1 font-mono break-all">{value}</p>
    </div>
  );
}

function Panel({ title, icon: Icon, onExport, children }) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
          <Icon className="w-4 h-4 text-pink-500" /> {title}
        </h2>
        <button onClick={onExport} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">
          <Download className="w-3.5 h-3.5" /> Export
        </button>
      </div>
      {children}
    </section>
  );
}

function Empty() {
  return <p className="text-sm text-gray-400 text-center py-16">No won deals yet</p>;
}
