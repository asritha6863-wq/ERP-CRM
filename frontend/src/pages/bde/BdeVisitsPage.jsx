import { useState } from 'react';
import { MapPin, Phone, Clock, Filter } from 'lucide-react';
import { useBdeVisits } from '../../hooks/useBdeField.js';
import { useAuth } from '../../context/AuthContext.jsx';
import useLookups from '../../hooks/useLookups.js';

const STATUS_STYLE = {
  CHECKED_IN:  'text-pink-600 bg-pink-50 border-pink-200',
  CHECKED_OUT: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  CANCELLED:   'text-gray-500 bg-gray-100 border-gray-200',
};

const fmt = (d) => (d ? new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');

export default function BdeVisitsPage() {
  const { user } = useAuth();
  const { lookups } = useLookups();
  const [filters, setFilters] = useState({ userId: '', status: '', dateFrom: '', dateTo: '' });
  const { data, total, loading, error } = useBdeVisits(filters);

  const canSeeAll = user?.role !== 'SALES';
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">BDE Field Visits</h1>
        <p className="text-sm text-gray-500 mt-0.5">{total} visit{total !== 1 ? 's' : ''} recorded</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-gray-400" />
        {canSeeAll && (
          <select value={filters.userId} onChange={set('userId')} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
            <option value="">All Staff</option>
            {lookups.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <select value={filters.status} onChange={set('status')} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm">
          <option value="">All Status</option>
          <option value="CHECKED_IN">Checked In</option>
          <option value="CHECKED_OUT">Checked Out</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
        <input type="date" value={filters.dateFrom} onChange={set('dateFrom')} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
        <span className="text-gray-400 text-sm">to</span>
        <input type="date" value={filters.dateTo} onChange={set('dateTo')} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm" />
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}

      <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
        {loading && <p className="text-center text-gray-400 py-10">Loading…</p>}
        {!loading && data.length === 0 && <p className="text-center text-gray-400 py-10">No visits found</p>}
        {!loading && data.map((v) => (
          <div key={v.id} className="flex items-start gap-4 px-5 py-4">
            <div className="w-9 h-9 rounded-full bg-pink-100 text-pink-600 font-bold flex items-center justify-center shrink-0 text-xs">
              {v.user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900 text-sm">{v.customerName || v.contact?.firstName || 'Field visit'}</p>
                <span className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${STATUS_STYLE[v.status]}`}>{v.status.replace('_', ' ')}</span>
              </div>
              {v.customerPhone && <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3" /> {v.customerPhone}</p>}
              {v.checkInAddress && <p className="text-xs text-gray-400 flex items-start gap-1 mt-0.5"><MapPin className="w-3 h-3 mt-0.5 shrink-0" /> {v.checkInAddress}</p>}
              {v.outcome && <p className="text-xs text-gray-600 mt-1">Outcome: <span className="font-medium">{v.outcome}</span></p>}
              {v.notes && <p className="text-xs text-gray-400 mt-1 italic">{v.notes}</p>}
              <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> In: {fmt(v.checkInAt)} {v.checkOutAt && `· Out: ${fmt(v.checkOutAt)}`}
              </p>
            </div>
            <p className="text-xs text-gray-400 shrink-0">{v.user?.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
