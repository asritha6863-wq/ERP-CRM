import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload } from 'lucide-react';
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
  } = useLeads('INSTORE'); // â† filtered to instore channel

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

  const fmt = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');
  const fullName = (r) => {
    const f = (r.firstName || '').trim(); const l = (r.lastName || '').trim();
    return l && l.toLowerCase() !== f.toLowerCase() ? `${f} ${l}` : f;
  };
  const PRIORITY = { HIGH: 'bg-red-50 text-red-600 border-red-200', MEDIUM: 'bg-amber-50 text-amber-600 border-amber-200', LOW: 'bg-green-50 text-green-600 border-green-200' };
  const cell = 'whitespace-nowrap';

  const columns = [
    {
      key: 'firstName', header: 'Name / Date', sortable: true,
      render: (_, row) => (
        <button onClick={() => navigate(`/leads/${row.id}`)} className="text-left min-w-[160px]">
          <div className="text-[10px] text-indigo-500 font-mono">{fmt(row.createdAt)}</div>
          <div className="font-semibold text-gray-900 hover:text-indigo-600 uppercase text-xs">{fullName(row)}</div>
        </button>
      ),
    },
    { key: 'phone', header: 'Contact / Area', className: cell, render: (_, r) => (
      <div className="text-xs"><div className="text-gray-800">{r.phone || '—'}</div>{r.area?.name && <div className="text-gray-400">{r.area.name}</div>}</div>
    ) },
    ...(canSeeAll ? [{ key: 'branch', header: 'Branch', render: (_, r) => <span className="text-xs uppercase text-gray-700">{r.branch?.name || '—'}</span> }] : []),
    { key: 'source', header: 'Lead Source', className: cell, render: (_, r) => r.source?.name
      ? <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">{r.source.name}</span> : '—' },
    { key: 'stage', header: 'Stage', className: cell, render: (_, r) => <span className="text-xs font-bold uppercase">{r.stage?.name || '—'}</span> },
    { key: 'status', header: 'Status', className: cell, render: (_, r) => r.status
      ? <Badge label={r.status.name} color={r.status.color} /> : <span className="text-gray-400">—</span> },
    { key: 'priority', header: 'Priority', className: cell, render: (_, r) => (
      <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${PRIORITY[r.priority] || PRIORITY.MEDIUM}`}>{r.priority || 'MEDIUM'}</span>
    ) },
    { key: 'createdAt', header: 'Created', className: cell, render: (v) => <span className="text-xs text-gray-600">{fmt(v)}</span> },
    { key: 'dueDate', header: 'Due Date', className: cell, render: (v) => <span className="text-xs text-red-500">{fmt(v)}</span> },
    { key: 'assignedTo', header: 'Assigned', className: cell, render: (_, r) => r.assignedTo?.name
      ? <span className="text-xs">{r.assignedTo.name}</span> : <span className="text-xs italic text-gray-400">Unassigned</span> },
    { key: '_actions', header: '', className: 'w-16', render: (_, row) => (
      <button onClick={() => { setEditing(row); setFormOpen(true); }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-indigo-600 text-xs">Edit</button>
    ) },
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
        <FilterBar search={search} onSearch={setSearch} placeholder="Search by name, phone, emailâ€¦" onClear={clearFilters} />
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
