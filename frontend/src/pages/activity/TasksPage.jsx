import { useState, useEffect, useCallback } from 'react';
import {
  CheckSquare, Plus, Pencil, Trash2, Check, Clock, AlertCircle,
  X, Calendar, User, Link2,
} from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import useLookups from '../../hooks/useLookups.js';
import Pagination from '../../components/ui/Pagination.jsx';

const PAGE_SIZE = 20;
const TODAY = new Date().toLocaleDateString('en-CA');

const STATUS_OPTS  = [['PENDING','Pending'],['IN_PROGRESS','In Progress'],['DONE','Done'],['CANCELLED','Cancelled']];
const PRIORITY_OPTS = [['LOW','Low'],['MEDIUM','Medium'],['HIGH','High']];
const VIEWS = [
  { id: '',         label: 'All Tasks'    },
  { id: 'mine',     label: 'My Tasks'     },
  { id: 'today',    label: "Today's"      },
  { id: 'overdue',  label: 'Overdue'      },
  { id: 'upcoming', label: 'Upcoming'     },
];
const STATUS_STYLE = {
  PENDING:     'text-blue-600 bg-blue-50 border-blue-200',
  IN_PROGRESS: 'text-amber-600 bg-amber-50 border-amber-200',
  DONE:        'text-emerald-700 bg-emerald-50 border-emerald-200',
  CANCELLED:   'text-gray-500 bg-gray-100 border-gray-200',
};
const PRIORITY_STYLE = {
  HIGH:   'text-red-600 bg-red-50 border-red-200',
  MEDIUM: 'text-amber-600 bg-amber-50 border-amber-200',
  LOW:    'text-slate-500 bg-slate-50 border-slate-200',
};
const dmy = (s) => (s ? s.slice(0, 10).split('-').reverse().join('/') : '—');

export default function TasksPage() {
  const { user }    = useAuth();
  const { lookups } = useLookups();

  const [view, setView]       = useState('');
  const [page, setPage]       = useState(1);
  const [result, setResult]   = useState({ data: [], total: 0, pages: 1 });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing]   = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { page, limit: PAGE_SIZE, view };
      setResult((await api.get('/tasks', { params })).data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load tasks');
    } finally { setLoading(false); }
  }, [page, view]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleDone = async (task) => {
    const next = task.status === 'DONE' ? 'PENDING' : 'DONE';
    try { await api.put(`/tasks/${task.id}`, { status: next }); fetchData(); }
    catch (err) { setError(err.response?.data?.error || 'Could not update task'); }
  };

  const deleteTask = async (id) => {
    if (!confirm('Delete this task?')) return;
    try { await api.delete(`/tasks/${id}`); fetchData(); }
    catch (err) { setError(err.response?.data?.error || 'Could not delete task'); }
  };

  const today = new Date().toLocaleDateString('en-CA');

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
            <CheckSquare className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tasks</h1>
            <p className="text-xs text-gray-400 mt-0.5">Follow-ups, calls and actions linked to leads, deals and customers</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="border border-gray-200 rounded-xl px-3 py-1.5 bg-white">
            <p className="text-[10px] text-gray-400 leading-none tracking-wide">TOTAL TASKS</p>
            <p className="text-lg font-bold text-gray-900 leading-tight text-right font-mono">{result.total.toLocaleString('en-IN')}</p>
          </div>
          <button onClick={() => { setEditing(null); setFormOpen(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium">
            <Plus className="w-4 h-4" /> New Task
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1 flex-wrap">
        {VIEWS.map((v) => (
          <button key={v.id} onClick={() => { setView(v.id); setPage(1); }}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === v.id ? 'bg-gray-900 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {v.label}
          </button>
        ))}
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {['', 'TASK', 'DUE DATE', 'PRIORITY', 'STATUS', 'ASSIGNED TO', 'LINKED TO', ''].map((h) => (
                <th key={h || Math.random()} className="text-left text-[10px] font-semibold text-gray-500 tracking-widest px-4 py-3 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={8} className="text-center text-gray-400 py-12">Loading…</td></tr>}
            {!loading && result.data.length === 0 && (
              <tr><td colSpan={8} className="text-center text-gray-400 py-12">No tasks found</td></tr>
            )}
            {!loading && result.data.map((task) => {
              const done      = task.status === 'DONE';
              const dueSoon   = !done && task.dueDate && task.dueDate.slice(0, 10) <= today;
              const isOverdue = dueSoon && task.dueDate.slice(0, 10) < today;
              return (
                <tr key={task.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 w-10">
                    <button onClick={() => toggleDone(task)} aria-label={done ? 'Mark pending' : 'Mark done'}
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 hover:border-pink-400'}`}>
                      {done && <Check className="w-3 h-3" />}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <p className={`font-semibold ${done ? 'line-through text-gray-400' : 'text-gray-900'}`}>{task.title}</p>
                    {task.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{task.description}</p>}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${isOverdue ? 'text-red-500' : dueSoon ? 'text-orange-500' : 'text-gray-600'}`}>
                      {isOverdue ? <AlertCircle className="w-3.5 h-3.5" /> : <Calendar className="w-3.5 h-3.5" />}
                      {dmy(task.dueDate)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold rounded-full px-2.5 py-0.5 border ${PRIORITY_STYLE[task.priority]}`}>{task.priority}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-bold rounded-full px-2.5 py-0.5 border ${STATUS_STYLE[task.status]}`}>{task.status.replace('_', ' ')}</span>
                  </td>
                  <td className="px-4 py-3">
                    {task.assignedTo ? (
                      <span className="flex items-center gap-1.5 text-xs text-gray-700">
                        <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-[10px] font-bold flex items-center justify-center shrink-0">{task.assignedTo.name[0]}</span>
                        {task.assignedTo.name}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {task.lead    && <p className="flex items-center gap-1"><Link2 className="w-3 h-3" /> Lead #{task.lead.leadNo}</p>}
                    {task.contact && <p className="flex items-center gap-1"><User className="w-3 h-3" /> {task.contact.firstName} {task.contact.lastName}</p>}
                    {task.deal    && <p className="flex items-center gap-1"><Link2 className="w-3 h-3" /> Deal · {task.deal.stage?.name}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(task); setFormOpen(true); }}
                        className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-indigo-600"><Pencil className="w-3.5 h-3.5" /></button>
                      {user?.role === 'ADMIN' && (
                        <button onClick={() => deleteTask(task.id)}
                          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="px-4 py-3 border-t border-gray-100">
          <Pagination page={page} pages={result.pages} total={result.total} limit={PAGE_SIZE} onPage={setPage} />
        </div>
      </div>

      <TaskModal open={formOpen} initial={editing} lookups={lookups} onClose={() => setFormOpen(false)} onSaved={fetchData} />
    </div>
  );
}

function TaskModal({ open, initial, lookups, onClose, onSaved }) {
  const { user } = useAuth();
  const EMPTY = {
    title: '', description: '', dueDate: '', reminderDate: '',
    priority: 'MEDIUM', leadId: '', dealId: '', contactId: '', visitId: '', assignedToId: '',
  };
  const [form, setForm]       = useState(EMPTY);
  const [leads, setLeads]     = useState([]);
  const [deals, setDeals]     = useState([]);
  const [contacts, setContacts] = useState([]);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(initial ? {
      title:        initial.title,
      description:  initial.description || '',
      dueDate:      initial.dueDate ? initial.dueDate.slice(0, 10) : '',
      reminderDate: initial.reminderDate ? initial.reminderDate.slice(0, 10) : '',
      priority:     initial.priority || 'MEDIUM',
      leadId:       initial.leadId    || '',
      dealId:       initial.dealId    || '',
      contactId:    initial.contactId || '',
      visitId:      initial.visitId   || '',
      assignedToId: initial.assignedToId || '',
    } : EMPTY);
    // Load dropdowns in parallel
    Promise.allSettled([
      api.get('/leads',    { params: { limit: 200 } }),
      api.get('/contacts', { params: { limit: 200 } }),
    ]).then(([l, c]) => {
      setLeads(l.value?.data?.data || []);
      setContacts(c.value?.data?.data || []);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Deals: auto-load when a lead is chosen
  useEffect(() => {
    if (!open || !form.leadId) { setDeals([]); return; }
    api.get('/deals', { params: { limit: 50 } }).then((r) => {
      const all = r.data.data || (Array.isArray(r.data) ? r.data.flatMap((col) => col.deals) : []);
      setDeals(all.filter((d) => d.leadId === form.leadId));
    }).catch(() => {});
  }, [open, form.leadId]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (initial) await api.put(`/tasks/${initial.id}`, form);
      else         await api.post('/tasks', form);
      onSaved(); onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not save the task');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label={initial ? 'Edit Task' : 'New Task'} className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto">

        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">{initial ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <Field label="TASK TITLE">
            <input value={form.title} onChange={set('title')} required placeholder="e.g. Call Client" className={INPUT} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="DUE DATE">
              <input type="date" value={form.dueDate} onChange={set('dueDate')} className={INPUT} />
            </Field>
            <Field label="PRIORITY">
              <select value={form.priority} onChange={set('priority')} className={INPUT}>
                {PRIORITY_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
          </div>

          <fieldset className="space-y-2">
            <legend className={LABEL}>RELATED TO</legend>
            <div className="grid grid-cols-2 gap-3">
              <select value={form.leadId} onChange={set('leadId')} className={INPUT}>
                <option value="">Select Lead</option>
                {leads.map((l) => <option key={l.id} value={l.id}>{l.firstName} {l.lastName}{l.phone ? ` (${l.phone})` : ''}</option>)}
              </select>
              <select value={form.dealId} onChange={set('dealId')} className={INPUT}>
                <option value="">Select Deal</option>
                {deals.map((d) => <option key={d.id} value={d.id}>₹{Math.round(d.value || 0).toLocaleString('en-IN')} · {d.stage?.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <select value={form.contactId} onChange={set('contactId')} className={INPUT}>
                <option value="">Select Customer</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}{c.phone ? ` (${c.phone})` : ''}</option>)}
              </select>
              <select value={form.visitId} onChange={set('visitId')} className={INPUT} disabled={!form.leadId && !form.contactId}>
                <option value="">Link Visit (Optional)</option>
              </select>
            </div>
            <p className="text-[10px] text-gray-400">*Select Lead, Deal, OR Customer</p>
          </fieldset>

          <div className="grid grid-cols-2 gap-4">
            <Field label="REMINDER DATE">
              <input type="date" value={form.reminderDate} onChange={set('reminderDate')}
                className={`${INPUT} ${!form.reminderDate ? 'text-red-400' : ''}`} />
            </Field>
            <Field label="ASSIGNED TO">
              <select value={form.assignedToId} onChange={set('assignedToId')} className={INPUT} disabled={user?.role === 'SALES'}>
                <option value="">Unassigned</option>
                {lookups.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
          </div>

          <Field label="DESCRIPTION">
            <textarea rows={3} maxLength={2000} value={form.description} onChange={set('description')}
              placeholder="Add notes or context…" className={`${INPUT} resize-none`} />
          </Field>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="px-6 py-2 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving…' : initial ? 'Save Changes' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return <div><label className={`${LABEL} block`}>{label}</label>{children}</div>;
}

const LABEL = 'text-[10px] font-semibold text-gray-500 tracking-widest mb-1.5';
const INPUT = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white disabled:opacity-50';
