import { useState, useEffect } from 'react';
import ModalForm from '../../components/ui/ModalForm.jsx';
import Button    from '../../components/ui/Button.jsx';
import api       from '../../services/api.js';

export default function DealModal({ open, onClose, initial, currentStageId, onSave, lookups }) {
  const empty = { leadId: '', stageId: currentStageId || '', value: '', expectedCloseDate: '', ownerId: '' };
  const [form, setForm]     = useState(empty);
  const [leads, setLeads]   = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (open) {
      setForm(initial
        ? { leadId: initial.leadId || '', stageId: initial.stageId || '', value: initial.value ?? '', expectedCloseDate: initial.expectedCloseDate?.split('T')[0] || '', ownerId: initial.ownerId || '' }
        : { ...empty, stageId: currentStageId || '' }
      );
      setError('');
    }
  }, [open, initial, currentStageId]);

  useEffect(() => {
    if (open) {
      api.get('/leads', { params: { limit: 200 } })
        .then((r) => setLeads(r.data.data || []))
        .catch(() => {});
    }
  }, [open]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const INPUT = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  const handleSave = async () => {
    setError(''); setSaving(true);
    try { await onSave(form); onClose(); }
    catch (err) { setError(err.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  return (
    <ModalForm open={open} onClose={onClose} title={initial ? 'Edit Deal' : 'New Deal'} size="md"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} onClick={handleSave}>{initial ? 'Save changes' : 'Create Deal'}</Button></>}
    >
      {error && <div className="mb-4 bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Lead / Customer *</label>
          <select value={form.leadId} onChange={set('leadId')} className={INPUT}>
            <option value="">Select lead…</option>
            {leads.map((l) => <option key={l.id} value={l.id}>{l.firstName} {l.lastName} {l.phone ? `(${l.phone})` : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Stage *</label>
          <select value={form.stageId} onChange={set('stageId')} className={INPUT}>
            <option value="">Select stage…</option>
            {lookups.stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Deal Value (₹)</label>
          <input type="number" min={0} value={form.value} onChange={set('value')} className={INPUT} placeholder="0" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Expected Close Date</label>
          <input type="date" value={form.expectedCloseDate} onChange={set('expectedCloseDate')} className={INPUT} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
          <select value={form.ownerId} onChange={set('ownerId')} className={INPUT}>
            <option value="">— Assign to me —</option>
            {lookups.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      </div>
    </ModalForm>
  );
}
