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
  const [outcome, setOutcome] = useState('');   // '' | 'WON' | 'LOST'
  const [value, setValue]         = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [billDate, setBillDate]   = useState('');
  const [billNotes, setBillNotes] = useState('');
  const [lossReason, setLossReason] = useState('');
  const [remarks, setRemarks]     = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  useEffect(() => {
    if (open) {
      setOutcome(''); setValue(''); setInvoiceRef('');
      setBillDate(new Date().toLocaleDateString('en-CA'));
      setBillNotes(''); setLossReason(''); setRemarks(''); setError('');
    }
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (!outcome) return setError('Select Won or Lost');
    if (outcome === 'WON' && value !== '' && !(+value > 0)) return setError('Actual revenue must be greater than 0');
    if (outcome === 'LOST' && !lossReason.trim()) return setError('Reason for loss is required');
    setSaving(true); setError('');
    try {
      if (outcome === 'WON') {
        await onWin(lead.id, {
          value: value ? +value : 0,
          invoiceRef: invoiceRef.trim() || undefined,
          billDate: billDate || undefined,
          billNotes: billNotes.trim() || undefined,
        });
      } else {
        await onLose(lead.id, { lossReason: lossReason.trim(), remarks: remarks.trim() || undefined });
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update the lead');
    } finally { setSaving(false); }
  };

  const done = lead?.isWon || lead?.isLost;

  const WonIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-7 h-7">
      <circle cx="12" cy="12" r="10" /><path d="M8 12l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  const LostIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-7 h-7">
      <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" strokeLinecap="round" />
    </svg>
  );

  return (
    <Shell open={open} title="Update Won/Loss Status" subtitle={`${leadName(lead)} · Finalize Deal`} onClose={onClose}>
      {done ? (
        <div className="text-center py-6">
          <p className="text-sm text-gray-600">This lead is already marked <strong>{lead.isWon ? 'Won' : 'Lost'}</strong>.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-5">
          <p className="text-sm text-gray-500">Mark this lead as a final result (Won or Lost). This action cannot be undone.</p>

          {/* WON / LOST selector */}
          <div className="grid grid-cols-2 gap-3">
            {/* WON */}
            <button type="button" onClick={() => setOutcome('WON')}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 py-4 px-3 transition-all ${
                outcome === 'WON' ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-gray-200 text-gray-400 hover:bg-gray-50'
              }`}>
              <WonIcon />
              <span className="text-sm font-bold mt-1">WON</span>
              <span className="text-[11px]">Lead converted successfully</span>
            </button>
            {/* LOST */}
            <button type="button" onClick={() => setOutcome('LOST')}
              className={`flex flex-col items-center gap-1 rounded-xl border-2 py-4 px-3 transition-all ${
                outcome === 'LOST' ? 'border-red-400 bg-red-50 text-red-600' : 'border-gray-200 text-gray-400 hover:bg-gray-50'
              }`}>
              <LostIcon />
              <span className="text-sm font-bold mt-1">LOST</span>
              <span className="text-[11px]">Lead did not convert</span>
            </button>
          </div>

          {/* WON fields */}
          {outcome === 'WON' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold tracking-widest text-gray-500 mb-1.5">PURCHASE REFERENCE TYPE <span className="text-pink-500">*</span></label>
                <input value={invoiceRef} onChange={(e) => setInvoiceRef(e.target.value)} className={INPUT} placeholder="e.g. INV-2026-001" />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest text-gray-500 mb-1.5">PURCHASE DATE <span className="text-pink-500">*</span></label>
                <input type="date" value={billDate} onChange={(e) => setBillDate(e.target.value)} className={INPUT} />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest text-gray-500 mb-1.5">ACTUAL REVENUE <span className="text-pink-500">*</span></label>
                <input type="number" min="0" step="0.01" value={value} onChange={(e) => setValue(e.target.value)} className={INPUT} placeholder="Enter actual revenue amount..." />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest text-gray-500 mb-1.5">DESCRIPTION / REMARKS</label>
                <textarea rows={3} value={billNotes} onChange={(e) => setBillNotes(e.target.value)} className={INPUT} placeholder="Enter description or remarks..." />
              </div>
            </div>
          )}

          {/* LOST fields */}
          {outcome === 'LOST' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold tracking-widest text-gray-500 mb-1.5">REASON FOR LOSS <span className="text-pink-500">*</span></label>
                <textarea rows={3} required value={lossReason} onChange={(e) => setLossReason(e.target.value)} className={INPUT} placeholder="Type the reason why the lead was lost..." />
              </div>
              <div>
                <label className="block text-xs font-bold tracking-widest text-gray-500 mb-1.5">REMARKS</label>
                <textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} className={INPUT} placeholder="Enter remarks..." />
              </div>
            </div>
          )}

          {/* No outcome selected — pending state */}
          {!outcome && (
            <div className="text-center text-xs text-gray-400 py-2">Select Won or Lost above to continue</div>
          )}

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3">
            <button type="submit" disabled={saving || !outcome}
              className={`flex-1 py-3 rounded-full text-white text-sm font-semibold transition-all disabled:opacity-50 ${
                outcome === 'LOST' ? 'bg-red-400 hover:bg-red-500' :
                outcome === 'WON'  ? 'bg-emerald-500 hover:bg-emerald-600' :
                'bg-blue-400'
              }`}>
              {saving ? 'Saving…' : outcome === 'WON' ? 'Confirm Won' : outcome === 'LOST' ? 'Confirm Lost' : 'Confirm Pending'}
            </button>
            <button type="button" onClick={onClose}
              className="px-6 py-3 rounded-full border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">
              Cancel
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
  const [success, setSuccess] = useState(false);

  useEffect(() => { if (open) { setStatusId(lead?.statusId || ''); setError(''); setSuccess(false); } }, [open, lead]);

  const submit = async (e) => {
    e.preventDefault();
    if (!statusId) return setError('Select a status');
    setSaving(true); setError('');
    try {
      await onSave(lead.id, { statusId });
      setSuccess(true);
      setTimeout(() => onClose(), 800);
    }
    catch (err) { setError(err.response?.data?.error || 'Could not update the status'); }
    finally { setSaving(false); }
  };

  return (
    <Shell open={open} title="Lead Status" subtitle={leadName(lead)} onClose={onClose}>
      {success ? (
        <div className="flex flex-col items-center py-6 gap-3">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
            <span className="text-2xl">✓</span>
          </div>
          <p className="text-sm font-semibold text-emerald-700">Status updated!</p>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <select value={statusId} onChange={(e) => setStatusId(e.target.value)} className={INPUT}>
            <option value="">Select status…</option>
            {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="px-6 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold disabled:opacity-60 min-w-[80px]">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      )}
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
