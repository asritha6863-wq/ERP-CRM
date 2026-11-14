import { useState, useEffect, useCallback } from 'react';
import { CircleDot, Plus, Maximize2, ArrowRight, Filter, X, Users, CheckCircle2, Clock, XCircle, Star } from 'lucide-react';
import api from '../../services/api.js';
import useLookups from '../../hooks/useLookups.js';

const TEMPLATES = [
  { id: 'vip',       tag: 'HIGH VALUE',   title: 'VIP / High-Value Customers',           desc: 'Customers with total purchases exceeding ₹1,00,000 or classified as VIP tier.',     criteria: { minLifetimeValue: 100000, customerType: 'VIP',  matchAll: false } },
  { id: 'loyal',     tag: 'LOYALTY',      title: 'Frequent Buyers',                       desc: 'Loyal jewellery patrons who have completed 3 or more separate purchase visits.',     criteria: { minPurchaseVisits: 3 } },
  { id: 'new',       tag: 'ACQUISITION',  title: 'New Customers',                         desc: 'Recently registered patrons who joined the jewellery store in the last 30 days.',    criteria: { maxRecencyDays: 30 } },
  { id: 'dormant',   tag: 'DORMANT',      title: 'Inactive Customers',                    desc: 'Dormant patrons with no purchases in the last 180 days requiring re-engagement.',   criteria: { minInactiveDays: 180 } },
  { id: 'followup',  tag: 'FOLLOW-UP',    title: 'Customers Due for Follow-Up',           desc: 'Store visitors or leads who inquired about jewellery but have not purchased yet.',  criteria: { minInactiveDays: 30 } },
  { id: 'bridal',    tag: 'OCCASION',     title: 'Marriage Purchase Customers',           desc: 'Bridal and groom shoppers planning upcoming weddings or anniversaries.',             criteria: { isBridal: 'yes' } },
  { id: 'exchange',  tag: 'EXCHANGE',     title: 'Old Gold Exchange Customers',           desc: 'Customers with recorded old gold valuation, purchase, or exchange transactions.',   criteria: {} },
  { id: 'balance',   tag: 'CREDIT LEDGER',title: 'Customers with Outstanding Balances',  desc: 'Customers with active credit purchases and unpaid balances on completed invoices.',  criteria: {} },
  { id: 'active',    tag: 'ACTIVE',       title: 'Customers with Recent Purchases',       desc: 'Active jewellery buyers who purchased items within the last 30 days.',              criteria: { maxRecencyDays: 30 } },
];

const TAG_COLOR = {
  'HIGH VALUE':    'text-indigo-600 bg-indigo-50 border-indigo-200',
  'LOYALTY':       'text-purple-600 bg-purple-50 border-purple-200',
  'ACQUISITION':   'text-blue-600 bg-blue-50 border-blue-200',
  'DORMANT':       'text-gray-500 bg-gray-100 border-gray-200',
  'FOLLOW-UP':     'text-orange-600 bg-orange-50 border-orange-200',
  'OCCASION':      'text-pink-600 bg-pink-50 border-pink-200',
  'EXCHANGE':      'text-teal-600 bg-teal-50 border-teal-200',
  'CREDIT LEDGER': 'text-red-600 bg-red-50 border-red-200',
  'ACTIVE':        'text-emerald-700 bg-emerald-50 border-emerald-200',
};

const I = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white';
const L = 'block text-xs font-medium text-gray-600 mb-1.5';

export default function CustomerSegmentationPage() {
  const { lookups } = useLookups();
  const [stats,     setStats]     = useState(null);
  const [segments,  setSegments]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [preload,   setPreload]   = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [s, seg] = await Promise.all([
        api.get('/segments/stats'),
        api.get('/segments'),
      ]);
      setStats(s.data);
      setSegments(Array.isArray(seg.data) ? seg.data : []);
    } catch (e) {
      console.error(e);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const useTemplate = (t) => { setPreload(t); setModalOpen(true); };
  const deleteSegment = async (id) => { if (!confirm('Delete this segment?')) return; try { await api.delete(`/segments/${id}`); fetchAll(); } catch {} };

  const st = stats;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
            <CircleDot className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">Customer Segmentation</h1>
              <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md tracking-wide uppercase">Cohorts &amp; RFM</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Behavioral customer cohorts, purchase analysis, campaign targets &amp; jewellery preferences</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 rounded-lg border border-gray-200 text-gray-400"><Maximize2 className="w-4 h-4" /></button>
          <button onClick={() => { setPreload(null); setModalOpen(true); }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium">
            <Plus className="w-4 h-4" /> New Segment
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <StatCard label="TOTAL CUSTOMERS"    value={st?.total          ?? 0} icon={Users}        iconClass="text-blue-500" />
        <StatCard label="TOTAL SEGMENTS"     value={st?.totalSegments  ?? 0} icon={CircleDot}    iconClass="text-indigo-500" />
        <StatCard label="ASSIGNED PATRONS"   value={st?.assignedPatrons ?? 0} icon={CheckCircle2} iconClass="text-emerald-500" />
        <StatCard label="UNASSIGNED"         value={st?.unassigned     ?? 0} icon={Clock}        iconClass="text-amber-500" valueClass="text-amber-600" />
        <StatCard label="HIGH-VALUE VIPS"    value={st?.highValueVips  ?? 0} icon={Star}         iconClass="text-purple-500" valueClass="text-purple-600" />
        <StatCard label="INACTIVE (180D+)"   value={st?.inactive       ?? 0} icon={XCircle}      iconClass="text-red-500" valueClass="text-red-600" />
      </div>

      {/* Recommended Starter Cohorts */}
      <section className="bg-white border border-gray-200 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> RECOMMENDED STARTER COHORTS
          </h2>
          <span className="text-xs text-gray-400">Click any card to pre-fill &amp; evaluate criteria</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
          {TEMPLATES.map((t) => (
            <div key={t.id} className="border border-gray-200 rounded-xl p-3 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all group cursor-pointer" onClick={() => useTemplate(t)}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[9px] font-bold tracking-widest rounded-full px-2 py-0.5 border ${TAG_COLOR[t.tag] || 'text-gray-500 bg-gray-100 border-gray-200'}`}>{t.tag}</span>
                <ArrowRight className="w-3.5 h-3.5 text-gray-300 group-hover:text-indigo-500 transition-colors" />
              </div>
              <p className="text-xs font-bold text-gray-900 leading-snug">{t.title}</p>
              <p className="text-[11px] text-gray-500 mt-1 leading-relaxed line-clamp-2">{t.desc}</p>
              <button className="mt-2 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800">Use Template →</button>
            </div>
          ))}
        </div>
      </section>

      {/* Saved segments */}
      {segments.length > 0 && (
        <section className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Your Saved Segments ({segments.length})</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {segments.map((seg) => (
              <div key={seg.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{seg.name}</p>
                  {seg.description && <p className="text-xs text-gray-400 truncate mt-0.5">{seg.description}</p>}
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-sm font-mono font-semibold text-indigo-600">{(seg.memberCount || 0).toLocaleString('en-IN')} patrons</span>
                  <span className="text-[11px] text-gray-400">{new Date(seg.createdAt).toLocaleDateString('en-GB')}</span>
                  <button onClick={() => deleteSegment(seg.id)} className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {modalOpen && (
        <SegmentModal preload={preload} lookups={lookups} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); fetchAll(); }} />
      )}
    </div>
  );
}

function SegmentModal({ preload, lookups, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '', description: '', branchId: '', matchAll: true,
    criteria: { minLifetimeValue: '', minPurchaseVisits: '', customerType: 'any', minInactiveDays: '', maxRecencyDays: '', isBridal: 'any', category: 'any' },
    ...(preload ? { name: preload.title, criteria: { ...preload.criteria, minLifetimeValue: '', minPurchaseVisits: '', customerType: 'any', minInactiveDays: '', maxRecencyDays: '', isBridal: 'any', category: 'any', ...preload.criteria } } : {}),
  });
  const [estimate, setEstimate] = useState(null);
  const [estimating, setEstimating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Live estimate
  useEffect(() => {
    setEstimating(true); setEstimate(null);
    const t = setTimeout(() => {
      api.post('/segments/evaluate', { criteria: form.criteria, branchId: form.branchId || null })
        .then((r) => setEstimate(r.data?.count ?? 0))
        .catch(() => setEstimate(null))
        .finally(() => setEstimating(false));
    }, 600);
    return () => clearTimeout(t);
  }, [form.criteria, form.branchId]);

  const setC = (k) => (e) => setForm((f) => ({ ...f, criteria: { ...f.criteria, [k]: e.target.value } }));
  const set  = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await api.post('/segments', form);
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not save segment');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[94vh] overflow-y-auto">
        <div className="px-6 pt-5 pb-3 border-b border-gray-100 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Define New Customer Segment</h2>
            <p className="text-xs text-gray-400 mt-0.5">Configure behavioral rules and criteria to group customer profiles</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"><X className="w-4 h-4" /></button>
        </div>

        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={L}>Segment Name *</label>
              <input value={form.name} onChange={set('name')} required placeholder="e.g. VIP Bridal Shoppers" className={I} />
            </div>
            <div>
              <label className={L}>Target Branch *</label>
              <select value={form.branchId} onChange={set('branchId')} className={I}>
                <option value="">All Branches</option>
                {(lookups.branches || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={L}>Description</label>
            <textarea rows={2} value={form.description} onChange={set('description')} placeholder="Describe what customer behavior this cohort tracks..." className={`${I} resize-none`} />
          </div>

          {/* Conditions */}
          <div className="border border-gray-200 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-xs font-bold text-gray-700 tracking-widest uppercase">
                <Filter className="w-4 h-4 text-pink-500" /> Segment Conditions &amp; Criteria
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">MATCH:</span>
                <select value={form.matchAll ? 'and' : 'or'} onChange={(e) => setForm((f) => ({ ...f, matchAll: e.target.value === 'and' }))}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs focus:outline-none">
                  <option value="and">All Rules (AND)</option>
                  <option value="or">Any Rule (OR)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Min Lifetime Purchases (₹)</label>
                <input type="number" min="0" value={form.criteria.minLifetimeValue} onChange={setC('minLifetimeValue')} placeholder="e.g. 100000" className={I} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Min Purchase Visits</label>
                <input type="number" min="0" value={form.criteria.minPurchaseVisits} onChange={setC('minPurchaseVisits')} placeholder="e.g. 3" className={I} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Customer Tier / Type</label>
                <select value={form.criteria.customerType} onChange={setC('customerType')} className={I}>
                  <option value="any">Any Type</option>
                  <option value="VIP">VIP</option>
                  <option value="Regular">Regular</option>
                  <option value="Wholesale">Wholesale</option>
                  <option value="New Customer">New Customer</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Min Inactive Days (Dormancy)</label>
                <input type="number" min="0" value={form.criteria.minInactiveDays} onChange={setC('minInactiveDays')} placeholder="e.g. 180" className={I} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Max Recency Days (Active)</label>
                <input type="number" min="0" value={form.criteria.maxRecencyDays} onChange={setC('maxRecencyDays')} placeholder="e.g. 30" className={I} />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Old Gold Exchange</label>
                <select value={form.criteria.oldGold || 'any'} onChange={setC('oldGold')} className={I}>
                  <option value="any">Doesn't Matter</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Marriage / Bridal Customer</label>
                <select value={form.criteria.isBridal} onChange={setC('isBridal')} className={I}>
                  <option value="any">Doesn't Matter</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Outstanding Balance Due</label>
                <select value={form.criteria.outstanding || 'any'} onChange={setC('outstanding')} className={I}>
                  <option value="any">Doesn't Matter</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-500 mb-1">Category Wise</label>
                <select value={form.criteria.category} onChange={setC('category')} className={I}>
                  <option value="any">Any Category</option>
                  <option value="Gold">Gold</option>
                  <option value="Diamond">Diamond</option>
                  <option value="Silver">Silver</option>
                  <option value="Platinum">Platinum</option>
                </select>
              </div>
            </div>
          </div>

          {/* Estimate */}
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
            <span className="flex items-center gap-2 text-sm text-gray-600">
              <CircleDot className="w-4 h-4 text-indigo-500" /> Estimated Matching Patrons:
            </span>
            <span className="text-lg font-bold font-mono text-indigo-600">
              {estimating ? 'Calculating…' : estimate !== null ? estimate.toLocaleString('en-IN') : '—'}
            </span>
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button type="button" onClick={onClose} className="py-3 rounded-xl border-2 border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="py-3 rounded-xl bg-pink-500 hover:bg-pink-600 text-white text-sm font-bold disabled:opacity-60">
              {saving ? 'Saving…' : 'Create Segment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, iconClass, valueClass = 'text-gray-900' }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-4">
      <div className="flex items-start justify-between">
        <p className="text-[9px] font-semibold text-gray-500 tracking-widest">{label}</p>
        <Icon className={`w-4 h-4 ${iconClass}`} />
      </div>
      <p className={`text-3xl font-bold mt-2 font-mono ${valueClass}`}>{Number(value).toLocaleString('en-IN')}</p>
    </div>
  );
}
