import { useState, useEffect } from 'react';
import { X, UserCheck } from 'lucide-react';

const INPUT = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white';

// Convert a lead to a customer and record the bill (invoice) details
export default function ConvertCustomerModal({ open, lead, onConvert, onClose }) {
  const [form, setForm] = useState({ invoiceRef: '', billDate: '', value: '', billNotes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({ invoiceRef: '', billDate: new Date().toLocaleDateString('en-CA'), value: '', billNotes: '' });
      setError('');
    }
  }, [open]);

  if (!open || !lead) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.value !== '' && !(+form.value > 0)) return setError('Bill amount must be greater than 0');
    if (form.value === '' && form.invoiceRef.trim()) return setError('Enter the bill amount for this bill number');
    setSaving(true);
    try {
      const body = form.value === '' ? {} : { ...form, value: +form.value };
      await onConvert(lead.id, body);
      onClose(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not convert the lead');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose(false)}>
      <div role="dialog" aria-label="Convert to Customer" className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><UserCheck className="w-5 h-5 text-pink-500" /> Convert to Customer</h2>
            <p className="text-xs text-gray-400 mt-0.5">{lead.firstName} {lead.lastName}</p>
          </div>
          <button onClick={() => onClose(false)} aria-label="Close" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="px-6 py-5 space-y-4">
          <p className="text-xs text-gray-500">Add the bill details for this purchase. Leave the amount empty to convert without a bill.</p>
          <label className="block"><span className="block text-xs font-semibold text-gray-500 mb-1.5">Bill / Invoice No.</span>
            <input value={form.invoiceRef} onChange={set('invoiceRef')} className={INPUT} placeholder="e.g. INV-2026-001" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="block text-xs font-semibold text-gray-500 mb-1.5">Bill Date</span>
              <input type="date" value={form.billDate} onChange={set('billDate')} className={INPUT} /></label>
            <label className="block"><span className="block text-xs font-semibold text-gray-500 mb-1.5">Bill Amount (₹)</span>
              <input type="number" min="1" step="0.01" value={form.value} onChange={set('value')} className={INPUT} placeholder="e.g. 25000" /></label>
          </div>
          <label className="block"><span className="block text-xs font-semibold text-gray-500 mb-1.5">Remarks</span>
            <textarea rows={2} value={form.billNotes} onChange={set('billNotes')} className={INPUT} placeholder="Items purchased, notes…" /></label>
          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-end gap-3 pt-1">
            <button type="button" onClick={() => onClose(false)} className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
            <button disabled={saving} className="px-6 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold disabled:opacity-60">
              {saving ? 'Converting…' : 'Convert'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
