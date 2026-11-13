import { useState, useEffect, useCallback } from 'react';
import { Send, Plus, Maximize2, X } from 'lucide-react';
import api from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';

const CHANNELS = [
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'SMS',      label: 'SMS'      },
  { value: 'EMAIL',    label: 'Email'    },
  { value: 'CALL',     label: 'Call'     },
];

const SEGMENTS = ['All Customers', 'VIP', 'Regular', 'Wholesale', 'New Customers', 'Marriage Purchase'];

const STATUS_STYLE = {
  SCHEDULED: 'text-amber-600 bg-amber-50 border-amber-200',
  ACTIVE:    'text-emerald-600 bg-emerald-50 border-emerald-200',
  COMPLETED: 'text-gray-500 bg-gray-100 border-gray-200',
};

function compact(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const pct = (v) => (v === null || v === undefined ? '—' : `${v.toFixed(1)}%`);

export default function CampaignManagerPage() {
  const { user } = useAuth();
  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const [items, setItems]     = useState([]);
  const [total, setTotal]     = useState(0);
  const [stats, setStats]     = useState({ impressions: 0, deliveryRate: null, conversionRate: null });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/campaigns', { params: { limit: 100 } });
      setItems(res.data.data);
      setTotal(res.data.total);
      setStats(res.data.stats);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load campaigns');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const channelLabel = (v) => CHANNELS.find((c) => c.value === v)?.label || v;

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
            <Send className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">Campaign Manager</h1>
              <span className="text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md tracking-wide uppercase">
                Outreach
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Design, execute and track multi-channel customer marketing campaigns</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-1.5 bg-white">
            <div>
              <p className="text-[10px] text-gray-400 leading-none tracking-wide">TOTAL CAMPAIGNS</p>
              <p className="text-lg font-bold text-gray-900 leading-tight text-right font-mono">{total}</p>
            </div>
            <span className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
              <Send className="w-3.5 h-3.5 text-gray-400" />
            </span>
          </div>

          <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400" aria-label="Expand">
            <Maximize2 className="w-4 h-4" />
          </button>

          {canCreate && (
            <button
              onClick={() => setModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> New Campaign
            </button>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}

      {/* Campaign list / empty state */}
      <div className="bg-white border border-gray-200 rounded-2xl">
        {loading && <p className="text-sm text-gray-400 text-center py-20">Loading…</p>}

        {!loading && items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center">
              <Send className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-800 mt-1">No Campaigns Found</p>
            <p className="text-xs text-gray-400">Create targeted customer marketing campaigns</p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <ul className="divide-y divide-gray-100">
            {items.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 px-5 py-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {channelLabel(c.channel)} · {c.targetSegment || 'No segment'}
                    {c.scheduleDate ? ` · ${new Date(c.scheduleDate).toLocaleDateString()}` : ''}
                  </p>
                  {c.description && <p className="text-xs text-gray-500 mt-1 truncate">{c.description}</p>}
                </div>
                <span className={`text-[10px] font-bold rounded-full px-2.5 py-0.5 border shrink-0 ${STATUS_STYLE[c.status]}`}>
                  {c.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Global Impressions" value={compact(stats.impressions)} hint="Total channel reach"      valueClass="text-gray-900 font-mono" />
        <StatCard label="Conversion Rate"    value={pct(stats.conversionRate)}  hint="Converted vs delivered"   valueClass="text-emerald-600" />
        <StatCard label="Delivery Rate"      value={pct(stats.deliveryRate)}    hint="Direct message delivery"  valueClass="text-indigo-600 font-mono" />
      </div>

      <CampaignModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={fetchData} />
    </div>
  );
}

function StatCard({ label, value, hint, valueClass }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-5 py-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${valueClass}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{hint}</p>
    </div>
  );
}

function CampaignModal({ open, onClose, onSaved }) {
  const EMPTY = { name: '', channel: 'WHATSAPP', targetSegment: '', scheduleDate: '', description: '' };
  const [form, setForm]     = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (open) { setForm(EMPTY); setError(''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/campaigns', form);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create campaign');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[94vh] overflow-y-auto">
        <div className="flex items-start justify-between px-8 pt-7 pb-4 bg-gray-50 rounded-t-3xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">New Campaign</h2>
            <p className="text-[11px] font-bold text-pink-500 tracking-widest uppercase mt-1">Design a new marketing engagement</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-gray-500 hover:text-gray-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2 border border-red-200">{error}</div>}

          <Field label="Campaign Name">
            <input value={form.name} onChange={set('name')} required placeholder="e.g. Diwali Special Offers" className={INPUT} />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Channel">
              <select value={form.channel} onChange={set('channel')} className={INPUT}>
                {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Target Segment">
              <select value={form.targetSegment} onChange={set('targetSegment')} className={INPUT}>
                <option value="">Select Segment</option>
                {SEGMENTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          <Field label="Schedule Date">
            <input type="date" value={form.scheduleDate} onChange={set('scheduleDate')} className={INPUT} />
          </Field>

          <Field label="Content Description">
            <textarea value={form.description} onChange={set('description')} rows={4}
              placeholder="Outline the campaign message..." className={`${INPUT} resize-none`} />
          </Field>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-2xl bg-gradient-to-r from-pink-500 to-pink-700 hover:from-pink-600 hover:to-pink-800 text-white text-sm font-bold tracking-[0.25em] uppercase py-4 shadow-lg shadow-pink-200 transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Launch Campaign'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-gray-500 tracking-widest uppercase mb-2">{label}</label>
      {children}
    </div>
  );
}

const INPUT = 'w-full rounded-2xl border border-gray-100 bg-gray-50 px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white';
