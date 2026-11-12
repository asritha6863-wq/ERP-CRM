import { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  Plus, Maximize2, Loader2, IndianRupee,
  Calendar, User, TrendingUp, ChevronRight,
  LayoutGrid,
} from 'lucide-react';
import useDeals   from '../../hooks/useDeals.js';
import useLookups from '../../hooks/useLookups.js';
import { useAuth } from '../../context/AuthContext.jsx';
import DealModal       from './DealModal.jsx';
import LostReasonModal from './LostReasonModal.jsx';

// Stage dot colours
const STAGE_DOT = {
  'New Lead':    'bg-gray-400',
  'Lead':        'bg-gray-400',
  'In Progress': 'bg-blue-500',
  'Contacted':   'bg-blue-500',
  'Advanced':    'bg-violet-500',
  'Qualified':   'bg-violet-500',
  'Won':         'bg-emerald-500',
  'Lost':        'bg-red-500',
};

function stageDot(name) {
  return STAGE_DOT[name] || 'bg-gray-400';
}

export default function PipelinePage() {
  const { user }    = useAuth();
  const { lookups } = useLookups();
  const {
    columns, loading, error,
    filters, setFilter, clearFilters,
    createDeal, updateDeal, moveStage,
  } = useDeals();

  const [dealModal, setDealModal]     = useState({ open: false, stageId: '', deal: null });
  const [lostModal, setLostModal]     = useState({ open: false, dealId: '', newStageId: '' });
  const [pendingDrop, setPendingDrop] = useState(null);

  const isAdminOrMgr = user?.role !== 'SALES';

  // Aggregate stats
  const totalRevenue = columns.reduce((s, c) => {
    const wonCol = c.stage.name === 'Won';
    return wonCol ? s + c.totalValue : s;
  }, 0);
  const wonCount  = columns.find((c) => c.stage.name === 'Won')?.count  || 0;
  const totalDeals = columns.reduce((s, c) => s + c.count, 0);
  const winRate   = totalDeals > 0 ? Math.round((wonCount / totalDeals) * 100) : 0;
  const activeDeals = columns.reduce((s, c) => {
    const terminal = ['Won', 'Lost'].includes(c.stage.name);
    return terminal ? s : s + c.count;
  }, 0);

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const { draggableId: dealId, destination } = result;
    const newStageId = destination.droppableId;
    const col = columns.find((c) => c.stage.id === newStageId);
    if (!col) return;
    if (col.stage.name === 'Lost') {
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
  const handleSaveDeal  = async (form) => {
    if (dealModal.deal) await updateDeal(dealModal.deal.id, form);
    else                await createDeal(form);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">
      <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading pipeline…
    </div>
  );

  return (
    <div className="flex flex-col h-full">

      {/* ── Page Header ─────────────────────────────── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">

          {/* Left */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
              <LayoutGrid className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-gray-900">Deals Pipeline</h1>
                <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-md tracking-wide uppercase">
                  Pipeline Management
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Tracking {activeDeals} active {activeDeals === 1 ? 'opportunity' : 'opportunities'} across {columns.filter((c) => !['Won','Lost'].includes(c.stage.name)).length} stages
              </p>
            </div>
          </div>

          {/* Right — stats + actions */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Est. Revenue */}
            <div className="text-right">
              <p className="text-xs text-gray-400">Est. Revenue</p>
              <p className="text-base font-bold text-gray-900">₹{totalRevenue.toLocaleString()}</p>
            </div>

            {/* Win Rate */}
            <div className="text-right mr-2">
              <p className="text-xs text-gray-400">Win Rate</p>
              <p className="text-base font-bold text-emerald-600">{winRate}%</p>
            </div>

            <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500">
              <Maximize2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => setDealModal({ open: true, stageId: columns[0]?.stage.id || '', deal: null })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Opportunity
            </button>
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm px-6 py-3 border-b border-red-200">{error}</div>}

      {/* ── Kanban Board ─────────────────────────────── */}
      <div className="flex-1 overflow-x-auto px-4 py-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex gap-3 h-full" style={{ minWidth: columns.length * 220 + 'px' }}>
            {columns.map(({ stage, deals, totalValue, count }) => (
              <div
                key={stage.id}
                className="flex flex-col bg-gray-50 border border-gray-200 rounded-xl min-w-[210px] flex-1 max-w-[260px]"
              >
                {/* Column header */}
                <div className="px-3 pt-3 pb-2">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${stageDot(stage.name)}`} />
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{stage.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-500">{count}</span>
                  </div>

                  {/* Value row */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-800">
                      ₹{(totalValue || 0).toLocaleString()}
                      <span className="text-xs font-normal text-gray-400 ml-1">vol</span>
                    </span>
                    <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md flex items-center gap-0.5">
                      <TrendingUp className="w-3 h-3" />ACTIVE
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 mx-2" />

                {/* Cards droppable */}
                <Droppable droppableId={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 p-2 space-y-2 min-h-[160px] transition-colors rounded-b-xl ${snapshot.isDraggingOver ? 'bg-indigo-50/60' : ''}`}
                    >
                      {count === 0 && !snapshot.isDraggingOver && (
                        <div className="flex flex-col items-center justify-center h-32 text-gray-300 gap-2">
                          <div className="w-8 h-8 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center">
                            <LayoutGrid className="w-4 h-4 text-gray-300" />
                          </div>
                          <span className="text-xs uppercase tracking-wide font-medium text-gray-300">No Deals</span>
                        </div>
                      )}

                      {deals.map((deal, index) => (
                        <Draggable key={deal.id} draggableId={deal.id} index={index}>
                          {(prov, snap) => (
                            <div
                              ref={prov.innerRef}
                              {...prov.draggableProps}
                              {...prov.dragHandleProps}
                              onClick={() => setDealModal({ open: true, stageId: stage.id, deal })}
                              className={`bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${snap.isDragging ? 'shadow-lg rotate-1 opacity-90' : ''}`}
                            >
                              <p className="text-sm font-semibold text-gray-900 truncate">
                                {deal.contact?.firstName || deal.lead?.firstName} {deal.contact?.lastName || deal.lead?.lastName}
                              </p>
                              <div className="mt-1.5 space-y-1">
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <IndianRupee className="w-3 h-3" />
                                  <span className="font-semibold text-gray-700">₹{(deal.value || 0).toLocaleString()}</span>
                                </div>
                                {deal.owner && (
                                  <div className="flex items-center gap-1 text-xs text-gray-400">
                                    <User className="w-3 h-3" />{deal.owner.name}
                                  </div>
                                )}
                                {deal.expectedCloseDate && (
                                  <div className="flex items-center gap-1 text-xs text-gray-400">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(deal.expectedCloseDate).toLocaleDateString()}
                                  </div>
                                )}
                                {deal.lostReason && (
                                  <p className="text-xs text-red-500 mt-1">Reason: {deal.lostReason.name}</p>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {/* Add deal button at bottom of column */}
                      <button
                        onClick={() => setDealModal({ open: true, stageId: stage.id, deal: null })}
                        className="w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg py-1.5 transition-colors border border-dashed border-gray-200 hover:border-indigo-300 mt-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add deal
                      </button>
                    </div>
                  )}
                </Droppable>
              </div>
            ))}

            {/* Scroll hint arrow */}
            <div className="flex items-center justify-center w-6 shrink-0 text-gray-300">
              <ChevronRight className="w-5 h-5" />
            </div>
          </div>
        </DragDropContext>
      </div>

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
