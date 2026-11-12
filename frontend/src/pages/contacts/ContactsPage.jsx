import { useState, useEffect } from 'react';
import { Plus, Search, X, AlertTriangle, Info, Inbox } from 'lucide-react';
import useContacts from '../../hooks/useContacts.js';
import useLookups  from '../../hooks/useLookups.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Pagination  from '../../components/ui/Pagination.jsx';
import ContactFormModal from './ContactFormModal.jsx';
import api from '../../services/api.js';

export default function ContactsPage() {
  const { user }    = useAuth();
  const { lookups } = useLookups();
  const {
    data, total, pages, page, setPage,
    search, setSearch, filters, setFilter, clearFilters,
    loading, error, limit,
    createContact, updateContact, refetch,
  } = useContacts();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [types, setTypes]       = useState([]);

  useEffect(() => {
    api.get('/masters/contact-types').then((r) => setTypes(r.data.data || [])).catch(() => {});
  }, []);

  const handleSave = async (form) => {
    if (editing) await updateContact(editing.id, form);
    else         await createContact(form);
  };

  const canSeeAll    = user?.role !== 'SALES';
  const isAdminOrMgr = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  return (
    <div className="p-6 space-y-4">

      {/* ── Header ───────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-400 mt-0.5">Master list of all people</p>
        </div>
        <button
          onClick={() => { setEditing(null); setFormOpen(true); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          New Contact
        </button>
      </div>

      {/* ── Filter bar ───────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, phone, ema…"
            className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 w-56 bg-white"
          />
        </div>

        {/* Clear */}
        {(search || filters.typeId || filters.branchId || filters.assignedToId) && (
          <button
            onClick={() => { setSearch(''); clearFilters(); }}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-300 px-2 py-1.5 rounded-lg hover:bg-gray-50"
          >
            <X className="w-3 h-3" /> Clear
          </button>
        )}

        {/* Type filter */}
        <FilterSelect
          value={filters.typeId}
          onChange={(v) => setFilter('typeId', v)}
          placeholder="All Types"
          options={types}
        />

        {/* Branch filter */}
        {canSeeAll && (
          <FilterSelect
            value={filters.branchId}
            onChange={(v) => setFilter('branchId', v)}
            placeholder="All Branchs"
            options={lookups.branches}
          />
        )}

        {/* Staff filter */}
        {isAdminOrMgr && (
          <FilterSelect
            value={filters.assignedToId}
            onChange={(v) => setFilter('assignedToId', v)}
            placeholder="All Staffs"
            options={lookups.staff}
          />
        )}
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}

      {/* ── Table ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-white">
              {['NAME','PHONE','EMAIL','TYPE','BRANCH','ASSIGNED TO','LEADS','DEALS',''].map((h) => (
                <th key={h} className="text-left text-xs font-semibold text-gray-500 tracking-wide px-4 py-3">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={9} className="text-center py-16 text-gray-400 text-sm">Loading…</td></tr>
            )}
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-16">
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Inbox className="w-8 h-8 text-gray-300" />
                    <span className="text-sm">No contacts found</span>
                  </div>
                </td>
              </tr>
            )}
            {!loading && data.map((row) => (
              <tr
                key={row.id}
                className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                  row.isDuplicate ? 'bg-amber-50/40' : row.requiresReview ? 'bg-blue-50/30' : ''
                }`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-gray-900">
                      {row.firstName} {row.lastName}
                    </span>
                    {row.isDuplicate    && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" title="Duplicate phone" />}
                    {row.requiresReview && <Info          className="w-3.5 h-3.5 text-blue-400 shrink-0"  title="Requires review" />}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600">{row.phone || <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-gray-600">{row.email || <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3">
                  {row.type
                    ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">{row.type.name}</span>
                    : <span className="text-gray-300">—</span>
                  }
                </td>
                <td className="px-4 py-3 text-gray-600">{row.branch?.name || <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3 text-gray-600">{row.assignedTo?.name || <span className="text-gray-300">—</span>}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-semibold">
                    {row._count?.leads ?? 0}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 text-xs font-semibold">
                    {row._count?.deals ?? 0}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => { setEditing(row); setFormOpen(true); }}
                    className="text-xs text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-lg transition-colors"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} />

      <ContactFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        initial={editing}
        onSave={handleSave}
        lookups={{ ...lookups, types }}
      />
    </div>
  );
}

function FilterSelect({ value, onChange, placeholder, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  );
}
