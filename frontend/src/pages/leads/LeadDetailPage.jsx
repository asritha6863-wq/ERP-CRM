import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Phone, User, Clock, AlertCircle } from 'lucide-react';
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

  const handleAddActivity}>Save</Button></>}
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
