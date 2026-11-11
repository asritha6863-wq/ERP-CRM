import prisma from '../utils/prisma.js';
import { getScopeFilter } from '../middleware/scope.middleware.js';

const DEAL_INCLUDE = {
  stage:      { select: { id: true, name: true, order: true } },
  lostReason: { select: { id: true, name: true } },
  owner:      { select: { id: true, name: true } },
  lead: {
    select: {
      id: true, firstName: true, lastName: true, phone: true,
      branch: { select: { id: true, name: true } },
    },
  },
};

export async function listDeals(user, query) {
  const { ownerId, branchId, dateFrom, dateTo } = query;

  // For kanban we return all deals grouped by stage
  const scope = getScopeFilter(user);

  // Adapt scope: for deals, MANAGER filter goes through lead.branch, SALES through deal.owner
  const where = {};
  if (user.role === 'MANAGER' && user.branchId) {
    where.lead = { branchId: user.branchId };
  } else if (user.role === 'SALES') {
    where.ownerId = user.id;
  }

  if (ownerId)  where.ownerId = ownerId;
  if (branchId) where.lead    = { ...(where.lead || {}), branchId };
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo)   where.createdAt.lte = new Date(dateTo);
  }

  const stages = await prisma.pipelineStage.findMany({
    orderBy: { order: 'asc' },
  });

  const deals = await prisma.deal.findMany({
    where,
    include: DEAL_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });

  // Group deals by stageId, attach total value
  const columns = stages.map((stage) => {
    const stageDeals = deals.filter((d) => d.stageId === stage.id);
    const totalValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    return { stage, deals: stageDeals, totalValue };
  });

  return columns;
}

export async function getDeal(user, id) {
  const deal = await prisma.deal.findUnique({ where: { id }, include: DEAL_INCLUDE });
  if (!deal) return null;
  // Scope check
  if (user.role === 'SALES' && deal.ownerId !== user.id) return null;
  if (user.role === 'MANAGER' && deal.lead?.branch?.id !== user.branchId) return null;
  return deal;
}

export async function createDeal(user, data) {
  const { leadId, stageId, value = 0, expectedCloseDate, ownerId } = data;
  if (!leadId)  throw { statusCode: 400, message: 'leadId is required' };
  if (!stageId) throw { statusCode: 400, message: 'stageId is required' };

  const deal = await prisma.deal.create({
    data: {
      leadId,
      stageId,
      value:            +value,
      expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
      ownerId:          ownerId || user.id,
    },
    include: DEAL_INCLUDE,
  });

  await prisma.activity.create({
    data: {
      leadId,
      userId: user.id,
      type: 'STAGE_CHANGE',
      description: `Deal created in stage "${deal.stage.name}" by ${user.name}`,
    },
  });

  return deal;
}

export async function updateDeal(user, id, data) {
  const existing = await getDeal(user, id);
  if (!existing) throw { statusCode: 404, message: 'Deal not found' };

  const { value, expectedCloseDate, ownerId } = data;

  return prisma.deal.update({
    where: { id },
    data: {
      ...(value             !== undefined && { value: +value }),
      ...(expectedCloseDate !== undefined && { expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null }),
      ...(ownerId           !== undefined && { ownerId }),
    },
    include: DEAL_INCLUDE,
  });
}

export async function moveStage(user, id, { stageId, lostReasonId, wonDate }) {
  const existing = await getDeal(user, id);
  if (!existing) throw { statusCode: 404, message: 'Deal not found' };

  const stage = await prisma.pipelineStage.findUnique({ where: { id: stageId } });
  if (!stage) throw { statusCode: 404, message: 'Stage not found' };

  // Enforce lost reason when moving to Lost
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

  // Record stage change activity on the associated lead
  await prisma.activity.create({
    data: {
      leadId: existing.leadId,
      userId: user.id,
      type:   'STAGE_CHANGE',
      description: `Deal moved from "${existing.stage.name}" to "${stage.name}" by ${user.name}`,
    },
  });

  return deal;
}

export async function deleteDeal(user, id) {
  const existing = await getDeal(user, id);
  if (!existing) throw { statusCode: 404, message: 'Deal not found' };
  return prisma.deal.delete({ where: { id } });
}
