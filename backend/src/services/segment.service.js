import prisma from '../utils/prisma.js';

const DAY = 86_400_000;
const wonStage = { name: { equals: 'Won', mode: 'insensitive' } };

// ── Dashboard stats ──────────────────────────────────────

export async function dashboardStats(user) {
  const bf = user.role === 'MANAGER' ? { branchId: user.branchId } : {};
  const cutoff180 = new Date(Date.now() - 180 * DAY);

  const [total, totalSegments, assigned, vip, inactive, noPurchase] = await Promise.all([
    prisma.contact.count({ where: { isActive: true, ...bf } }),
    prisma.segment.count({ where: { isActive: true } }),
    prisma.contact.count({ where: { isActive: true, ...bf, assignedToId: { not: null } } }),
    prisma.contact.count({
      where: {
        isActive: true, ...bf,
        OR: [
          { type: { name: { equals: 'VIP', mode: 'insensitive' } } },
          { deals: { some: { stage: wonStage, value: { gte: 100000 } } } },
        ],
      },
    }),
    prisma.contact.count({
      where: {
        isActive: true, ...bf,
        deals: { some: { stage: wonStage, updatedAt: { lt: cutoff180 } } },
        NOT:  { deals: { some: { stage: wonStage, updatedAt: { gte: cutoff180 } } } },
      },
    }),
    prisma.contact.count({ where: { isActive: true, ...bf, deals: { none: { stage: wonStage } } } }),
  ]);

  return {
    total,
    totalSegments,
    assignedPatrons: assigned,
    unassigned: total - assigned,
    highValueVips: vip,
    inactive: inactive + noPurchase,
  };
}

// ── Live estimate ────────────────────────────────────────

export async function evaluateCriteria(user, criteria, branchId) {
  const bf = branchId ? { branchId } : (user.role === 'MANAGER' ? { branchId: user.branchId } : {});
  const now = Date.now();
  const parts = [{ isActive: true, ...bf }];

  if (Number(criteria.minLifetimeValue) > 0) {
    parts.push({ deals: { some: { stage: wonStage } } });
  }
  if (Number(criteria.minPurchaseVisits) > 0) {
    parts.push({ visits: { some: {} } });
  }
  if (criteria.customerType && criteria.customerType !== 'any') {
    parts.push({ type: { name: { equals: criteria.customerType, mode: 'insensitive' } } });
  }
  if (Number(criteria.maxRecencyDays) > 0) {
    const since = new Date(now - Number(criteria.maxRecencyDays) * DAY);
    parts.push({ deals: { some: { stage: wonStage, updatedAt: { gte: since } } } });
  }
  if (Number(criteria.minInactiveDays) > 0) {
    const before = new Date(now - Number(criteria.minInactiveDays) * DAY);
    parts.push({ deals: { none: { stage: wonStage, updatedAt: { gte: before } } } });
  }
  if (criteria.isBridal === 'yes') {
    parts.push({ anniversaryDate: { not: null } });
  }

  const where = parts.length > 1
    ? (criteria.matchAll !== false ? { AND: parts } : { AND: [parts[0]], OR: parts.slice(1) })
    : parts[0];

  const count = await prisma.contact.count({ where });
  return { count };
}

// ── CRUD ─────────────────────────────────────────────────

export async function listSegments(user) {
  const segments = await prisma.segment.findMany({
    where: { isActive: true },
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });
  return segments;
}

export async function createSegment(user, data) {
  const { name, description, branchId, criteria, matchAll } = data;
  if (!name?.trim()) throw { statusCode: 400, message: 'name is required' };
  const { count } = await evaluateCriteria(user, criteria || {}, branchId || null);
  return prisma.segment.create({
    data: {
      name:        name.trim(),
      description: description?.trim() || null,
      branchId:    branchId || null,
      criteria:    criteria || {},
      matchAll:    matchAll !== false,
      memberCount: count,
      createdById: user.id,
    },
    include: { createdBy: { select: { name: true } } },
  });
}

export async function deleteSegment(user, id) {
  const seg = await prisma.segment.findFirst({ where: { id, ...(user.role !== 'ADMIN' ? { createdById: user.id } : {}) } });
  if (!seg) throw { statusCode: 404, message: 'Segment not found' };
  return prisma.segment.update({ where: { id }, data: { isActive: false } });
}
