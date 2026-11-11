import { useState, useEffect } from 'react';
import ModalForm from '../../components/ui/ModalForm.jsx';
import Button    from '../../components/ui/Button.jsx';

export default function LeadFormModal({ open, onClose, initial, onSave, lookups }) {
  const empty = { firstName: '', lastName: '', phone: '', email: '', sourceId: '', statusId: '', branchId: '', assignedToId: '', tagNames: [], sentiment: 'NEUTRAL' };
  const [form, setForm]     = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (open) {
      if (initial) {
        setForm({
          firstName:   initial.firstName || '',
          lastName:    initial.lastName  || '',
          phone:       initial.phone     || '',
          email:       initial.email     || '',
          sourceId:    initial.sourceId  || '',
          statusId:    initial.statusId  || '',
          branchId:    initial.branchId  || '',
          assignedToId: initial.assignedToId || '',
          tagNames:    initial.tags?.map((t) => t.name) || [],
          sentiment:   initial.sentiment || 'NEUTRAL',
        });
      } else {
        setForm(empty);
      }
      setError(''); setTagInput('');
    }
  }, [open, initial]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const addTag = (e) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const name = tagInput.trim();
      if (!form.tagNames.includes(name)) setForm((f) => ({ ...f, tagNames: [...f.tagNames, name] }));
      setTagInput('');
    }
  };

  const removeTag = (t) => setForm((f) => ({ ...f, tagNames: f.tagNames.filter((n) => n !== t) }));

  const handleSave = async () => {
    setError(''); setSaving(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  const { sources, statuses, branches, staff } = lookups;

  return (
    <ModalForm open={open} onClose={onClose} title={initial ? 'Edit Lead' : 'New Lead'} size="lg"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={saving} onClick={handleSave}>{initial ? 'Save changes' : 'Create Lead'}</Button></>}
    >
      {error && <div className="mb-4 bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}
      <div className="grid grid-cols-2 gap-4">
        <Field label="First Name *"><input value={form.firstName} onChange={set('firstName')} className={INPUT} placeholder="First name" /></Field>
        <Field label="Last Name *"><input value={form.lastName}  onChange={set('lastName')}  className={INPUT} placeholder="Last name" /></Field>
        <Field label="Phone"><input value={form.phone} onChange={set('phone')} className={INPUT} placeholder="+91 98765 43210" /></Field>
        <Field label="Email"><input type="email" value={form.email} onChange={set('email')} className={INPUT} placeholder="email@example.com" /></Field>
        <Field label="Lead Source">
          <Select value={form.sourceId} onChange={set('sourceId')} options={sources} placeholder="Select source" />
        </Field>
        <Field label="Lead Status">
          <Select value={form.statusId} onChange={set('statusId')} options={statuses} placeholder="Select status" />
        </Field>
        <Field label="Branch">
          <Select value={form.branchId} onChange={set('branchId')} options={branches} placeholder="Select branch" />
        </Field>
        <Field label="Assigned To">
          <Select value={form.assignedToId} onChange={set('assignedToId')} options={staff} placeholder="Select staff" />
        </Field>
        <Field label="Sentiment">
          <select value={form.sentiment} onChange={set('sentiment')} className={INPUT}>
            <option value="POSITIVE">Positive</option>
            <option value="NEUTRAL">Neutral</option>
            <option value="NEGATIVE">Negative</option>
          </select>
        </Field>
        <Field label="Tags">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={addTag}
            className={INPUT}
            placeholder="Type tag and press Enter"
          />
          {form.tagNames.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {form.tagNames.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 text-xs rounded-full px-2 py-0.5">
                  {t}
                  <button type="button" onClick={() => removeTag(t)} className="hover:text-red-500">×</button>
                </span>
              ))}
            </div>
          )}
        </Field>
      </div>
    </ModalForm>
  );
}

function Field({ label, children }) {
  return <div><label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>{children}</div>;
}

function Select({ value, onChange, options, placeholder }) {
  return (
    <select value={value} onChange={onChange} className={INPUT}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  );
}

const INPUT = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
