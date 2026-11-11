import { useState } from 'react';
import ModalForm from '../../components/ui/ModalForm.jsx';
import Button    from '../../components/ui/Button.jsx';

export default function LostReasonModal({ open, onClose, onConfirm, lostReasons }) {
  const [reasonId, setReasonId] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const handleConfirm = async () => {
    if (!reasonId) { setError('Please select a reason'); return; }
    setLoading(true);
    try { await onConfirm(reasonId); onClose(); setReasonId(''); }
    catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <ModalForm open={open} onClose={onClose} title="Select Lost Reason" size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Cancel</Button><Button loading={loading} variant="danger" onClick={handleConfirm}>Mark as Lost</Button></>}
    >
      {error && <div className="mb-3 bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Why was this deal lost? <span className="text-red-500">*</span></label>
        <select value={reasonId} onChange={(e) => { setReasonId(e.target.value); setError(''); }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <option value="">Select a reason…</option>
          {lostReasons.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
    </ModalForm>
  );
}
