import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import useCustomers    from '../../hooks/useCustomers.js';
import useLookups      from '../../hooks/useLookups.js';
import { useAuth }     from '../../context/AuthContext.jsx';
import DataTable       from '../../components/ui/DataTable.jsx';
import Pagination      from '../../components/ui/Pagination.jsx';
import FilterBar       from '../../components/ui/FilterBar.jsx';
import Button          from '../../components/ui/Button.jsx';
import Badge           from '../../components/ui/Badge.jsx';
import CustomerFormModal from './CustomerFormModal.jsx';

export default function CustomersPage() {
  const { user }     = useAuth();
  const { lookups }  = useLookups();
  const {
    data, total, pages, page, setPage,
    search, setSearch, filters, setFilter, clearFilters,
    loading, error, limit,
    createCustomer, updateCustomer, deleteCustomer,
  } = useCustomers();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing]   = useState(null);

  const canSeeAll    = user?.role !== 'SALES';
  const isAdminOrMgr = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const handleSave = async (form) => {
    if (editing) await updateCustomer(editing.id, form);
    else         await createCustomer(form);
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this customer? This cannot be undone.')) return;
    await deleteCustomer(id);
  };

  const columns = [
    {
      key: 'firstName',
      header: 'Name',
      sortable: true,
      render: (_, row) => <span className="font-medium">{row.firstName} {row.lastName}</span>,
    },
    { key: 'phone',  header: 'Phone', render: (v) => v || '—' },
    { key: 'email',  header: 'Email', render: (v) => v || '—' },
    { key: 'category', header: 'Category', render: (_, row) => row.category?.name || '—' },
    ...(canSeeAll ? [{ key: 'branch', header: 'Branch', render: (_, row) => row.branch?.name || '—' }] : []),
    { key: 'assignedTo', header: 'Assigned To', render: (_, row) => row.assignedTo?.name || '—' },
    {
      key: 'rating', header: 'Rating',
      render: (v) => v ? `${'★'.repeat(v)}${'☆'.repeat(5 - v)}` : '—',
    },
    {
      key: 'lead', header: 'From Lead',
      render: (_, row) => row.lead
        ? <Badge label="Lead Converted" color="bg-emerald-100 text-emerald-700" />
        : '—',
    },
    {
      key: '_actions', header: '', className: 'w-20',
      render: (_, row) => (
        <div className="flex gap-1">
          <button onClick={() => { setEditing(row); setFormOpen(true); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-indigo-600 text-xs">Edit</button>
          {user?.role === 'ADMIN' && (
            <button onClick={() => handleDelete(row.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Customers</h1>
        <Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>New Customer</Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterBar search={search} onSearch={setSearch} placeholder="Search customers…" onClear={clearFilters} />
        <FilterSelect label="Category"  value={filters.categoryId}   onChange={(v) => setFilter('categoryId', v)}   options={lookups.categories} />
        {canSeeAll && <FilterSelect label="Branch" value={filters.branchId} onChange={(v) => setFilter('branchId', v)} options={lookups.branches} />}
        {isAdminOrMgr && <FilterSelect label="Staff" value={filters.assignedToId} onChange={(v) => setFilter('assignedToId', v)} options={lookups.staff} />}
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}

      <DataTable columns={columns} data={data} loading={loading} emptyMessage="No customers found" />
      <Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} />

      <CustomerFormModal open={formOpen} onClose={() => setFormOpen(false)} initial={editing} onSave={handleSave} lookups={lookups} />
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
