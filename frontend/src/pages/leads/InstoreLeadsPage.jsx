import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, ExternalLink } from 'lucide-react';
import useLeads    from '../../hooks/useLeads.js';
import useLookups  from '../../hooks/useLookups.js';
import { useAuth } from '../../context/AuthContext.jsx';
import DataTable   from '../../components/ui/DataTable.jsx';
import Pagination  from '../../components/ui/Pagination.jsx';
import FilterBar   from '../../components/ui/FilterBar.jsx';
import Button      from '../../components/ui/Button.jsx';
import Badge       from '../../components/ui/Badge.jsx';
import LeadFormModal from './LeadFormModal.jsx';
import ImportModal   from './ImportModal.jsx';

export default function InstoreLeadsPage() {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const { lookups } = useLookups();
  const {
    data, total, pages, page, setPage,
    search, setSearch, filters, setFilter, clearFilters,
    loading, error, limit,
    createLead, updateLead, refetch,
  } = useLeads('INSTORE'); // ← filtered to instore channel

  const [formOpen, setFormOpen]     = useState(false);
  const [editing, setEditing]       = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const handleSave = async (form) => {
    // Always set channel to INSTORE for this page
    const payload = { ...form, channel: 'INSTORE' };
    if (editing) await updateLead(editing.id, payload);
    else         await createLead(payload);
  };

  const canSeeAll    = user?.role !== 'SALES';
  const isAdminOrMgr = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const columns = [
    {
      key: 'firstName',
      header: 'Name',
      sortable: true,
      render: (_, row) => (
        <button onClick={() => navigate(`/leads/${row.id}`)} className="text-indigo-600 hover:underline font-medium flex items-center gap-1">
          {row.firstName} {row.lastName}
          <ExternalLink className="w-3 h-3" />
        </button>
      ),
    },
    { key: 'phone', header: 'Phone', render: (v) => v || '—' },
    { key: 'email', header: 'Email', render: (v) => v || '—' },
    {
      key: 'status',
      header: 'Status',
      render: (_, row) => row.status
        ? <Badge label={row.status.name} color={row.status.color} />
        : <span className="text-gray-400">—</span>,
    },
    {
      key: 'source',
      header: 'Source',
      render: (_, row) => row.source?.name || '—',
    },
    ...(canSeeAll ? [{ key: 'branch', header: 'Branch', render: (_, row) => row.branch?.name || '—' }] : []),
    {
      key: 'assignedTo',
      header: 'Assigned To',
      render: (_, row) => row.assignedTo?.name || '—',
    },
    {
      key: '_actions',
      header: '',
      className: 'w-20',
      render: (_, row) => (
        <button
          onClick={() => { setEditing(row); setFormOpen(true); }}
          className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-indigo-600 text-xs"
        >
          Edit
        </button>
      ),
    },
  ];

  // Filter sources to Instore ones only
  const instoreSources = lookups.sources.filter((s) => {
    const name = s.name?.toLowerCase();
    return name?.includes('walk') || s.defaultChannel === 'INSTORE';
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Instore Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">Walk-in visitors and instore enquiries</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={Upload} onClick={() => setImportOpen(true)}>Import</Button>
          <Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>New Instore Lead</Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterBar search={search} onSearch={setSearch} placeholder="Search by name, phone, email…" onClear={clearFilters} />
        <FilterSelect label="Status" value={filters.statusId} onChange={(v) => setFilter('statusId', v)} options={lookups.statuses} />
        <FilterSelect label="Source" value={filters.sourceId} onChange={(v) => setFilter('sourceId', v)} options={instoreSources} />
        {canSeeAll   && <FilterSelect label="Branch" value={filters.branchId}     onChange={(v) => setFilter('branchId', v)}     options={lookups.branches} />}
        {isAdminOrMgr && <FilterSelect label="Staff"  value={filters.assignedToId} onChange={(v) => setFilter('assignedToId', v)} options={lookups.staff} />}
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}

      <DataTable columns={columns} data={data} loading={loading} emptyMessage="No instore leads found" />
      <Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} />

      <LeadFormModal
        open={formOpen} onClose={() => setFormOpen(false)}
        initial={editing ? { ...editing, channel: 'INSTORE' } : { channel: 'INSTORE' }}
        onSave={handleSave}
        lookups={{ ...lookups, sources: instoreSources }}
      />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onDone={refetch} />
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
