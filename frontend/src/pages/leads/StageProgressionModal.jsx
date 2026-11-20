import { useState, useEffect } from 'react';
import { X, ArrowRight, Calendar } from 'lucide-react';

const INPUT = 'w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 transition';

export default function StageProgressionModal({ open, lead, stages, onSave, onClose }) {
  const [stageId, setStageId]   = useState('');
  const [dueDate, setDueDate]   = useState('');
  const [notes, setNotes]       = useState('');
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    if (open && lead) {
      setStageId(lead.stageId || '');
      setDueDate('');
      setNotes('');
      setError('');
    }
  }, [open, lead]);

  if (!open || !lead) return null;

  const currentStage = stages.find((s) => s.id === lead.stageId);
  const targetStage  = stages.find((s) => s.id === stageId) || currentStage;
  const unchanged    = !stageId || stageId === lead.stageId;

  const submit = async (e) => {
    e.preventDefault();
    if (!dueDate) return setError('Next Action Date is required');
    if (!notes.trim()) return setError('Stage Notes are required');
    setSaving(true); setError('');
    try {
      await onSave(lead.id, {
        stageId: stageId || lead.stageId,
        dueDate,
        stageNote: notes,
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update the stage');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="px-6 pt-5 pb-4">
          <span className="inline-block text-[10px] font-bold tracking-widest text-pink-500 bg-pink-50 border border-pink-200 rounded-full px-3 py-1 mb-2">
            STAGE PROGRESSION
          </span>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-xl font-bold text-gray-900">
              {lead.firstName} {lead.lastName}
            </h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={submit} className="px-6 pb-6 space-y-5">

          {/* Stage flow display */}
          <div className="flex items-stretch gap-2 rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex-1 bg-gray-50 px-4 py-3 text-center">
              <p className="text-[10px] font-bold tracking-widest text-gray-400 mb-1">CURRENT STAGE</p>
              <p className="text-sm font-bold text-gray-900">{currentStage?.name || '—'}</p>
            </div>
            <div className="flex items-center px-1 text-gray-300">
              <ArrowRight className="w-4 h-4" />
            </div>
            <div className="flex-1 bg-gray-50 px-4 py-3 text-center">
              <p className={`text-[10px] font-bold tracking-widest mb-1 ${unchanged ? 'text-pink-400' : 'text-pink-500'}`}>
                TARGET STAGE {unchanged ? '(UNCHANGED)' : ''}
              </p>
              <p className={`text-sm font-bold ${unchanged ? 'text-pink-500' : 'text-gray-900'}`}>
                {targetStage?.name || '—'}
              </p>
            </div>
          </div>

          {/* Target stage select */}
          <div>
            <label className="block text-xs font-bold tracking-widest text-gray-500 mb-2">TARGET STAGE</label>
            <select value={stageId} onChange={(e) => setStageId(e.target.value)} className={INPUT}>
              <option value="">Keep Current Stage {currentStage ? `(${currentStage.name})` : ''}</option>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Next action date */}
          <div>
            <label className="flex items-center gap-2 text-xs font-bold tracking-widest text-gray-500 mb-2">
              <Calendar className="w-3.5 h-3.5 text-pink-400" /> NEXT ACTION DATE <span className="text-pink-500">*</span>
            </label>
            <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
              className={`${INPUT} ${!dueDate ? 'text-gray-400' : 'text-gray-900'}`} />
          </div>

          {/* Stage notes */}
          <div>
            <label className="block text-xs font-bold tracking-widest text-gray-500 mb-2">
              STAGE NOTES <span className="text-pink-500">*</span>
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Document lead requirements, follow-up conversation notes, or action items here..."
              className={INPUT}
            />
          </div>

          {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2">{error}</p>}

          {/* Footer */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 rounded-full border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 rounded-full bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? 'Saving…' : <>Confirm Update ✓</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
