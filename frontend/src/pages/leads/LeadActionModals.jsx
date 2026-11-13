import { useState, useEffect } from 'react';
import { X, Trophy, XCircle, Phone, Mail, MapPin } from 'lucide-react';
import api from '../../services/api.js';

const fmtDateTime = (d) =>
  new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const inr = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const INPUT = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white';

function Shell({ open, title, subtitle, onClose, wide, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-label={title} className={`bg-white rounded-2xl shadow-2xl w-full ${wide ? 'max-w-2xl' : 'max-w-md'} max-h-[90vh] flex flex-col`}>
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{title}</h2>
            {subtitle && <p className="text-xs text-gray-400 mt-0.5 truncate">{subtitle}</p>}
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// Full class names so Tailwind can see them at build time
const OUTCOME_ACTIVE = {
  WON:  'border-emerald-500 bg-emerald-50 text-emerald-700',
  LOST: 'border-red-500 bg-red-50 text-red-700',
};

const leadName = (l) => (l ? `${l.firstName} ${l.lastName}`.trim() : '');

// ── Won / Loss status ─────────────────────────────────────────────
export function WonLossModal({ open, lead, lostReasons, onWin, onLose, onClose }) {
  const [outcome, setOutcome] = useState('WON');
  const [value, setValue] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [lostReasonId, setLostReasonId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (open) { setOutcome('WON'); setValue(''); setInvoiceRef(''); setLostReasonId(''); setError(''); } }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (outcome === 'WON' && !(+value > 0)) return setError('Enter the sale value (greater than 0)');
    if (outcome === 'LOST' && !lostReasonId) return setError('Select a loss reason');
    setSaving(true);
    try {
      if (outcome === 'WON') await onWin(lead.id, { value: +value, invoiceRef: invoiceRef.trim() || undefined });
      else await onLose(lead.id, { lostReasonId });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update the lead');
    } finally { setSaving(false); }
  };

  const done = lead?.isWon || lead?.isLost;

  return (
    <Shell open={open} title="Won / Loss Status" subtitle={leadName(lead)} onClose={onClose}>
      {done ? (
        <p className="text-sm text-gray-600">This lead is already marked <strong>{lead.isWon ? 'Won' : 'Lost'}</strong> and can't be changed here.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[['WON', 'Won', Trophy], ['LOST', 'Lost', XCircle]].map(([id, label, Icon]) => (
              <button type="button" key={id} onClick={() => setOutcome(id)}
                className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3 text-sm font-semibold transition-colors ${
                  outcome === id ? OUTCOME_ACTIVE[id] : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}>
                <Icon className="w-4 h-4" /> {label}
              </button>
            ))}
          </div>

          {outcome === 'WON' ? (
            <>
              <label className="block"><span className="block text-xs font-semibold text-gray-500 mb-1.5">Sale value (₹) *</span>
                <input type="number" min="1" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} className={INPUT} placeholder="e.g. 25000" /></label>
              <label className="block"><span className="block text-xs font-semibold text-gray-500 mb-1.5">Invoice reference</span>
                <input value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} className={INPUT} placeholder="e.g. INV-2026-001" /></label>
              <p className="text-xs text-gray-400">A deal is created in the Won stage with this value.</p>
            </>
          ) : (
            <label className="block"><span className="block text-xs font-semibold text-gray-500 mb-1.5">Loss reason *</span>
              <select value={lostReasonId} onChange={(e) => setLostReasonId(e.target.value)} className={INPUT}>
                <option value="">Select reason…</option>
                {lostReasons.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select></label>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="px-6 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </Shell>
  );
}

// ── Lead status ───────────────────────────────────────────────────
export function LeadStatusModal({ open, lead, statuses, onSave, onClose }) {
  const [statusId, setStatusId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { if (open) { setStatusId(lead?.statusId || ''); setError(''); } }, [open, lead]);

  const submit = async (e) => {
    e.preventDefault();
    if (!statusId) return setError('Select a status');
    setSaving(true); setError('');
    try { await onSave(lead.id, { statusId }); onClose(); }
    catch (err) { setError(err.response?.data?.error || 'Could not update the status'); }
    finally { setSaving(false); }
  };

  return (
    <Shell open={open} title="Lead Status" subtitle={leadName(lead)} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <select value={statusId} onChange={(e) => setStatusId(e.target.value)} className={INPUT}>
          <option value="">Select status…</option>
          {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
          <button disabled={saving} className="px-6 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold disabled:opacity-60">{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Shell>
  );
}

// ── History log ───────────────────────────────────────────────────
export function HistoryModal({ open, lead, onClose }) {
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !lead) return;
    setItems(null); setError('');
    api.get(`/leads/${lead.id}/activities`)
      .then((r) => setItems(r.data))
      .catch((err) => setError(err.response?.data?.error || 'Could not load history'));
  }, [open, lead]);

  return (
    <Shell open={open} title="History Log" subtitle={leadName(lead)} onClose={onClose}>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!error && items === null && <p className="text-sm text-gray-400">Loading…</p>}
      {items && items.length === 0 && <p className="text-sm text-gray-400">No activity recorded yet.</p>}
      {items && items.length > 0 && (
        <ol className="space-y-4 border-l-2 border-gray-100 pl-4">
          {items.map((a) => (
            <li key={a.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-pink-500" />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-bold tracking-wide text-gray-500 bg-gray-100 rounded px-1.5 py-0.5">{a.type.replace('_', ' ')}</span>
                <span className="text-[11px] text-gray-400">{fmtDateTime(a.createdAt)}{a.user ? ` · ${a.user.name}` : ''}</span>
              </div>
              <p className="text-sm text-gray-700 mt-1">{a.description}</p>
            </li>
          ))}
        </ol>
      )}
    </Shell>
  );
}

// ── Customer 360 ──────────────────────────────────────────────────
export function Customer360Modal({ open, lead, onClose }) {
  const [state, setState] = useState({ loading: false, contact: null, leads: [], deals: [], error: '' });

  useEffect(() => {
    if (!open || !lead) return;
    if (!lead.contactId) { setState({ loading: false, contact: null, leads: [], deals: [], error: 'This lead has no linked customer record.' }); return; }
    setState({ loading: true, contact: null, leads: [], deals: [], error: '' });
    Promise.allSettled([
      api.get(`/contacts/${lead.contactId}`),
      api.get(`/contacts/${lead.contactId}/leads`, { params: { limit: 20 } }),
      api.get(`/contacts/${lead.contactId}/deals`, { params: { limit: 20 } }),
    ]).then(([c, l, d]) => setState({
      loading: false,
      contact: c.value?.data || null,
      leads:   l.value?.data?.data || [],
      deals:   d.value?.data?.data || [],
      error:   c.status === 'rejected' ? (c.reason.response?.data?.error || 'Could not load the customer') : '',
    }));
  }, [open, lead]);

  const { loading, contact, leads, deals, error } = state;

  return (
    <Shell open={open} title="Customer 360" subtitle={leadName(lead)} onClose={onClose} wide>
      {loading && <p className="text-sm text-gray-400">Loading…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {contact && (
        <div className="space-y-5">
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-4">
            <p className="text-base font-bold text-gray-900">{contact.firstName} {contact.lastName}</p>
            <div className="flex flex-wrap gap-x-5 gap-y-1 mt-2 text-xs text-gray-600">
              {contact.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {contact.phone}</span>}
              {contact.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {contact.email}</span>}
              {contact.branch && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {contact.branch.name}</span>}
              {contact.type && <span className="font-semibold text-indigo-600">{contact.type.name}</span>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-200 p-3"><p className="text-[10px] font-semibold text-gray-400 tracking-wide">LEADS</p><p className="text-2xl font-bold font-mono">{contact._count?.leads ?? leads.length}</p></div>
            <div className="rounded-xl border border-gray-200 p-3"><p className="text-[10px] font-semibold text-gray-400 tracking-wide">DEALS</p><p className="text-2xl font-bold font-mono">{contact._count?.deals ?? deals.length}</p></div>
          </div>

          <section>
            <h3 className="text-xs font-bold text-gray-500 tracking-widest mb-2">LEADS</h3>
            {leads.length === 0 ? <p className="text-xs text-gray-400">None</p> : (
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
                {leads.map((l) => (
                  <li key={l.id} className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="text-gray-700">{l.source?.name || 'No source'} · {new Date(l.createdAt).toLocaleDateString('en-GB')}</span>
                    <span className="font-semibold text-gray-500">{l.isWon ? 'WON' : l.isLost ? 'LOST' : (l.status?.name || 'PENDING')}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h3 className="text-xs font-bold text-gray-500 tracking-widest mb-2">DEALS</h3>
            {deals.length === 0 ? <p className="text-xs text-gray-400">None</p> : (
              <ul className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
                {deals.map((d) => (
                  <li key={d.id} className="flex items-center justify-between px-3 py-2 text-xs">
                    <span className="text-gray-700">{d.stage?.name}{d.invoiceRef ? ` · ${d.invoiceRef}` : ''}</span>
                    <span className="font-mono font-semibold text-gray-800">{inr(d.value)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </Shell>
  );
}
