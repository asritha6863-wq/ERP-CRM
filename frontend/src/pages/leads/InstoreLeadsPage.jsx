import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, Download, Filter, Users, Store,
  Phone, Calendar, ArrowRight, MoreVertical,
  CheckCircle2, CircleDot, Pencil, Eye, History, Activity, Copy, Check,
} from 'lucide-react';
import useLeads        from '../../hooks/useLeads.js';
import useLookups      from '../../hooks/useLookups.js';
import { useAuth }     from '../../context/AuthContext.jsx';
import { useRef, useEffect, useMemo } from 'react';
import api             from '../../services/api.js';
import { downloadCsvResponseAsExcel } from '../../utils/excel.js';
import Pagination      from '../../components/ui/Pagination.jsx';
import Button          from '../../components/ui/Button.jsx';
import Badge           from '../../components/ui/Badge.jsx';
import LeadFormModal   from './LeadFormModal.jsx';
import ImportModal     from './ImportModal.jsx';
import LeadFilters     from './LeadFilters.jsx';
import ConvertCustomerModal from './ConvertCustomerModal.jsx';
import StageProgressionModal from './StageProgressionModal.jsx';
import { WonLossModal, LeadStatusModal, HistoryModal, Customer360Modal } from './LeadActionModals.jsx';

const MENU = [
  { key: 'winloss',  label: 'Won/Loss Status',      icon: CheckCircle2, tint: 'text-emerald-500' },
  { key: 'status',   label: 'Lead Tag (Hot/Cold)',           icon: CircleDot,    tint: 'text-blue-500'    },
  { key: 'edit',     label: 'Edit Details',          icon: Pencil,       tint: 'text-blue-500'    },
  { key: 'view',     label: 'View',                  icon: Eye,          tint: 'text-blue-500'    },
  { key: 'history',  label: 'History Log',           icon: History,      tint: 'text-gray-500'    },
  { key: 'c360',     label: 'Customer 360',          icon: Activity,     tint: 'text-purple-500'  },
];

const PRIORITY_STYLE = {
  HIGH:   'text-red-600 bg-red-50 border-red-300',
  MEDIUM: 'text-amber-600 bg-amber-50 border-amber-300',
  LOW:    'text-slate-500 bg-slate-50 border-slate-300',
};

const fmt     = (d, utc) => (d ? new Date(d).toLocaleDateString('en-GB', utc ? { timeZone: 'UTC' } : undefined) : '—');
const todayStr = () => new Date().toLocaleDateString('en-CA');

export default function InstoreLeadsPage() {
  const navigate    = useNavigate();
  const { user }    = useAuth();
  const { lookups } = useLookups();

  const {
    data, total, pages, page, setPage,
    search, setSearch, filters, setFilter, applyFilters, clearFilters,
    loading, error, limit,
    createLead, updateLead, convertLead, winLead, loseLead, refetch,
  } = useLeads('INSTORE');

  const [formOpen, setFormOpen]       = useState(false);
  const [editing, setEditing]         = useState(null);
  const [importOpen, setImportOpen]   = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exporting, setExporting]     = useState(false);
  const [menu, setMenu]               = useState(null);
  const [dialog, setDialog]           = useState(null);
  const [stageModal, setStageModal]   = useState(null);
  const [notice, setNotice]           = useState('');
  const [copied, setCopied]           = useState('');
  const menuRef = useRef(null);

  const canSeeAll    = user?.role !== 'SALES';
  const isAdminOrMgr = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const today        = todayStr();

  // Instore sources only
  const instoreSources = useMemo(() =>
    lookups.sources.filter((s) => s.name?.toLowerCase().includes('walk') || s.defaultChannel === 'INSTORE'),
    [lookups.sources],
  );

  // Close menu on outside click / scroll / Escape
  useEffect(() => {
    if (!menu) return undefined;
    const close = () => setMenu(null);
    const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) close(); };
    const onKey  = (e) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
    };
  }, [menu]);

  const openMenu = (e, lead) => {
    const r = e.currentTarget.getBoundingClientRect();
    const height = MENU.length * 36 + 12;
    setMenu({
      lead,
      left: Math.max(8, r.right - 192),
      top:  r.bottom + height > window.innerHeight ? Math.max(8, r.top - height - 4) : r.bottom + 4,
    });
  };

  const runAction = (key, lead) => {
    setMenu(null);
    if (key === 'view')    return navigate(`/leads/${lead.id}`);
    if (key === 'edit')    { setEditing(lead); setFormOpen(true); return; }
    if (key === 'convert' && lead.isConverted) { setNotice('Already converted to a customer.'); return; }
    setDialog({ type: key, lead });
  };

  const copyPhone = async (text) => {
    try { await navigator.clipboard.writeText(text); }
    catch {
      const t = document.createElement('textarea'); t.value = text;
      document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } finally { document.body.removeChild(t); }
    }
    setCopied(text); setTimeout(() => setCopied(''), 1500);
  };

  const handleSave = async (form) => {
    const payload = { ...form, channel: 'INSTORE' };
    if (editing) await updateLead(editing.id, payload);
    else         await createLead(payload);
  };

  const exportCsv = async () => {
    setExporting(true); setNotice('');
    try {
      const params = { channel: 'INSTORE' };
      if (search) params.name = search;
      ['sourceId', 'branchId', 'assignedToId', 'statusId'].forEach((k) => { if (filters[k]) params[k] = filters[k]; });
      const res = await api.get('/reports/leads/export', { params, responseType: 'blob' });
      await downloadCsvResponseAsExcel(res.data, 'instore-leads.xlsx');
    } catch { setNotice('Export failed. Please try again.'); }
    finally { setExporting(false); }
  };

  return (
    <div className="flex flex-col">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500 flex items-center justify-center shrink-0">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">Instore Leads</h1>
                <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md tracking-wide uppercase">Sales Pipeline</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Walk-in visitors and instore enquiries</p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2 bg-white mr-1">
              <div>
                <p className="text-[10px] text-gray-400 leading-none tracking-wide">TOTAL LEADS</p>
                <p className="text-lg font-bold text-gray-900 leading-tight text-right font-mono">{total.toLocaleString('en-IN')}</p>
              </div>
              <Users className="w-5 h-5 text-gray-300 ml-1" />
            </div>

            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${filtersOpen ? 'bg-indigo-50 border-indigo-300 text-indigo-600' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
            >
              <Filter className="w-4 h-4" /> Filters
            </button>
            <button onClick={() => setImportOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm text-gray-600">
              <Upload className="w-4 h-4" /> Import
            </button>
            <button onClick={exportCsv} disabled={exporting} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm text-gray-600 disabled:opacity-60">
              <Download className="w-4 h-4" /> {exporting ? 'Exporting…' : 'Export'}
            </button>
            <button
              onClick={() => { setEditing(null); setFormOpen(true); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> New Instore Lead
            </button>
          </div>
        </div>
      </div>

      {/* Filters panel */}
      {filtersOpen && (
        <LeadFilters
          filters={filters}
          lookups={{ ...lookups, sources: instoreSources }}
          canSeeAll={canSeeAll}
          onApply={applyFilters}
          onClear={clearFilters}
        />
      )}

      {/* Table */}
      <div className="px-6 py-4 space-y-4">
        {(error || notice) && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error || notice}</div>}

        <div className="bg-white border border-gray-200 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                {['NAME / DATE', 'CONTACT / AREA', ...(canSeeAll ? ['BRANCH'] : []), 'LEAD SOURCE', 'STAGE', 'WON/LOST', 'LEAD TAG', 'PRIORITY', 'CREATED DATE', 'DUE DATE', 'ASSIGNED', 'ACTIONS'].map((h) => (
                  <th key={h} className="text-left text-[10px] font-semibold text-gray-500 tracking-widest px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={13} className="text-center text-gray-400 py-12">Loading…</td></tr>}
              {!loading && data.length === 0 && <tr><td colSpan={13} className="text-center text-gray-400 py-12">No instore leads found</td></tr>}

              {!loading && data.map((lead) => {
                const pending = !lead.isWon && !lead.isLost;
                const dueStr  = lead.dueDate ? lead.dueDate.slice(0, 10) : '';
                const dueNow  = pending && dueStr && dueStr <= today;
                const name    = [lead.firstName, lead.lastName].filter(Boolean).join(' ').trim() || '—';

                return (
                  <tr key={lead.id} className="border-b border-gray-100 hover:bg-gray-50/70 align-top">

                    <td className="px-4 py-4">
                      <p className="text-[10px] text-pink-500 font-medium">{fmt(lead.createdAt)}</p>
                      <button onClick={() => navigate(`/leads/${lead.id}`)} className="text-sm font-semibold text-gray-900 hover:text-pink-600 text-left uppercase">
                        {name}
                      </button>
                    </td>

                    <td className="px-4 py-4 text-xs text-gray-600 space-y-1 whitespace-nowrap">
                      <p className="flex items-center gap-1.5 select-text">
                        <Phone className="w-3 h-3 text-gray-400 shrink-0" />
                        <span className="select-text">{lead.phone || '—'}</span>
                        {lead.phone && <CopyBtn done={copied === lead.phone} onClick={() => copyPhone(lead.phone)} />}
                      </p>
                      {lead.altPhone && (
                        <p className="flex items-center gap-1.5">
                          <span className="text-gray-400">Alt:</span>
                          <span className="select-text">{lead.altPhone}</span>
                          <CopyBtn done={copied === lead.altPhone} onClick={() => copyPhone(lead.altPhone)} />
                        </p>
                      )}
                      {lead.area && <p className="text-gray-400">{lead.area}</p>}
                    </td>

                    {canSeeAll && <td className="px-4 py-4 text-xs font-semibold text-gray-800 uppercase max-w-[160px]">{lead.branch?.name || '—'}</td>}

                    <td className="px-4 py-4">
                      {lead.source?.name
                        ? <span className="inline-block text-[11px] text-gray-700 bg-gray-100 border border-gray-200 rounded-md px-2 py-1">{lead.source.name}</span>
                        : <span className="text-gray-300">—</span>}
                    </td>

                    <td className="px-4 py-4 text-[11px] font-bold text-gray-800 uppercase tracking-wide">{lead.stage?.name || '—'}</td>

                    <td className="px-4 py-4">
                      {lead.isWon  && <span className="inline-block text-[10px] font-bold rounded-full px-2.5 py-0.5 border text-emerald-700 bg-emerald-50 border-emerald-200">WON</span>}
                      {lead.isLost && <span className="inline-block text-[10px] font-bold rounded-full px-2.5 py-0.5 border text-red-600 bg-red-50 border-red-200">LOST</span>}
                      {!lead.isWon && !lead.isLost && <span className="inline-block text-[10px] font-bold rounded-full px-2.5 py-0.5 border text-blue-600 bg-blue-50 border-blue-200">PENDING</span>}
                    </td>

                    <td className="px-4 py-4">
                      {lead.status ? <Badge label={lead.status.name} color={lead.status.color} /> : <span className="text-gray-300">-</span>}
                    </td>

                    <td className="px-4 py-4">
                      <span className={`inline-block text-[10px] font-bold rounded-full px-3 py-1 border ${PRIORITY_STYLE[lead.priority] || PRIORITY_STYLE.MEDIUM}`}>{lead.priority}</span>
                    </td>

                    <td className="px-4 py-4 text-xs text-gray-600 whitespace-nowrap">{fmt(lead.createdAt)}</td>

                    <td className="px-4 py-4 text-xs whitespace-nowrap">
                      {lead.dueDate ? (
                        <span className={`flex items-center gap-1.5 font-medium ${dueNow ? 'text-orange-500' : 'text-gray-700'}`}>
                          <Calendar className={`w-3.5 h-3.5 ${dueNow ? 'text-orange-500' : 'text-emerald-500'}`} />
                          {fmt(lead.dueDate, true)}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>

                    <td className="px-4 py-4">
                      {lead.assignedTo ? (
                        <span className="flex items-center gap-2 text-xs text-gray-700 whitespace-nowrap">
                          <span className="w-6 h-6 rounded-full bg-pink-100 text-pink-600 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {lead.assignedTo.name[0]}
                          </span>
                          {lead.assignedTo.name}
                        </span>
                      ) : <span className="text-gray-300 text-xs italic">Unassigned</span>}
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        {(!lead.isWon && !lead.isLost) && (
                          <button onClick={() => setStageModal(lead)} className="p-1.5 rounded-md text-pink-500 hover:bg-pink-50"><ArrowRight className="w-4 h-4" /></button>
                        )}
                        <button onClick={(e) => openMenu(e, lead)} className="p-1.5 rounded-md text-gray-500 hover:bg-gray-100"><MoreVertical className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} />
      </div>

      {/* Row action menu — portal so it isn't clipped */}
      {menu && createPortal(
        <div ref={menuRef} role="menu" style={{ top: menu.top, left: menu.left }}
          className="fixed z-50 w-48 bg-white border border-gray-200 rounded-xl shadow-xl py-1.5">
          {MENU.map(({ key, label, icon: Icon, tint }) => (
            <button key={key} role="menuitem" onClick={() => runAction(key, menu.lead)}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
              <Icon className={`w-4 h-4 ${tint}`} /> {label}
            </button>
          ))}
        </div>,
        document.body,
      )}

      <LeadFormModal
        open={formOpen} onClose={() => setFormOpen(false)}
        initial={editing ? { ...editing, channel: 'INSTORE' } : { channel: 'INSTORE' }}
        onSave={handleSave}
        lookups={{ ...lookups, sources: instoreSources }}
      />
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onDone={refetch} />

      <WonLossModal
        open={dialog?.type === 'winloss'} lead={dialog?.lead} lostReasons={lookups.lostReasons}
        onWin={winLead} onLose={loseLead} onClose={() => setDialog(null)}
      />
      <LeadStatusModal
        open={dialog?.type === 'status'} lead={dialog?.lead} statuses={lookups.statuses}
        onSave={updateLead} onClose={() => { setDialog(null); refetch(); }}
      />
      <HistoryModal open={dialog?.type === 'history'} lead={dialog?.lead} onClose={() => setDialog(null)} />
      <Customer360Modal open={dialog?.type === 'c360'} lead={dialog?.lead} onClose={() => setDialog(null)} />

      <StageProgressionModal
        open={!!stageModal} lead={stageModal} stages={lookups.stages}
        onSave={updateLead} onClose={() => { setStageModal(null); refetch(); }}
      />
    </div>
  );
}

function CopyBtn({ done, onClick }) {
  return (
    <button type="button" onClick={onClick} title="Copy number"
      className="p-0.5 rounded text-gray-300 hover:text-pink-500 hover:bg-gray-100">
      {done ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}
