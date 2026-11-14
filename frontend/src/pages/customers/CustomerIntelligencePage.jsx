import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Search, ArrowRight, Maximize2 } from 'lucide-react';
import api from '../../services/api.js';

const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

export default function CustomerIntelligencePage() {
  const navigate = useNavigate();
  const [search,   setSearch]   = useState('');
  const [results,  setResults]  = useState([]);
  const [recent,   setRecent]   = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [searching, setSearching] = useState(false);

  // Load recent profiles on mount
  useEffect(() => {
    setLoading(true);
    api.get('/customer-hub', { params: { limit: 8, sort: 'name' } })
      .then((r) => setRecent(r.data?.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Debounced search
  useEffect(() => {
    const term = search.trim();
    if (!term) { setResults([]); return; }
    setSearching(true);
    const t = setTimeout(() => {
      api.get('/customer-hub', { params: { search: term, limit: 20 } })
        .then((r) => setResults(r.data?.data || []))
        .catch(() => setResults([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const goToProfile = (id) => navigate(`/customers/${id}`);

  const list = search.trim() ? results : recent;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">Customer Intelligence 360°</h1>
              <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md tracking-wide uppercase">
                Unified Profiling
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              Comprehensive customer profiling, sales history, ledger timeline, and relationship intelligence
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, or ID..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              autoFocus
            />
            {searching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-400">Searching…</span>
            )}
          </div>
          <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400" aria-label="Expand">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hero dossier banner */}
      {!search.trim() && (
        <div className="relative rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f1b3d 0%, #1a2f6e 60%, #1e3a8a 100%)' }}>
          <div className="px-8 py-10">
            <span className="text-[10px] font-bold tracking-widest text-indigo-300 border border-indigo-500/40 bg-indigo-900/40 rounded-full px-3 py-1">
              CENTRAL CUSTOMER DOSSIER
            </span>
            <h2 className="text-3xl font-bold text-white mt-5">Search or Select a Customer</h2>
            <p className="text-sm text-indigo-200 mt-3 max-w-lg leading-relaxed">
              Enter a customer name, mobile number, or ID in the search bar above, or select from recent active customers
              below to inspect their complete transaction history, retail sales, returns, payments, old gold, advances,
              ledger, and CRM relationship data.
            </p>
          </div>
        </div>
      )}

      {/* Search results or recent customers */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center">
              <Activity className="w-3 h-3 text-gray-500" />
            </span>
            {search.trim() ? `Search Results (${results.length})` : 'Recent Customer Profiles'}
          </h2>
          {!search.trim() && (
            <span className="text-xs text-gray-400">Click any profile to launch 360° view</span>
          )}
        </div>

        {loading && !search.trim() && (
          <p className="text-sm text-gray-400">Loading…</p>
        )}

        {!loading && list.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-10 bg-white border border-gray-200 rounded-2xl">
            {search.trim() ? 'No customers found matching your search.' : 'No customers yet. Add a customer from the Customers module.'}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {list.map((c) => <CustomerCard key={c.id} customer={c} onClick={() => goToProfile(c.id)} />)}
        </div>
      </div>
    </div>
  );
}

function CustomerCard({ customer: c, onClick }) {
  const initials = ((c.name?.[0] || '?')).toUpperCase();

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all group"
    >
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-gray-900 text-white text-base font-bold flex items-center justify-center shrink-0 group-hover:bg-indigo-700 transition-colors">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate uppercase">{c.name}</p>
          <p className="text-[11px] text-gray-500 font-mono">{c.phone || 'No phone'}</p>
        </div>
      </div>

      {/* Type + branch */}
      <div className="flex items-center gap-2 flex-wrap">
        {c.type && (
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wide">{c.type}</span>
        )}
        {c.branch && (
          <span className="text-[10px] text-gray-400 uppercase truncate">{c.branch}</span>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-1 text-center border-t border-gray-100 pt-2">
        <Stat label="Leads" value={c.leads} />
        <Stat label="Visits" value={c.visits} />
        <Stat label="Purchases" value={c.purchases} />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-gray-100">
        <span className="text-[11px] text-gray-400">
          {c.lifetimeValue > 0 ? `₹${Math.round(c.lifetimeValue).toLocaleString('en-IN')} total` : 'No purchases'}
        </span>
        <span className="flex items-center gap-1 text-[11px] text-indigo-600 font-semibold group-hover:gap-2 transition-all">
          View 360° Profile <ArrowRight className="w-3.5 h-3.5" />
        </span>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <p className="text-sm font-bold text-gray-900 font-mono">{value ?? 0}</p>
      <p className="text-[9px] text-gray-400 uppercase tracking-wide">{label}</p>
    </div>
  );
}
