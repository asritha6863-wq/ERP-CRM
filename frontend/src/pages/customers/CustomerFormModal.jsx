import { useState, useEffect } from 'react';
import ModalForm from '../../components/ui/ModalForm.jsx';
import Button    from '../../components/ui/Button.jsx';

export default function CustomerFormModal({ open, onClose, initial, onSave, lookups }) {
  const empty = { firstName: '', lastName: '', phone: '', email: '', categoryId: '', branchId: '', assignedToId: '', rating: '' };
  const [form, setForm]     = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    if (open) {
      setForm(initial
        ? { firstName: initial.firstName || '', lastName: initial.lastName || '', phone: initial.phone || '', email: initial.email || '',
            categoryId: initial.categoryId || '', branchId: initial.branchId || '', assignedToId: initial.assignedToId || '', rating: initial.rating ?? '' }
        : empty
      );
      setError('');
    }
  }, [open, initial]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    setError(''); setSaving(true);
    try { await onSave(form); onClose(); }
    catch (err) { setError(err.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const { categories, branches, staff } = lookups;
  const INPUT = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <ModalForm open={open} onClose={onClose} title={initial ? 'Edit Customer' : 'New Customer'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} onClick={handleSave}>{initial ? 'Save changes' : 'Create Customer'}</Button></>}
    >
      {error && <div className="mb-4 bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <div><label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label><input value={form.firstName} onChange={set('firstName')} className={INPUT} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label><input value={form.lastName}  onChange={set('lastName')}  className={INPUT} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input value={form.phone} onChange={set('phone')} className={INPUT} /></div>
        <div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input type="email" value={form.email} onChange={set('email')} className={INPUT} /></div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select value={form.categoryId} onChange={set('categoryId')} className={INPUT}>
            <option value="">— None —</option>
            {categories.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
          <select value={form.branchId} onChange={set('branchId')} className={INPUT}>
            <option value="">— None —</option>
            {branches.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
          <select value={form.assignedToId} onChange={set('assignedToId')} className={INPUT}>
            <option value="">— None —</option>
            {staff.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rating (1–5)</label>
          <input type="number" min={1} max={5} value={form.rating} onChange={set('rating')} className={INPUT} placeholder="1–5" />
        </div>
      </div>
    </ModalForm>
  );
}
