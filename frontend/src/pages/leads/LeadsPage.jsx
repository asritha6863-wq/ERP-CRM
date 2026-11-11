import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, UserCheck, ExternalLink } from 'lucide-react';
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

export default function LeadsPage() {
  const navigate     = useNavigate();
  const { user }     = useAuth();
  const { lookups }  = useLookups();
  const {
    data, total, pages, page, setPage,
    search, setSearch, filters, setFilter, clearFilters,
    loading, error, limit,
    createLead, updateLead, bulkAssign, convertLead, refetch,
  } = useLeads();

  const [formOpen, setFormOpen]       = useState(false);
  const [editing, setEditing]         = useState(null);
  const [importOpen, setImportOpen]   = useState(false);
  const [selected, setSelected]       = useState(new Set());
  const [assigneeId, setAssigneeId]   = useState('');
  const [assigning, setAssigning]     = useState(false);

  const toggleSelect = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll    = () => setSelected((s) => s.size === data.length ? new Set() : new Set(data.map((r) => r.id)));

  const handleBulkAssign = async () => {
    if (!assigneeId || selected.size === 0) return;
    setAssigning(true);
    try {
      await bulkAssign({ leadIds: [...selected], assignedToId: assigneeId });
      setSelected(new Set());
    } finally { setAssigning(false); }
  };

  const handleSave = async (form) => {
    if (editing) await updateLead(editing.id, form);
    else         await createLead(form);
  };

  const canSeeAll    = user?.role !== 'SALES';
  const isAdminOrMgr = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const columns = [
    {
      key: '_check',
      header: <input type="checkbox" onChange={toggleAll} checked={selected.size === data.length && data.length > 0} className="rounded" />,
      render: (_, row) => <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleSelect(row.id)} className="rounded" />,
      className: 'w-10',
    },
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
    { key: 'phone', header: 'Phone',  render: (v) => v || '—' },
    { key: 'email', header: 'Email',  render: (v) => v || '—' },
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
    ...(canSeeAll ? [{
      key: 'branch',
      header: 'Branch',
      render: (_, row) => row.branch?.name || '—',
    }] : []),
    {
      key: 'assignedTo',
      header: 'Assigned To',
      render: (_, row) => row.assignedTo?.name || '—',
    },
    {
      key: 'isConverted',
      header: '',
      render: (val) => val ? <Badge label="Converted" color="bg-emerald-100 text-emerald-700" /> : null,
    },
    {
      key: '_actions',
      header: '',
      className: 'w-20',
      render: (_, row) => (
        <div className="flex gap-1">
          <button onClick={() => { setEditing(row); setFormOpen(true); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-indigo-600 text-xs">Edit</button>
          {!row.isConverted && (
            <button onClick={() => convertLead(row.id)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-emerald-600 text-xs">
              <UserCheck className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Leads</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={Upload} onClick={() => setImportOpen(true)}>Import</Button>
          <Button icon={Plus} onClick={() => { setEditing(null); setFormOpen(true); }}>New Lead</Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterBar search={search} onSearch={setSearch} placeholder="Search by name, phone, email…" onClear={clearFilters} />
        <FilterSelect label="Status"  value={filters.statusId}     onChange={(v) => setFilter('statusId', v)}     options={lookups.statuses} />
        <FilterSelect label="Source"  value={filters.sourceId}     onChange={(v) => setFilter('sourceId', v)}     options={lookups.sources}  />
        {canSeeAll && <FilterSelect label="Branch" value={filters.branchId} onChange={(v) => setFilter('branchId', v)} options={lookups.branches} />}
        {isAdminOrMgr && <FilterSelect label="Staff" value={filters.assignedToId} onChange={(v) => setFilter('assignedToId', v)} options={lookups.staff} />}
        <input type="date" value={filters.dateFrom} onChange={(e) => setFilter('dateFrom', e.target.value)}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
        <span className="text-gray-400 text-sm">to</span>
        <input type="date" value={filters.dateTo} onChange={(e) => setFilter('dateTo', e.target.value)}
          className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      {/* Bulk assign bar */}
      {selected.size > 0 && isAdminOrMgr && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-2.5 text-sm">
          <span className="font-medium text-indigo-700">{selected.size} selected</span>
          <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
            <option value="">Assign to…</option>
            {lookups.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <Button size="sm" loading={assigning} onClick={handleBulkAssign}>Assign</Button>
          <button onClick={() => setSelected(new Set())} className="text-gray-500 hover:text-gray-700 ml-auto">Clear</button>
        </div>
      )}

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}

      <DataTable columns={columns} data={data} loading={loading} emptyMessage="No leads found" />
      <Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} />

      <LeadFormModal open={formOpen} onClose={() => setFormOpen(false)} initial={editing} onSave={handleSave} lookups={lookups} />
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
