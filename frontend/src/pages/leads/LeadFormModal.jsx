import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import api from '../../services/api.js';

const EMPTY = {
  // Step 1 — Basic Info
  salutation:   'Mr',
  fullName:     '',
  phone:        '',
  altPhone:     '',
  brideGroom:   '',
  customerType: '',
  gender:       '',
  religion:     '',
  visitedDate:  new Date().toISOString().slice(0, 10),
  marriageDate: '',
  dnf:          false,

  // Step 2 — Location & Source
  branchId:     '',
  sourceId:     '',
  area:         '',
  email:        '',

  // Step 3 — Assignment
  assignedToId: '',
  referredBy:   '',
  priority:     'MEDIUM',
  statusId:     '',
  wonLossStatus: 'PENDING',
  followUpDate: '',
  dueDate:      new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
  expectedWeight: '',
  expectedAmount: '',
  response:     '',
  notes:        '',
  sentiment:    'NEUTRAL',
  tagNames:     [],
};

const STEPS = [
  { number: 1, label: 'Basic Info' },
  { number: 2, label: 'Location & Source' },
  { number: 3, label: 'Assignment' },
];

export default function LeadFormModal({ open, onClose, initial, onSave, lookups }) {
  const [step, setStep]     = useState(1);
  const [form, setForm]     = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    if (open) {
      setStep(1);
      setError('');
      if (initial) {
        setForm({
          ...EMPTY,
          salutation:    initial.salutation    || 'Mr',
          fullName:      [initial.firstName, initial.lastName].filter(Boolean).join(' '),
          phone:         initial.phone         || '',
          altPhone:      initial.altPhone      || '',
          brideGroom:    initial.brideGroom    || '',
          customerType:  initial.customerType  || '',
          gender:        initial.gender        || '',
          religion:      initial.religion      || '',
          visitedDate:   initial.visitedDate   || EMPTY.visitedDate,
          marriageDate:  initial.marriageDate ? String(initial.marriageDate).slice(0, 10) : '',
          dnf:           initial.dnf           || false,
          branchId:      initial.branchId      || '',
          sourceId:      initial.sourceId      || '',
          area:          initial.area          || '',
          email:         initial.email         || '',
          assignedToId:  initial.assignedToId  || '',
          referredBy:    initial.referredBy    || '',
          priority:      initial.priority      || 'MEDIUM',
          statusId:      initial.statusId      || '',
          wonLossStatus: initial.wonLossStatus || 'PENDING',
          followUpDate:  initial.followUpDate  || '',
          dueDate:       initial.dueDate ? String(initial.dueDate).slice(0, 10) : EMPTY.dueDate,
          expectedWeight: initial.expectedWeight ?? '',
          expectedAmount: initial.expectedAmount ?? '',
          response:      initial.response      || '',
          notes:         initial.notes         || '',
          sentiment:     initial.sentiment     || 'NEUTRAL',
          tagNames:      initial.tags?.map((t) => t.name) || [],
        });
      } else {
        setForm(EMPTY);
      }
    }
  }, [open, initial]);

  // Load existing customers the first time "Select Existing Customer" is switched on
  useEffect(() => {
    if (open && form.selectExisting && contacts.length === 0) {
      api.get('/contacts', { params: { limit: 100 } })
        .then((r) => setContacts(r.data.data || []))
        .catch(() => setError('Could not load existing customers'));
    }
  }, [open, form.selectExisting, contacts.length]);

  if (!open) return null;

  const pickContact = (id) => {
    const c = contacts.find((x) => x.id === id);
    if (!c) return;
    setForm((f) => ({
      ...f,
      contactId: id,
      fullName:  `${c.firstName} ${c.lastName}`.trim(),
      phone:     c.phone || '',
      email:     c.email || '',
    }));
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setE = (k) => (e) => set(k, e.target.value);

  // Step validation
  const canNext = () => {
    if (step === 1) return form.fullName.trim() && form.phone.trim();
    if (step === 2) return true;
    return true;
  };

  const handleNext = () => {
    if (!canNext()) { setError(step === 1 ? 'Customer name and mobile number are required.' : ''); return; }
    setError('');
    setStep((s) => s + 1);
  };

  const handleBack = () => { setError(''); setStep((s) => s - 1); };

  const handleCreate = async () => {
    setError(''); setSaving(true);
    try {
      // The form has one "Full Name" box: first word → first name, the rest → last name
      const [firstName, ...rest] = form.fullName.trim().split(/\s+/);
      await onSave({
        firstName,
        lastName:     rest.join(' '),
        phone:        form.phone.trim() || null,
        altPhone:     form.altPhone.trim() || null,
        area:         form.area.trim() || null,
        email:        form.email.trim() || null,
        sourceId:     form.sourceId   || null,
        statusId:     form.statusId   || null,
        branchId:     form.branchId   || null,
        assignedToId: form.assignedToId || null,
        sentiment:    form.sentiment,
        dueDate:      form.dueDate    || null,
        priority:     form.priority,
        dnf:          form.dnf,
        marriageDate: form.dnf ? null : (form.marriageDate || null),
        expectedWeight: form.expectedWeight === '' ? null : form.expectedWeight,
        expectedAmount: form.expectedAmount === '' ? null : form.expectedAmount,
        rating:       null,
        tagNames:     form.tagNames,
        // Extra details are packed into notes on create; on edit the notes stay exactly as typed
        notes: initial ? (form.notes.trim() || null) : [
          form.gender        && `Gender: ${form.gender}`,
          form.religion      && `Religion: ${form.religion}`,
          form.brideGroom    && `Bride/Groom: ${form.brideGroom}`,
          form.customerType  && `Customer Type: ${form.customerType}`,
          form.response      && `Response: ${form.response}`,
          form.notes         && `Notes: ${form.notes}`,
        ].filter(Boolean).join(' | ') || undefined,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save lead');
    } finally { setSaving(false); }
  };

  const { sources = [], statuses = [], branches = [], staff = [] } = lookups;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <h2 className="text-xl font-bold text-gray-900">{initial ? 'Edit Lead' : 'New Lead'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="px-6 pb-4">
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => {
              const done    = step > s.number;
              const active  = step === s.number;
              return (
                <div key={s.number} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      done   ? 'bg-pink-500 text-white' :
                      active ? 'border-2 border-pink-500 text-pink-500' :
                               'border-2 border-gray-300 text-gray-400'
                    }`}>
                      {done ? <Check className="w-4 h-4" /> : s.number}
                    </div>
                    <span className={`text-xs font-medium ${active ? 'text-pink-500' : done ? 'text-gray-600' : 'text-gray-400'}`}>
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mb-5 mx-2 ${done ? 'bg-pink-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {error && <div className="mb-4 bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}

          {/* ── Step 1: Basic Info ───────────────────── */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Select Existing Customer toggle */}
              <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-800">Select Existing Customer</p>
                  <p className="text-xs text-gray-500">Toggle ON to select an existing customer and create a lead</p>
                </div>
                <button
                  type="button"
                  onClick={() => set('selectExisting', !form.selectExisting)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.selectExisting ? 'bg-pink-500' : 'bg-gray-300'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.selectExisting ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
              </div>

              {form.selectExisting && (
                <Field label="EXISTING CUSTOMER">
                  <select value={form.contactId || ''} onChange={(e) => pickContact(e.target.value)} className={INPUT}>
                    <option value="">Select a customer…</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.firstName} {c.lastName}{c.phone ? ` (${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field label="CUSTOMER NAME *">
                  <div className="flex gap-2">
                    <select value={form.salutation} onChange={setE('salutation')} className={`${INPUT_BASE} w-24 shrink-0`}>
                      <option>Mr</option><option>Mrs</option><option>Ms</option><option>Dr</option>
                    </select>
                    <input value={form.fullName} onChange={setE('fullName')}
                      className={`${INPUT_BASE} flex-1 min-w-0`} placeholder="Full Name" required />
                  </div>
                </Field>

                <Field label="MOBILE NUMBER *">
                  <div className="flex gap-1">
                    <span className="flex items-center px-3 bg-gray-100 border border-gray-300 rounded-l-lg text-sm text-gray-600">+91</span>
                    <input value={form.phone} onChange={setE('phone')}
                      className={`${INPUT_BASE} rounded-l-none flex-1 min-w-0`} placeholder="Mobile number" type="tel" required />
                  </div>
                </Field>

                <Field label="ALTERNATE PHONE">
                  <input value={form.altPhone} onChange={setE('altPhone')} className={INPUT} placeholder="Alternate Phone" type="tel" />
                </Field>

                <Field label="BRIDE / GROOM">
                  <select value={form.brideGroom} onChange={setE('brideGroom')} className={INPUT}>
                    <option value="">Select Option</option>
                    <option>Bride</option><option>Groom</option><option>Both</option><option>Other</option>
                  </select>
                </Field>

                <Field label="CUSTOMER TYPE">
                  <select value={form.customerType} onChange={setE('customerType')} className={INPUT}>
                    <option value="">Select Type</option>
                    <option>New</option><option>Returning</option><option>VIP</option><option>Wholesale</option>
                  </select>
                </Field>

                <Field label="GENDER">
                  <select value={form.gender} onChange={setE('gender')} className={INPUT}>
                    <option value="">Select Gender</option>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </select>
                </Field>

                <Field label="RELIGION">
                  <select value={form.religion} onChange={setE('religion')} className={INPUT}>
                    <option value="">Select Religion</option>
                    <option>Hindu</option><option>Muslim</option><option>Christian</option>
                    <option>Sikh</option><option>Jain</option><option>Other</option>
                  </select>
                </Field>

                <Field label="VISITED DATE">
                  <input type="date" value={form.visitedDate} onChange={setE('visitedDate')} className={INPUT} />
                </Field>

                <Field label="MARRIAGE DATE">
                  <input type="date" value={form.marriageDate} onChange={setE('marriageDate')}
                    className={INPUT} disabled={form.dnf} />
                </Field>

                <Field label=" ">
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => set('dnf', !form.dnf)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.dnf ? 'bg-pink-500' : 'bg-gray-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form.dnf ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Date Not Fixed (DNF)</p>
                      <p className="text-xs text-gray-400">Toggle ON to disable the marriage date field</p>
                    </div>
                  </div>
                </Field>
              </div>
            </div>
          )}

          {/* ── Step 2: Location & Source ────────────── */}
          {step === 2 && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="BRANCH">
                <select value={form.branchId} onChange={setE('branchId')} className={INPUT}>
                  <option value="">Select Branch</option>
                  {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </Field>

              <Field label="LEAD SOURCE">
                <select value={form.sourceId} onChange={setE('sourceId')} className={INPUT}>
                  <option value="">Select Source</option>
                  {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>

              <Field label="AREA / LOCATION">
                <input value={form.area} onChange={setE('area')} className={INPUT} placeholder="e.g. Ambalavayai" />
              </Field>

              <Field label="EMAIL">
                <input type="email" value={form.email} onChange={setE('email')} className={INPUT} placeholder="email@example.com" />
              </Field>
            </div>
          )}

          {/* ── Step 3: Assignment ───────────────────── */}
          {step === 3 && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="OWNER / EMPLOYEE *">
                <select value={form.assignedToId} onChange={setE('assignedToId')} className={INPUT}>
                  <option value="">Select Owner</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>

              <Field label="ASSIGNED EMPLOYEE">
                <select value={form.assignedToId} onChange={setE('assignedToId')} className={INPUT}>
                  <option value="">Select Assigned Employee</option>
                  {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>

              <Field label="REFERRED BY (CONTACT)">
                <input value={form.referredBy} onChange={setE('referredBy')} className={INPUT} placeholder="Select Referrer" />
              </Field>

              <Field label="PRIORITY">
                <select value={form.priority} onChange={setE('priority')} className={INPUT}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </Field>

              <Field label="WON/LOSS STATUS">
                <select value={form.wonLossStatus} onChange={setE('wonLossStatus')} className={INPUT}>
                  <option value="PENDING">Pending</option>
                  <option value="WON">Won</option>
                  <option value="LOST">Lost</option>
                </select>
              </Field>

              <Field label="LEAD STATUS">
                <select value={form.statusId} onChange={setE('statusId')} className={INPUT}>
                  <option value="">Select Lead Status</option>
                  {statuses.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </Field>

              <Field label="FOLLOW UP DATE">
                <input type="date" value={form.followUpDate} onChange={setE('followUpDate')} className={INPUT} />
              </Field>

              <Field label="DUE DATE">
                <input type="date" value={form.dueDate} onChange={setE('dueDate')} className={INPUT} />
              </Field>

              <Field label="EXPECTED WEIGHT (GRAMS)">
                <input type="number" value={form.expectedWeight} onChange={setE('expectedWeight')}
                  className={INPUT} placeholder="e.g. 22.5" step="0.1" min="0" />
              </Field>

              <Field label="EXPECTED AMOUNT">
                <input type="number" value={form.expectedAmount} onChange={setE('expectedAmount')}
                  className={INPUT} placeholder="e.g. 50000" min="0" />
              </Field>

              <Field label="RESPONSE" className="col-span-2">
                <input value={form.response} onChange={setE('response')} className={INPUT} placeholder="Customer response / remarks" />
              </Field>

              <Field label="INTERNAL NOTES" className="col-span-2">
                <textarea value={form.notes} onChange={setE('notes')} rows={3}
                  className={`${INPUT} resize-none`} placeholder="Internal notes..." />
              </Field>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 mt-2">
          <button
            onClick={step === 1 ? onClose : handleBack}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            {step === 1 ? 'Cancel' : 'Back'}
          </button>

          <span className="text-sm text-gray-400">Step {step} of {STEPS.length}</span>

          {step < STEPS.length ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
            >
              Next Step
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={saving}
              className="flex items-center gap-1.5 bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-60"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Saving…' : 'Create Lead'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children, className = '' }) {
  return (
    <div className={className}>
      <label className="block text-xs font-semibold text-gray-500 tracking-wide mb-1.5 uppercase">{label}</label>
      {children}
    </div>
  );
}

// INPUT_BASE has no width so it can be combined with fixed/flex widths; INPUT is full width
const INPUT_BASE = 'rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white';
const INPUT = `w-full ${INPUT_BASE}`;
