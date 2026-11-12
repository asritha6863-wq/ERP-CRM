import { useState, useEffect } from 'react';
import { X, Trophy } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';

export default function WinLeadModal({ open, lead, onConfirm, onClose }) {
  const [value,      setValue]      = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState('');

  useEffect(() => {
    if (open) { setValue(''); setInvoiceRef(''); setError(''); }
  }, [open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!value || +value <= 0) { setError('Please enter a sale value greater than 0'); return; }
    setSaving(true); setError('');
    try {
      await onConfirm({ value: +value, invoiceRef: invoiceRef || undefined });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to mark lead as Won');
    } finally { setSaving(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 p-1.5 rounded-lg">
              <Trophy className="w-4 h-4 text-emerald-600" />
            </div>
            <h2 className="font-semibold text-gray-900">Mark Lead as Won</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          {lead && (
            <p className="text-sm text-gray-600">
              Marking <span className="font-medium text-gray-900">{lead.firstName} {lead.lastName}</span> as Won
              will create a Deal in the Won stage.
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Sale Value (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="e.g. 25000"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Invoice Reference <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={invoiceRef}
              onChange={(e) => setInvoiceRef(e.target.value)}
              placeholder="e.g. INV-2024-001"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
            <Button loading={saving} className="bg-emerald-600 hover:bg-emerald-700">
              Confirm Win
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
