import { useState, useEffect, useCallback } from 'react';
import { Bell, Plus, Maximize2, User, X } from 'lucide-react';
import api from '../../services/api.js';
import useLookups from '../../hooks/useLookups.js';

const DEFAULT_FILTERS = { dateFrom: '', dateTo: '', assignedToId: '', status: 'PENDING' };

export default function ReminderCenterPage() {
  const { lookups } = useLookups();
  const [items, setItems]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [view, setView]       = useState('card');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { limit: 100, ...filters };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const res = await api.get('/reminders', { params });
      setItems(res.data.data);
      setTotal(res.data.total);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load reminders');
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  const toggleStatus = async (r) => {
    const next = r.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED';
    try {
      await api.patch(`/reminders/${r.id}/status`, { status: next });
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update reminder');
    }
  };

  const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">Reminder Center</h1>
              <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md tracking-wide uppercase">
                Schedules &amp; Alerts
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Follow-up scheduling, customer callbacks and action tracking</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-1.5 bg-white">
            <div>
              <p className="text-[10px] text-gray-400 leading-none tracking-wide">TOTAL REMINDERS</p>
              <p className="text-lg font-bold text-gray-900 leading-tight text-right">{total}</p>
            </div>
            <Bell className="w-4 h-4 text-gray-300" />
          </div>

          <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400" aria-label="Expand">
            <Maximize2 className="w-4 h-4" />
          </button>

          <div className="flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
            {['card', 'grid'].map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                  view === v ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                }`}
              >
                {v}
              </button>
            ))}
          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Reminder
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
        <FilterField label="From Date">
          <input type="date" value={filters.dateFrom} onChange={(e) => setFilter('dateFrom', e.target.value)} className={INPUT} />
        </FilterField>
        <FilterField label="To Date">
          <input type="date" value={filters.dateTo} onChange={(e) => setFilter('dateTo', e.target.value)} className={INPUT} />
        </FilterField>
        <FilterField label="Assigned Staff">
          <select value={filters.assignedToId} onChange={(e) => setFilter('assignedToId', e.target.value)} className={INPUT}>
            <option value="">All Staff</option>
            {lookups.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </FilterField>
        <FilterField label="Status">
          <select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} className={INPUT}>
            <option value="">All</option>
            <option value="PENDING">Pending</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </FilterField>
        <button
          onClick={() => setFilters(DEFAULT_FILTERS)}
          className="rounded-lg border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          Reset
        </button>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}
      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {!loading && items.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-12">No reminders found</p>
      )}

      {/* Card view */}
      {view === 'card' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((r) => {
            const done = r.status === 'COMPLETED';
            return (
              <div key={r.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-400 flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-semibold truncate ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>{r.title}</p>
                      <p className="text-[10px] font-semibold text-gray-400 tracking-wide uppercase">Quick Reminder</p>
                    </div>
                    {done && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                        COMPLETED
                      </span>
                    )}
                  </div>

                  {r.description && (
                    <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2">{r.description}</p>
                  )}

                  <dl className="text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <dt className="text-[10px] font-semibold text-gray-400 tracking-wide uppercase">Assigned To</dt>
                      <dd className="font-medium text-gray-800">{r.assignedTo?.name || '—'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[10px] font-semibold text-gray-400 tracking-wide uppercase">Due Date</dt>
                      <dd className="font-medium text-gray-800">{fmtDate(r.dueDate)}</dd>
                    </div>
                    {r.contact && (
                      <div className="flex justify-between">
                        <dt className="text-[10px] font-semibold text-gray-400 tracking-wide uppercase">Customer</dt>
                        <dd className="font-medium text-gray-800">{r.contact.firstName} {r.contact.lastName}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="border-t border-gray-100 px-4 py-3 flex items-center justify-between">
                  <span className="w-7 h-7 rounded-full bg-gray-50 flex items-center justify-center text-gray-300">
                    <User className="w-3.5 h-3.5" />
                  </span>
                  <button
                    onClick={() => toggleStatus(r)}
                    className="text-[11px] font-bold tracking-wide uppercase border border-gray-200 rounded-full px-3 py-1 text-gray-600 hover:bg-gray-50"
                  >
                    {done ? 'Re-open' : 'Complete'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Grid view */}
      {view === 'grid' && items.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {['TITLE', 'CUSTOMER', 'ASSIGNED TO', 'DUE DATE', 'STATUS', ''].map((h) => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 tracking-wide px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((r) => {
                const done = r.status === 'COMPLETED';
                return (
                  <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className={`px-4 py-3 font-medium ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>{r.title}</td>
                    <td className="px-4 py-3 text-gray-600">{r.contact ? `${r.contact.firstName} ${r.contact.lastName}` : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{r.assignedTo?.name || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{fmtDate(r.dueDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${
                        done ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-amber-600 bg-amber-50 border-amber-200'
                      }`}>
                        {done ? 'COMPLETED' : 'PENDING'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => toggleStatus(r)} className="text-xs text-gray-500 hover:text-pink-600">
                        {done ? 'Re-open' : 'Complete'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ReminderModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        staff={lookups.staff}
        onSaved={fetchData}
      />
    </div>
  );
}

function ReminderModal({ open, onClose, staff, onSaved }) {
  const EMPTY = { title: '', dueDate: '', assignedToId: '', contactId: '', description: '' };
  const [form, setForm]         = useState(EMPTY);
  const [contacts, setContacts] = useState([]);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY); setError('');
    api.get('/contacts', { params: { limit: 100 } })
      .then((r) => setContacts(r.data.data || []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/reminders', form);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create reminder');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[94vh] overflow-y-auto">
        <div className="flex items-start justify-between px-8 pt-7 pb-4 bg-gray-50 rounded-t-3xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Schedule Action</h2>
            <p className="text-[11px] font-bold text-amber-500 tracking-widest uppercase mt-1">Set a new follow-up reminder</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2 border border-red-200">{error}</div>}

          <ModalField label="Quick Title">
            <input value={form.title} onChange={set('title')} required placeholder="e.g. Call for collection" className={MODAL_INPUT} />
          </ModalField>

          <div className="grid grid-cols-2 gap-4">
            <ModalField label="Due Date">
              <input type="date" value={form.dueDate} onChange={set('dueDate')} required className={MODAL_INPUT} />
            </ModalField>
            <ModalField label="Assigned Staff">
              <select value={form.assignedToId} onChange={set('assignedToId')} className={MODAL_INPUT}>
                <option value="">Select Staff</option>
                {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </ModalField>
          </div>

          <ModalField label="Related Customer">
            <select value={form.contactId} onChange={set('contactId')} className={MODAL_INPUT}>
              <option value="">No customer linked</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName}{c.phone ? ` (${c.phone})` : ''}</option>
              ))}
            </select>
          </ModalField>

          <ModalField label="Brief Description">
            <textarea value={form.description} onChange={set('description')} rows={4}
              placeholder="Add context to the reminder..." className={`${MODAL_INPUT} resize-none`} />
          </ModalField>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-pink-500 hover:bg-pink-600 text-white text-sm font-bold tracking-[0.25em] uppercase py-4 shadow-lg shadow-pink-200 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Activate Reminder'}
          </button>
        </form>
      </div>
    </div>
  );
}

function FilterField({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ModalField({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 tracking-widest uppercase mb-2">{label}</label>
      {children}
    </div>
  );
}

const INPUT       = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400';
const MODAL_INPUT = 'w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white';
