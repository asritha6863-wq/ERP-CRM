import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../../services/api.js';

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
      setForm(initial ? {
        firstName:    initial.firstName    || '',
        lastName:     initial.lastName     || '',
        phone:        initial.phone        || '',
        email:        initial.email        || '',
        companyId:    initial.companyId    || '',
        typeId:       initial.typeId       || '',
        branchId:     initial.branchId     || '',
        assignedToId: initial.assignedToId || '',
        rating:       initial.rating       || '',
      } : EMPTY);
      setError('');
      setPhoneHint('');
    }
  }, [open, initial]);

  useEffect(() => {
    api.get('/masters/companies').then((r) => setCompanies(r.data.data || [])).catch(() => {});
  }, []);

  // Phone duplicate hint
  useEffect(() => {
    const phone = form.phone?.replace(/[\s\-().+]/g, '');
    if (!phone || phone.length < 7 || !form.companyId) { setPhoneHint(''); return; }
    const t = setTimeout(async () => {
      try {
        const r = await api.get('/contacts', { params: { search: phone, companyId: form.companyId, limit: 1 } });
        const existing = r.data.data?.[0];
        if (existing && existing.id !== initial?.id) {
          setPhoneHint(`Contact already exists: ${existing.firstName} ${existing.lastName}`);
        } else { setPhoneHint(''); }
      } catch { setPhoneHint(''); }
    }, 500);
    return () => clearTimeout(t);
  }, [form.phone, form.companyId, initial]);

  if (!open) return null;

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setSaving(true); setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save contact');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            {initial ? 'Edit Contact' : 'New Contact'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 py-5 space-y-4 flex-1">

          {/* First Name + Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" required>
              <input value={form.firstName} onChange={set('firstName')}
                className={INPUT} placeholder="First name" required />
            </Field>
            <Field label="Last Name" required>
              <input value={form.lastName} onChange={set('lastName')}
                className={INPUT} placeholder="Last name" required />
            </Field>
          </div>

          {/* Company */}
          <Field label="Company" required>
            <select value={form.companyId} onChange={set('companyId')} className={INPUT} required>
              <option value="">Select company...</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>

          {/* Phone */}
          <Field label="Phone">
            <input value={form.phone} onChange={set('phone')}
              className={INPUT} placeholder="+91 98765 43210" type="tel" />
            {phoneHint && (
              <p className="text-xs text-amber-600 mt-1">⚠ {phoneHint}</p>
            )}
          </Field>

          {/* Email */}
          <Field label="Email">
            <input type="email" value={form.email} onChange={set('email')}
              className={INPUT} placeholder="email@example.com" />
          </Field>

          {/* Contact Type + Branch */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Contact Type">
              <select value={form.typeId} onChange={set('typeId')} className={INPUT}>
                <option value="">No type</option>
                {(lookups.types || []).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <Field label="Branch">
              <select value={form.branchId} onChange={set('branchId')} className={INPUT}>
                <option value="">No branch</option>
                {(lookups.branches || []).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </Field>
          </div>

          {/* Assigned To + Rating */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Assigned To">
              <select value={form.assignedToId} onChange={set('assignedToId')} className={INPUT}>
                <option value="">Unassigned</option>
                {(lookups.staff || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <Field label="Rating">
              <select value={form.rating} onChange={set('rating')} className={INPUT}>
                <option value="">No rating</option>
                {[1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r} ★</option>)}
              </select>
            </Field>
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </form>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-6 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : initial ? 'Save Changes' : 'Create Contact'}
          </button>
        </div>
      </div>
    </div>
  );
}

const INPUT = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-colors';

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
