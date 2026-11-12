import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import api    from '../../services/api.js';

const EMPTY = {
  firstName: '', lastName: '', phone: '', email: '',
  companyId: '', typeId: '', branchId: '', assignedToId: '', rating: '',
};

export default function ContactFormModal({ open, onClose, initial, onSave, lookups }) {
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [companies, setCompanies] = useState([]);
  const [phoneHint, setPhoneHint] = useState('');

  useEffect(() => {
    if (open) {
      setForm(initial
        ? {
            firstName:    initial.firstName    || '',
            lastName:     initial.lastName     || '',
            phone:        initial.phone        || '',
            email:        initial.email        || '',
            companyId:    initial.companyId    || '',
            typeId:       initial.typeId       || '',
            branchId:     initial.branchId     || '',
            assignedToId: initial.assignedToId || '',
            rating:       initial.rating       || '',
          }
        : EMPTY
      );
      setError('');
      setPhoneHint('');
    }
  }, [open, initial]);

  useEffect(() => {
    api.get('/masters/companies').then((r) => setCompanies(r.data.data || [])).catch(() => {});
  }, []);

  // Phone lookup hint
  useEffect(() => {
    const phone = form.phone?.replace(/[\s\-().+]/g, '');
    if (!phone || phone.length < 7 || !form.companyId) { setPhoneHint(''); return; }
    const t = setTimeout(async () => {
      try {
        const r = await api.get('/contacts', { params: { search: phone, companyId: form.companyId, limit: 1 } });
        const existing = r.data.data?.[0];
        if (existing && existing.id !== initial?.id) {
          setPhoneHint(`Contact already exists: ${existing.firstName} ${existing.lastName}`);
        } else {
          setPhoneHint('');
        }
      } catch { setPhoneHint(''); }
    }, 500);
    return () => clearTimeout(t);
  }, [form.phone, form.companyId, initial]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save contact');
    } finally { setSaving(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{initial ? 'Edit Contact' : 'New Contact'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" required>
              <input value={form.firstName} onChange={(e) => set('firstName', e.target.value)}
                className={INPUT} required placeholder="First name" />
            </Field>
            <Field label="Last Name" required>
              <input value={form.lastName} onChange={(e) => set('lastName', e.target.value)}
                className={INPUT} required placeholder="Last name" />
            </Field>
          </div>

          <Field label="Company" required>
            <select value={form.companyId} onChange={(e) => set('companyId', e.target.value)} className={INPUT} required>
              <option value="">Select company…</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>

          <Field label="Phone">
            <input value={form.phone} onChange={(e) => set('phone', e.target.value)}
              className={INPUT} placeholder="+91 98765 43210" />
            {phoneHint && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                ⚠ {phoneHint}
              </p>
            )}
          </Field>

          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)}
              className={INPUT} placeholder="email@example.com" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact Type">
              <select value={form.typeId} onChange={(e) => set('typeId', e.target.value)} className={INPUT}>
                <option value="">No type</option>
                {(lookups.types || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Branch">
              <select value={form.branchId} onChange={(e) => set('branchId', e.target.value)} className={INPUT}>
                <option value="">No branch</option>
                {lookups.branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Assigned To">
              <select value={form.assignedToId} onChange={(e) => set('assignedToId', e.target.value)} className={INPUT}>
                <option value="">Unassigned</option>
                {lookups.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Rating">
              <select value={form.rating} onChange={(e) => set('rating', e.target.value)} className={INPUT}>
                <option value="">No rating</option>
                {[1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r} ★</option>)}
              </select>
            </Field>
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
        </form>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
          <Button loading={saving} onClick={handleSubmit}>
            {initial ? 'Save Changes' : 'Create Contact'}
          </Button>
        </div>
      </div>
    </div>
  );
}

const INPUT = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
