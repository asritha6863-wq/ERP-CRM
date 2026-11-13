import prisma from '../utils/prisma.js';
import { getScopeFilter } from '../middleware/scope.middleware.js';
import { ensureFeedbackRequest } from './feedbackRequest.service.js';

// Keep the parent lead's stage / outcome / loss reason in step with its deal
async function syncLead(leadId, stage, lostReasonId, invoiceRef) {
  if (!leadId || !stage) return;
  const isWon  = /^won$/i.test(stage.name);
  const isLost = /^lost$/i.test(stage.name);
  let lossReason = null;
  if (isLost && lostReasonId) {
    lossReason = (await prisma.lostReason.findUnique({ where: { id: lostReasonId } }))?.name ?? null;
  }
  await prisma.lead.update({ where: { id: leadId }, data: { stageId: stage.id, isWon, isLost, lossReason } });
  // A sale queues a purchase feedback call (once per invoice)
  if (isWon) await ensureFeedbackRequest(prisma, { leadId, kind: 'PURCHASE', refNo: invoiceRef || 'PURCHASE' });
}

const DEAL_INCLUDE = {
  stage:      { select: { id: true, name: true, order: true } },
  lostReason: { select: { id: true, name: true } },
  owner:      { select: { id: true, name: true } },
  contact:    { select: { id: true, firstName: true, lastName: true, phone: true } },
  lead: {
    select: {
      id: true, firstName: true, lastName: true, phone: true,
      branch: { select: { id: true, name: true } },
    },
  },
};

// Build the deal scope filter — deals scope through contact or lead
function buildDealScope(user, { companyId, branchId } = {}) {
  const where = {};

  if (user.role === 'MANAGER') {
    // Scope through lead.branch or contact.branch
    where.OR = [
      { lead:    { branchId: user.branchId } },
      { contact: { branchId: user.branchId } },
    ];
  } else if (user.role === 'SALES') {
    where.ownerId = user.id;
  }

  // Top-bar selectors (ADMIN + MANAGER with companyId)
  if (companyId) {
    if (where.OR) {
      where.OR = where.OR.map((clause) => ({
        ...clause,
        contact: { ...(clause.contact || {}), companyId },
      }));
    } else {
      where.contact = { companyId };
    }
  }
  if (branchId && user.role === 'ADMIN') {
    where.OR = [
      { lead:    { branchId } },
      { contact: { branchId } },
    ];
  }

  return where;
}

// GET /api/deals/kanban — performance-optimised for 100k records
export async function getKanban(user, query) {
  const { companyId, branchId, ownerId, dateFrom, dateTo } = query;
  const scope = buildDealScope(user, { companyId, branchId });

  if (ownerId)  scope.ownerId = ownerId;
  if (dateFrom || dateTo) {
    scope.createdAt = {};
    if (dateFrom) scope.createdAt.gte = new Date(dateFrom);
    if (dateTo)   scope.createdAt.lte = new Date(dateTo);
  }

  const stages = await prisma.pipelineStage.findMany({ orderBy: { order: 'asc' } });

  // 1. Aggregate totals per stage — one fast query
  const summaries = await prisma.deal.groupBy({
    by: ['stageId'],
    where: scope,
    _sum:   { value: true },
    _count: { id: true },
  });

  const summaryMap = Object.fromEntries(
    summaries.map((s) => [s.stageId, { totalValue: s._sum.value || 0, count: s._count.id }])
  );

  // 2. Fetch first 20 cards per stage in parallel
  const cardsByStage = await Promise.all(
    stages.map((stage) =>
      prisma.deal.findMany({
        where: { ...scope, stageId: stage.id },
        take: 20,
        orderBy: { updatedAt: 'desc' },
        include: DEAL_INCLUDE,
      })
    )
  );

  const columns = stages.map((stage, i) => ({
    stage,
    totalValue: summaryMap[stage.id]?.totalValue ?? 0,
    count:      summaryMap[stage.id]?.count      ?? 0,
    deals:      cardsByStage[i],
  }));

  return columns;
}

// GET /api/deals — flat paginated list (for reports)
export async function listDeals(user, query) {
  const {
    page = 1, limit = 20,
    companyId, branchId, ownerId, stageId,
    dateFrom, dateTo,
  } = query;

  const skip  = (Math.max(1, +page) - 1) * Math.min(100, +limit);
  const take  = Math.min(100, +limit);
  const scope = buildDealScope(user, { companyId, branchId });

  if (ownerId)  scope.ownerId  = ownerId;
  if (stageId)  scope.stageId  = stageId;
  if (dateFrom || dateTo) {
    scope.createdAt = {};
    if (dateFrom) scope.createdAt.gte = new Date(dateFrom);
    if (dateTo)   scope.createdAt.lte = new Date(dateTo);
  }

  const [items, total] = await Promise.all([
    prisma.deal.findMany({ where: scope, skip, take, orderBy: { createdAt: 'desc' }, include: DEAL_INCLUDE }),
    prisma.deal.count({ where: scope }),
  ]);

  return { data: items, total, page: +page, limit: take, pages: Math.ceil(total / take) };
}

export async function getDeal(user, id) {
  const deal = await prisma.deal.findUnique({ where: { id }, include: DEAL_INCLUDE });
  if (!deal) return null;
  if (user.role === 'SALES'   && deal.ownerId !== user.id)             return null;
  if (user.role === 'MANAGER' && deal.lead?.branch?.id !== user.branchId &&
      deal.contact?.branchId !== user.branchId)                        return null;
  return deal;
}

export async function createDeal(user, data) {
  const { contactId, leadId, stageId, value = 0, expectedCloseDate, ownerId, invoiceRef } = data;
  if (!stageId) throw { statusCode: 400, message: 'stageId is required' };
  if (!contactId && !leadId) throw { statusCode: 400, message: 'contactId or leadId is required' };

  // Derive contactId from lead if not provided
  let resolvedContactId = contactId || null;
  if (!resolvedContactId && leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { contactId: true } });
    resolvedContactId = lead?.contactId || null;
  }

  const deal = await prisma.deal.create({
    data: {
      contactId:         resolvedContactId,
      leadId:            leadId   || null,
      stageId,
      value:             +value,
      expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
      ownerId:           ownerId || user.id,
      invoiceRef:        invoiceRef || null,
    },
    include: DEAL_INCLUDE,
  });

  if (leadId) {
    await prisma.activity.create({
      data: {
        leadId,
        userId: user.id,
        type: 'STAGE_CHANGE',
        description: `Deal created in stage "${deal.stage.name}" by ${user.name}`,
      },
    });
  }

  await syncLead(leadId, deal.stage, null, deal.invoiceRef);
  return deal;
}

export async function updateDeal(user, id, data) {
  const existing = await getDeal(user, id);
  if (!existing) throw { statusCode: 404, message: 'Deal not found' };

  const { value, expectedCloseDate, dueDate, ownerId, invoiceRef } = data;

  return prisma.deal.update({
    where: { id },
    data: {
      ...(value             !== undefined && { value: +value }),
      ...(expectedCloseDate !== undefined && { expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null }),
      ...(dueDate           !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(ownerId           !== undefined && { ownerId }),
      ...(invoiceRef        !== undefined && { invoiceRef }),
    },
    include: DEAL_INCLUDE,
  });
}

export async function moveStage(user, id, { stageId, lostReasonId }) {
  const existing = await getDeal(user, id);
  if (!existing) throw { statusCode: 404, message: 'Deal not found' };

  const stage = await prisma.pipelineStage.findUnique({ where: { id: stageId } });
  if (!stage) throw { statusCode: 404, message: 'Stage not found' };

  if (stage.name === 'Lost' && !lostReasonId) {
    throw { statusCode: 400, message: 'lostReasonId is required when moving to Lost' };
  }

  const deal = await prisma.deal.update({
    where: { id },
    data: {
      stageId,
      ...(stage.name === 'Lost' && lostReasonId && { lostReasonId }),
    },
    include: DEAL_INCLUDE,
  });

  if (existing.leadId) {
    await prisma.activity.create({
      data: {
        leadId: existing.leadId,
        userId: user.id,
        type:   'STAGE_CHANGE',
        description: `Deal moved from "${existing.stage.name}" to "${stage.name}" by ${user.name}`,
      },
    });
  }

  await syncLead(existing.leadId, stage, lostReasonId, existing.invoiceRef);
  return deal;
}

export async function deleteDeal(user, id) {
  const existing = await getDeal(user, id);
  if (!existing) throw { statusCode: 404, message: 'Deal not found' };
  return prisma.deal.delete({ where: { id } });
}
