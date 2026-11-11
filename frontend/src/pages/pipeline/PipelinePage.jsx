import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Calendar, User, IndianRupee, Loader2 } from 'lucide-react';
import useDeals   from '../../hooks/useDeals.js';
import useLookups from '../../hooks/useLookups.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Button      from '../../components/ui/Button.jsx';
import Badge       from '../../components/ui/Badge.jsx';
import DealModal        from './DealModal.jsx';
import LostReasonModal  from './LostReasonModal.jsx';

const STAGE_COLORS = {
  Lead:        'bg-gray-100 border-gray-200',
  Contacted:   'bg-blue-50 border-blue-200',
  Qualified:   'bg-indigo-50 border-indigo-200',
  Proposal:    'bg-violet-50 border-violet-200',
  Negotiation: 'bg-amber-50 border-amber-200',
  Won:         'bg-emerald-50 border-emerald-200',
  Lost:        'bg-red-50 border-red-200',
};
const STAGE_HEADER = {
  Won:  'bg-emerald-600 text-white',
  Lost: 'bg-red-600 text-white',
};

export default function PipelinePage() {
  const { user }     = useAuth();
  const { lookups }  = useLookups();
  const {
    columns, loading, error,
    filters, setFilter, clearFilters,
    createDeal, updateDeal, moveStage, deleteDeal,
  } = useDeals();

  const [dealModal, setDealModal]         = useState({ open: false, stageId: '', deal: null });
  const [lostModal, setLostModal]         = useState({ open: false, dealId: '', newStageId: '' });
  const [pendingDrop, setPendingDrop]     = useState(null);

  const isAdminOrMgr = user?.role !== 'SALES';

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const { draggableId: dealId, destination } = result;
    const newStageId = destination.droppableId;

    // Find the target stage name
    const col = columns.find((c) => c.stage.id === newStageId);
    if (!col) return;

    if (col.stage.name === 'Lost') {
      // Need lost reason — open prompt
      setPendingDrop({ dealId, newStageId });
      setLostModal({ open: true, dealId, newStageId });
      return;
    }

    await moveStage(dealId, { stageId: newStageId });
  };

  const handleLostConfirm = async (lostReasonId) => {
    if (!pendingDrop) return;
    await moveStage(pendingDrop.dealId, { stageId: pendingDrop.newStageId, lostReasonId });
    setPendingDrop(null);
  };

  const handleLostClose = () => { setLostModal((m) => ({ ...m, open: false })); setPendingDrop(null); };

  const handleSaveDeal = async (form) => {
    if (dealModal.deal) await updateDeal(dealModal.deal.id, form);
    else                await createDeal(form);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <Loader2 className="w-6 h-6 animate-spin mr-2" />Loading pipeline…
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-gray-900">Sales Pipeline</h1>
        <Button icon={Plus} onClick={() => setDealModal({ open: true, stageId: columns[0]?.stage.id, deal: null })}>
          New Deal
        </Button>
      </div>

      {/* Filters */}
      {isAdminOrMgr && (
        <div className="flex flex-wrap gap-2 items-center">
          <FilterSelect label="Staff"  value={filters.ownerId}   onChange={(v) => setFilter('ownerId', v)}   options={lookups.staff} />
          <FilterSelect label="Branch" value={filters.branchId}  onChange={(v) => setFilter('branchId', v)}  options={lookups.branches} />
          <input type="date" value={filters.dateFrom} onChange={(e) => setFilter('dateFrom', e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <span className="text-gray-400 text-sm">to</span>
          <input type="date" value={filters.dateTo} onChange={(e) => setFilter('dateTo', e.target.value)}
            className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          {(filters.ownerId || filters.branchId || filters.dateFrom || filters.dateTo) && (
            <button onClick={clearFilters} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100">Clear</button>
          )}
        </div>
      )}

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map(({ stage, deals, totalValue }) => {
            const colColor    = STAGE_COLORS[stage.name] || 'bg-gray-50 border-gray-200';
            const headerColor = STAGE_HEADER[stage.name] || 'bg-white text-gray-700';

            return (
              <div key={stage.id} className={`flex flex-col rounded-xl border ${colColor} min-w-[260px] max-w-[260px] shrink-0`}>
                {/* Column header */}
                <div className={`px-3 py-2.5 rounded-t-xl border-b ${headerColor} ${colColor}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-semibold ${STAGE_HEADER[stage.name] ? 'text-white' : 'text-gray-800'}`}>{stage.name}</span>
                    <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${STAGE_HEADER[stage.name] ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {deals.length}
                    </span>
                  </div>
                  <p className={`text-xs mt-0.5 ${STAGE_HEADER[stage.name] ? 'text-white/80' : 'text-gray-400'}`}>
                    ₹{totalValue.toLocaleString()}
                  </p>
                </div>

                {/* Add button */}
                <button
                  onClick={() => setDealModal({ open: true, stageId: stage.id, deal: null })}
                  className="mx-3 mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg px-2 py-1 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" /> Add deal
                </button>

                {/* Cards */}
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-2 space-y-2 min-h-[120px] transition-colors ${snapshot.isDraggingOver ? 'bg-indigo-50/50' : ''}`}
                    >
                      {deals.length === 0 && !snapshot.isDraggingOver && (
                        <div className="flex items-center justify-center h-20 text-gray-300 text-xs">No deals</div>
                      )}
                      {deals.map((deal, index) => (
                        <Draggable key={deal.id} draggableId={deal.id} index={index}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              className={`bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${snap.isDragging ? 'shadow-lg rotate-1' : ''}`}
                              onClick={() => setDealModal({ open: true, stageId: stage.id, deal })}
                            >
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {deal.lead?.firstName} {deal.lead?.lastName}
                              </p>
                              <div className="mt-1.5 space-y-1">
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <IndianRupee className="w-3 h-3" />
                                  <span className="font-medium text-gray-700">₹{(deal.value || 0).toLocaleString()}</span>
                                </div>
                                {deal.owner && (
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <User className="w-3 h-3" />{deal.owner.name}
                                  </div>
                                )}
                                {deal.expectedCloseDate && (
                                  <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(deal.expectedCloseDate).toLocaleDateString()}
                                  </div>
                                )}
                                {deal.lostReason && (
                                  <Badge label={deal.lostReason.name} color="bg-red-100 text-red-600" />
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      <DealModal
        open={dealModal.open}
        onClose={() => setDealModal({ open: false, stageId: '', deal: null })}
        initial={dealModal.deal}
        currentStageId={dealModal.stageId}
        onSave={handleSaveDeal}
        lookups={lookups}
      />

      <LostReasonModal
        open={lostModal.open}
        onClose={handleLostClose}
        onConfirm={handleLostConfirm}
        lostReasons={lookups.lostReasons}
      />
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
      <option value="">All {label}s</option>
      {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
    </select>
  );
}
