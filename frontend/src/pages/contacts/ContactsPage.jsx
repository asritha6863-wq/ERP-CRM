import { useState, useEffect } from 'react';
import { Plus, AlertTriangle, Info } from 'lucide-react';
import useContacts from '../../hooks/useContacts.js';
import useLookups  from '../../hooks/useLookups.js';
import { useAuth } from '../../context/AuthContext.jsx';
import DataTable   from '../../components/ui/DataTable.jsx';
import Pagination  from '../../components/ui/Pagination.jsx';
import FilterBar   from '../../components/ui/FilterBar.jsx';
import Button      from '../../components/ui/Button.jsx';
import Badge       from '../../components/ui/Badge.jsx';
import ContactFormModal from './ContactFormModal.jsx';
import api from '../../services/api.js';

export default function ContactsPage() {
  const { user }    = useAuth();
  const { lookups } = useLookups();
  const {
    data, total, pages, page, setPage,
    search, setSearch, filters, setFilter, clearFilters,
    loading, error, limit,
    createContact, updateContact, deleteContact, refetch,
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

  const columns = [
    {
      key: 'firstName',
      header: 'Name',
      sortable: true,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{row.firstName} {row.lastName}</span>
          {row.isDuplicate    && <span title="Duplicate phone"><AlertTriangle className="w-3.5 h-3.5 text-amber-500" /></span>}
          {row.requiresReview && <span title="Requires review"><Info className="w-3.5 h-3.5 text-blue-400" /></span>}
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: (v) => v || <span className="text-gray-400">—</span> },
    { key: 'email', header: 'Email', render: (v) => v || <span className="text-gray-400">—</span> },
    {
      key: 'type',
      header: 'Type',
      render: (_, row) => row.type
        ? <Badge label={row.type.name} color="#6366f1" />
        : <span className="text-gray-400">—</span>,
    },
    ...(canSeeAll ? [{ key: 'branch', header: 'Branch', render: (_, row) => row.branch?.name || '—' }] : []),
    {
      key: 'assignedTo',
      header: 'Assigned To',
      render: (_, row) => row.assignedTo?.name || '—',
    },
    {
      key: '_count',
      header: 'Leads',
      render: (_, row) => (
        <span className="text-sm text-gray-600">{row._count?.leads ?? 0}</span>
      ),
    },
    {
      key: '_countDeals',
      header: 'Deals',
      render: (_, row) => (
        <span className="text-sm text-gray-600">{row._count?.deals ?? 0}</span>
      ),
    },
    {
      key: '_actions',
      header: '',
      className: 'w-20',
      render: (_, row) => (
        <div className="flex gap-1">
          <button
            onClick={() => { setEditing(row); setFormOpen(true); }}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-indigo-600 text-xs"
          >
            Edit
          </button>
        </div>
      ),
    },
  ];

  const duplicateCount = data.filter((c) => c.isDuplicate).length;
  const reviewCount    = data.filter((c) => c.requiresReview).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Contacts</h1>
          <p className="text-sm text-gray-500 mt-0.5">Master list of all people</p>
        </div>
        <Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>New Contact</Button>
      </div>

      {/* Migration flags summary */}
      {(duplicateCount > 0 || reviewCount > 0) && (
        <div className="flex flex-wrap gap-3">
          {duplicateCount > 0 && (
            <button
              onClick={() => setFilter('isDuplicate', filters.isDuplicate === 'true' ? '' : 'true')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                filters.isDuplicate === 'true'
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
              {duplicateCount} duplicate phone{duplicateCount > 1 ? 's' : ''}
            </button>
          )}
          {reviewCount > 0 && (
            <button
              onClick={() => setFilter('requiresReview', filters.requiresReview === 'true' ? '' : 'true')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                filters.requiresReview === 'true'
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              }`}
            >
              <Info className="w-4 h-4" />
              {reviewCount} need{reviewCount === 1 ? 's' : ''} review
            </button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <FilterBar search={search} onSearch={setSearch} placeholder="Search by name, phone, email…" onClear={clearFilters} />
        <FilterSelect label="Type"   value={filters.typeId}       onChange={(v) => setFilter('typeId', v)}       options={types} />
        {canSeeAll    && <FilterSelect label="Branch" value={filters.branchId}     onChange={(v) => setFilter('branchId', v)}     options={lookups.branches} />}
        {isAdminOrMgr && <FilterSelect label="Staff"  value={filters.assignedToId} onChange={(v) => setFilter('assignedToId', v)} options={lookups.staff} />}
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}

      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage="No contacts found"
        rowClassName={(row) => row.isDuplicate ? 'bg-amber-50/50' : row.requiresReview ? 'bg-blue-50/30' : ''}
      />
      <Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} />

      <ContactFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        initial={editing}
        onSave={handleSave}
        lookups={{ ...lookups, types }}
      />
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
      <option value="">All {label}s</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  );
}
