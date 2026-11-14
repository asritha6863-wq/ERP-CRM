import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCheck, Plus, Search, ChevronRight } from 'lucide-react';
import api from '../../services/api.js';
import useLookups from '../../hooks/useLookups.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useGlobalFilter } from '../../context/GlobalFilterContext.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import ContactFormModal from '../contacts/ContactFormModal.jsx';
import ImportModal, { CONTACT_FIELDS } from '../leads/ImportModal.jsx';

const PAGE_SIZE = 20;
const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const dmy = (s) => (s ? s.split('-').reverse().join('/') : '');

export default function CustomersPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { lookups } = useLookups();
  const { globalParams } = useGlobalFilter();

  const [search, setSearch]   = useState('');
  const [filters, setFilters] = useState({ typeId: '', branchId: '', assignedToId: '' });
  const [page, setPage]       = useState(1);
  const [result, setResult]   = useState({ data: [], total: 0, pages: 1 });
  const [types, setTypes]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const isSales = user?.role === 'SALES';

  useEffect(() => {
    api.get('/masters/contact-types').then((r) => setTypes(r.data.data || [])).catch(() => {});
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { search: search.trim(), ...filters, page, limit: PAGE_SIZE };
      if (!params.branchId && globalParams.branchId) params.branchId = globalParams.branchId;
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const res = await api.get('/customer-hub', { params });
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load customers');
    } finally { setLoading(false); }
  }, [search, filters, page, globalParams]);

  // Debounce so typing in the search box doesn't fire a request per keystroke
  useEffect(() => {
    const t = setTimeout(fetchData, 300);
    return () => clearTimeout(t);
  }, [fetchData]);

  const setFilter = (k) => (e) => { setFilters((f) => ({ ...f, [k]: e.target.value })); setPage(1); };

  const createCustomer = async (form) => {
    await api.post('/contacts', form);
    setPage(1);
    fetchData();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
            <UserCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">Customers</h1>
              <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md tracking-wide uppercase">Customer 360</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Every customer with their leads, visits, purchases, feedback and history in one place</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="border border-gray-200 rounded-xl px-3 py-1.5 bg-white">
            <p className="text-[10px] text-gray-400 leading-none tracking-wide">TOTAL CUSTOMERS</p>
            <p className="text-lg font-bold text-gray-900 leading-tight text-right font-mono">{result.total.toLocaleString('en-IN')}</p>
          </div>
          <button onClick={() => setImportOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm text-gray-600">Import</button>
          <button onClick={() => setFormOpen(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium">
            <Plus className="w-4 h-4" /> New Customer
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search name, phone, email, city…"
            aria-label="Search customers" className="pl-9 pr-3 py-2 w-72 rounded-lg border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />
        </div>
        <select value={filters.typeId} onChange={setFilter('typeId')} className={SELECT} aria-label="Customer type">
          <option value="">All Types</option>
          {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        {!isSales && user?.role === 'ADMIN' && (
          <select value={filters.branchId} onChange={setFilter('branchId')} className={SELECT} aria-label="Branch">
            <option value="">All Branches</option>
            {lookups.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
        {!isSales && (
          <select value={filters.assignedToId} onChange={setFilter('assignedToId')} className={SELECT} aria-label="Assigned staff">
            <option value="">All Staff</option>
            {lookups.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {['CUSTOMER', 'CONTACT', 'BRANCH', 'ASSIGNED TO', 'LEADS', 'VISITS', 'PURCHASES', 'LIFETIME VALUE', 'LAST VISIT', ''].map((h) => (
                  <th key={h || 'go'} className="text-left text-[10px] font-semibold text-gray-500 tracking-widest px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={10} className="text-center text-gray-400 py-12">Loading…</td></tr>}
              {!loading && result.data.length === 0 && <tr><td colSpan={10} className="text-center text-gray-400 py-12">No customers found</td></tr>}
              {!loading && result.data.map((c) => (
                <tr key={c.id} onClick={() => navigate(`/customers/${c.id}`)} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{c.name}</p>
                    <p className="text-[11px] text-gray-400">{[c.city, c.state].filter(Boolean).join(', ') || c.type || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600"><p>{c.phone || '—'}</p><p className="text-gray-400">{c.email}</p></td>
                  <td className="px-4 py-3 text-xs text-gray-700">{c.branch || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-700 whitespace-nowrap">{c.assignedTo || '—'}</td>
                  <td className="px-4 py-3 font-mono text-indigo-600">{c.leads}</td>
                  <td className="px-4 py-3 font-mono text-gray-700">{c.visits}</td>
                  <td className="px-4 py-3 font-mono text-emerald-600">{c.purchases}</td>
                  <td className="px-4 py-3 font-mono text-gray-900 whitespace-nowrap">{inr(c.lifetimeValue)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{dmy(c.lastVisit) || '—'}</td>
                  <td className="px-4 py-3 text-gray-300"><ChevronRight className="w-4 h-4" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-100">
          <Pagination page={page} pages={result.pages} total={result.total} limit={PAGE_SIZE} onPage={setPage} />
        </div>
      </div>

      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onDone={fetchData} title="Import Customers" endpoint="/contacts/import" fields={CONTACT_FIELDS} templateName="customers_template" />
      <ContactFormModal open={formOpen} onClose={() => setFormOpen(false)} initial={null} onSave={createCustomer}
        lookups={{ types, branches: lookups.branches, staff: lookups.staff }} />
    </div>
  );
}

const SELECT = 'rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-pink-400';

