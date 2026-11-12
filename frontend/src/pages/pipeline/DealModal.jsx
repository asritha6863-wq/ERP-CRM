import { useState, useEffect } from 'react';
import { X, IndianRupee } from 'lucide-react';
import api from '../../services/api.js';

const EMPTY = {
  title:             '',
  value:             '',
  stageId:           '',
  leadId:            '',
  ownerId:           '',
  expectedCloseDate: '',
  winProbability:    50,
};

export default function DealModal({ open, onClose, initial, currentStageId, onSave, lookups }) {
  const [form, setForm]     = useState(EMPTY);
  const [leads, setLeads]   = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (open) {
      setError('');
      setForm(initial ? {
        title:             initial.title             || '',
        value:             initial.value             ?? '',
        stageId:           initial.stageId           || currentStageId || '',
        leadId:            initial.leadId            || '',
        ownerId:           initial.ownerId           || '',
        expectedCloseDate: initial.expectedCloseDate?.split('T')[0] || '',
        winProbability:    initial.winProbability    ?? 50,
      } : {
        ...EMPTY,
        stageId: currentStageId || '',
      });
    }
  }, [open, initial, currentStageId]);

  useEffect(() => {
    if (open) {
      api.get('/leads', { params: { limit: 200 } })
        .then((r) => setLeads(r.data.data || []))
        .catch(() => {});
    }
  }, [open]);

  if (!open) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setE = (k) => (e) => set(k, e.target.value);

  const handleSave = async () => {
    setError(''); setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save deal');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-3">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{initial ? 'Edit Deal' : 'Create New Deal'}</h2>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mt-0.5">Opportunity Management</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 mt-0.5">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pb-5 space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2 border border-red-200">{error}</div>}

          {/* Deal Title */}
          <div>
            <label className={LABEL}>Deal Title</label>
            <input
              value={form.title}
              onChange={setE('title')}
              className={INPUT}
              placeholder="e.g. Website Redesign"
            />
          </div>

          {/* Deal Value + Pipeline Stage */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Deal Value (₹)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <IndianRupee className="w-3.5 h-3.5" />
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.value}
                  onChange={setE('value')}
                  className={`${INPUT} pl-8`}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div>
              <label className={LABEL}>Pipeline Stage</label>
              <select value={form.stageId} onChange={setE('stageId')} className={INPUT}>
                <option value="">Select stage…</option>
                {lookups.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Related Lead + Assign To */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Related Lead</label>
              <select value={form.leadId} onChange={setE('leadId')} className={INPUT}>
                <option value="">Select a lead...</option>
                {leads.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.firstName} {l.lastName}{l.phone ? ` (${l.phone})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={LABEL}>Assign To</label>
              <select value={form.ownerId} onChange={setE('ownerId')} className={INPUT}>
                <option value="">Choose team member...</option>
                {lookups.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Expected Closure Date + Win Probability */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={LABEL}>Expected Closure Date</label>
              <input
                type="date"
                value={form.expectedCloseDate}
                onChange={setE('expectedCloseDate')}
                className={INPUT}
              />
            </div>
            <div>
              <label className={LABEL}>
                Win Probability
                <span className="ml-2 text-xs font-semibold text-pink-500 border border-pink-300 rounded-full px-2 py-0.5">
                  {form.winProbability}%
                </span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={form.winProbability}
                onChange={(e) => set('winProbability', +e.target.value)}
                className="w-full h-2 rounded-full appearance-none cursor-pointer mt-2"
                style={{
                  background: `linear-gradient(to right, #ec4899 0%, #ec4899 ${form.winProbability}%, #e5e7eb ${form.winProbability}%, #e5e7eb 100%)`,
                }}
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {saving ? 'Saving…' : initial ? 'Save Changes' : 'Create Deal'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

const LABEL = 'block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5';
const INPUT  = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white transition-colors';
