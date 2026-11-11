import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, UserCheck, MessageSquare, Phone, User, Clock, AlertCircle } from 'lucide-react';
import api    from '../../services/api.js';
import Badge  from '../../components/ui/Badge.jsx';
import Button from '../../components/ui/Button.jsx';
import ModalForm from '../../components/ui/ModalForm.jsx';
import LeadFormModal from './LeadFormModal.jsx';
import useLookups from '../../hooks/useLookups.js';

const ACTIVITY_ICONS = {
  NOTE:              MessageSquare,
  CALL:              Phone,
  VISIT:             User,
  STATUS_CHANGE:     AlertCircle,
  ASSIGNMENT_CHANGE: User,
  STAGE_CHANGE:      AlertCircle,
  CREATED:           Clock,
};

const ACTIVITY_COLORS = {
  NOTE:              'bg-blue-100 text-blue-600',
  CALL:              'bg-green-100 text-green-600',
  VISIT:             'bg-purple-100 text-purple-600',
  STATUS_CHANGE:     'bg-amber-100 text-amber-600',
  ASSIGNMENT_CHANGE: 'bg-gray-100 text-gray-600',
  STAGE_CHANGE:      'bg-indigo-100 text-indigo-600',
  CREATED:           'bg-gray-100 text-gray-500',
};

export default function LeadDetailPage() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { lookups } = useLookups();

  const [lead, setLead]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [editOpen, setEditOpen]   = useState(false);
  const [noteOpen, setNoteOpen]   = useState(false);
  const [noteForm, setNoteForm]   = useState({ type: 'NOTE', description: '' });
  const [saving, setSaving]       = useState(false);

  const fetchLead = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/leads/${id}`);
      setLead(r.data);
    } catch { navigate('/leads'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLead(); }, [id]);

  const handleUpdate = async (form) => {
    await api.put(`/leads/${id}`, form);
    fetchLead();
  };

  const handleAddActivity = async () => {
    if (!noteForm.description.trim()) return;
    setSaving(true);
    try {
      await api.post(`/leads/${id}/activities`, noteForm);
      setNoteOpen(false);
      setNoteForm({ type: 'NOTE', description: '' });
      fetchLead();
    } finally { setSaving(false); }
  };

  const handleConvert = async () => {
    if (!confirm('Convert this lead to a customer?')) return;
    await api.post(`/leads/${id}/convert`);
    fetchLead();
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>;
  if (!lead)   return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/leads')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </button>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => setEditOpen(true)}>Edit</Button>
          {!lead.isConverted && (
            <Button size="sm" icon={UserCheck} onClick={handleConvert}>Convert to Customer</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* ── Profile card ── */}
        <div className="col-span-1 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{lead.firstName} {lead.lastName}</h2>
                <p className="text-sm text-gray-500">{lead.email || '—'}</p>
                <p className="text-sm text-gray-500">{lead.phone || '—'}</p>
              </div>
              {lead.isConverted && <Badge label="Converted" color="bg-emerald-100 text-emerald-700" />}
            </div>
            <dl className="space-y-2 text-sm">
              <Row label="Status">
                {lead.status ? <Badge label={lead.status.name} color={lead.status.color} /> : '—'}
              </Row>
              <Row label="Source">{lead.source?.name || '—'}</Row>
              <Row label="Branch">{lead.branch?.name || '—'}</Row>
              <Row label="Assigned To">{lead.assignedTo?.name || '—'}</Row>
              <Row label="Sentiment">
                <Badge
                  label={lead.sentiment}
                  color={lead.sentiment === 'POSITIVE' ? 'bg-green-100 text-green-700' : lead.sentiment === 'NEGATIVE' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}
                />
              </Row>
            </dl>
            {lead.tags?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {lead.tags.map((t) => (
                  <span key={t.id} className="bg-indigo-100 text-indigo-700 text-xs rounded-full px-2 py-0.5">{t.name}</span>
                ))}
              </div>
            )}
          </div>

          {/* Deals */}
          {lead.deals?.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Deals</h3>
              <div className="space-y-2">
                {lead.deals.map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-sm">
                    <Badge label={d.stage.name} color="bg-indigo-100 text-indigo-700" />
                    <span className="font-medium">₹{d.value?.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Activity Timeline ── */}
        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Activity Timeline</h3>
            <Button size="sm" variant="secondary" onClick={() => setNoteOpen(true)}>+ Log Activity</Button>
          </div>

          {lead.activities?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <Clock className="w-8 h-8 mb-2 text-gray-300" />
              <p className="text-sm">No activities yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {lead.activities.map((act) => {
                const Icon  = ACTIVITY_ICONS[act.type]  || Clock;
                const color = ACTIVITY_COLORS[act.type] || 'bg-gray-100 text-gray-600';
                return (
                  <div key={act.id} className="flex gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">{act.description}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                        <span>{act.user?.name}</span>
                        <span>·</span>
                        <span>{new Date(act.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      <LeadFormModal open={editOpen} onClose={() => setEditOpen(false)} initial={lead} onSave={handleUpdate} lookups={lookups} />

      {/* Log activity modal */}
      <ModalForm open={noteOpen} onClose={() => setNoteOpen(false)} title="Log Activity"
        footer={<><Button variant="secondary" onClick={() => setNoteOpen(false)}>Cancel</Button><Button loading={saving} onClick={handleAddActivity}>Save</Button></>}
      >
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select value={noteForm.type} onChange={(e) => setNoteForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="NOTE">Note</option>
              <option value="CALL">Call</option>
              <option value="VISIT">Visit</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={noteForm.description}
              onChange={(e) => setNoteForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Describe the activity…"
            />
          </div>
        </div>
      </ModalForm>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <dt className="text-gray-500 shrink-0">{label}</dt>
      <dd className="text-right text-gray-800">{children}</dd>
    </div>
  );
}
