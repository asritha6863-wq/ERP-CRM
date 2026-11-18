import { useState, useEffect } from 'react';
import { EMPTY_FILTERS } from '../../hooks/useLeads.js';

const INPUT = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400';

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function Select({ value, onChange, allLabel, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT}>
      <option value="">{allLabel}</option>
      {options.map((o) => <option key={o.value ?? o.id} value={o.value ?? o.id}>{o.label ?? o.name}</option>)}
    </select>
  );
}

// Filter panel for the Leads page. Edits a draft; "Apply" pushes it to the list.
export default function LeadFilters({ filters, lookups, canSeeAll, onApply, onClear }) {
  const [draft, setDraft] = useState({ ...EMPTY_FILTERS, ...filters });
  useEffect(() => { setDraft({ ...EMPTY_FILTERS, ...filters }); }, [filters]);
  const set = (k) => (v) => setDraft((d) => ({ ...d, [k]: v }));
  const text = (k, ph) => (
    <input value={draft[k]} onChange={(e) => set(k)(e.target.value)} placeholder={ph} className={INPUT}
      onKeyDown={(e) => e.key === 'Enter' && onApply(draft)} />
  );
  const date = (k) => <input type="date" value={draft[k]} onChange={(e) => set(k)(e.target.value)} className={INPUT} />;

  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Field label="Customer Name">{text('name', 'Search name...')}</Field>
        <Field label="Phone Number">{text('phone', 'Search phone...')}</Field>
        <Field label="Marriage From Date">{date('marriageFrom')}</Field>
        <Field label="Marriage To Date">{date('marriageTo')}</Field>
        <Field label="Created From Date">{date('createdFrom')}</Field>
        <Field label="Created To Date">{date('createdTo')}</Field>
        <Field label="Stage"><Select value={draft.stageId} onChange={set('stageId')} allLabel="All Stages" options={lookups.stages} /></Field>
        <Field label="Status"><Select value={draft.statusId} onChange={set('statusId')} allLabel="All Statuses" options={lookups.statuses} /></Field>
        <Field label="Lead Source"><Select value={draft.sourceId} onChange={set('sourceId')} allLabel="All Lead Sources" options={lookups.sources} /></Field>
        <Field label="Created By / Owner"><Select value={draft.createdById} onChange={set('createdById')} allLabel="All Owners / Staff" options={lookups.staff} /></Field>
        <Field label="Assigned To"><Select value={draft.assignedToId} onChange={set('assignedToId')} allLabel="All Assigned Users" options={lookups.staff} /></Field>
        <Field label="Priority">
          <Select value={draft.priority} onChange={set('priority')} allLabel="All Priorities"
            options={[{ value: 'HIGH', label: 'High' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'LOW', label: 'Low' }]} />
        </Field>
        <Field label="Channel">
          <Select value={draft.channel} onChange={set('channel')} allLabel="All Channels"
            options={[{ value: 'OUTDOOR', label: 'Outdoor' }, { value: 'INSTORE', label: 'Instore' }]} />
        </Field>
        <Field label="Date Not Fixed (DNF)">
          <Select value={draft.dnf} onChange={set('dnf')} allLabel="All"
            options={[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }]} />
        </Field>
        {canSeeAll && <Field label="Branch"><Select value={draft.branchId} onChange={set('branchId')} allLabel="All Branches" options={lookups.branches} /></Field>}
      </div>
      <div className="flex items-center gap-3 mt-4">
        <button onClick={() => onApply(draft)} className="px-8 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold">Apply</button>
        <button onClick={() => { setDraft({ ...EMPTY_FILTERS }); onClear(); }} className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Clear</button>
      </div>
    </div>
  );
}
