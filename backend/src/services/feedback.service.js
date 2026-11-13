import prisma from '../utils/prisma.js';

const DAY = 86_400_000;
const parseDay = (s) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00.000Z`) : null);
const ymd = (d) => (d ? d.toISOString().slice(0, 10) : '');

const INCLUDE = {
  lead: {
    select: {
      firstName: true, lastName: true, phone: true,
      assignedTo: { select: { name: true } },
      deals: {
        where: { stage: { name: { equals: 'Won', mode: 'insensitive' } } },
        orderBy: { updatedAt: 'desc' }, take: 1, select: { invoiceRef: true },
      },
    },
  },
  salesman: { select: { name: true } },
};

// Admin sees all; a manager sees their branch; sales staff see feedback on their own customers
function scopeParts(user) {
  if (user.role === 'MANAGER') return [{ lead: { branchId: user.branchId } }];
  if (user.role === 'SALES')   return [{ OR: [{ lead: { assignedToId: user.id } }, { salesmanId: user.id }] }];
  return [];
}

function buildWhere(user, q) {
  const parts = scopeParts(user);

  const from = parseDay(q.dateFrom);
  const to   = parseDay(q.dateTo);
  if (from || to) {
    const r = {};
    if (from) r.gte = from;
    if (to)   r.lte = new Date(to.getTime() + DAY - 1);
    parts.push({ createdAt: r });
  }

  const rating = Number.parseInt(q.rating, 10);
  if (rating >= 1 && rating <= 5) parts.push({ rating });

  if (q.salesmanId) {
    // Matches the name shown in the report: the recorded salesman, else the lead's assignee
    parts.push({ OR: [{ salesmanId: q.salesmanId }, { salesmanId: null, lead: { assignedToId: q.salesmanId } }] });
  }

  for (const term of (q.search || '').trim().split(/\s+/).filter(Boolean)) {
    parts.push({ OR: [
      { lead: { firstName: { contains: term, mode: 'insensitive' } } },
      { lead: { lastName:  { contains: term, mode: 'insensitive' } } },
      { lead: { phone:     { contains: term } } },
      { invoiceRef:        { contains: term, mode: 'insensitive' } },
    ] });
  }
  return parts.length ? { AND: parts } : {};
}

function toRow(f) {
  return {
    id:          f.id,
    date:        ymd(f.createdAt),
    customer:    `${f.lead.firstName} ${f.lead.lastName}`.trim(),
    phone:       f.lead.phone || '',
    invoiceRef:  f.invoiceRef || f.lead.deals?.[0]?.invoiceRef || '',
    rating:      f.rating,
    comment:     f.comment || '',
    salesman:    f.salesman?.name || f.lead.assignedTo?.name || '',
  };
}

export async function listFeedback(user, q) {
  const where = buildWhere(user, q);
  const take  = Math.min(100, Math.max(1, +q.limit || 10));
  const page  = Math.max(1, +q.page || 1);

  const [items, total, byRating] = await Promise.all([
    prisma.feedback.findMany({ where, skip: (page - 1) * take, take, orderBy: { createdAt: 'desc' }, include: INCLUDE }),
    prisma.feedback.count({ where }),
    prisma.feedback.groupBy({ by: ['rating'], where, _count: { _all: true } }),
  ]);

  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  for (const g of byRating) counts[g.rating] = g._count._all;
  const sum = Object.entries(counts).reduce((s, [r, c]) => s + Number(r) * c, 0);

  return {
    data: items.map(toRow), total, page, limit: take, pages: Math.ceil(total / take),
    summary: {
      total,
      average:       total > 0 ? sum / total : null,
      positiveRatio: total > 0 ? ((counts[4] + counts[5]) / total) * 100 : null,
      fiveStar:      counts[5],
      lowRatings:    counts[1] + counts[2],
      distribution:  [5, 4, 3, 2, 1].map((r) => ({ rating: r, count: counts[r] })),
    },
  };
}

export async function createFeedback(user, data) {
  const { leadId, comment, invoiceRef, salesmanId } = data;
  const rating = Number.parseInt(data.rating, 10);

  if (!leadId) throw { statusCode: 400, message: 'leadId is required' };
  if (!(rating >= 1 && rating <= 5)) throw { statusCode: 400, message: 'rating must be a whole number from 1 to 5' };

  // The lead must be one this user is allowed to see
  const leadScope = user.role === 'MANAGER' ? { branchId: user.branchId }
                  : user.role === 'SALES'   ? { assignedToId: user.id } : {};
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, ...leadScope },
    select: { id: true, assignedToId: true, deals: { where: { stage: { name: { equals: 'Won', mode: 'insensitive' } } }, take: 1, select: { invoiceRef: true } } },
  });
  if (!lead) throw { statusCode: 404, message: 'Lead not found' };

  const created = await prisma.feedback.create({
    data: {
      leadId,
      rating,
      comment:    comment?.trim() || null,
      invoiceRef: invoiceRef?.trim() || lead.deals[0]?.invoiceRef || null,
      salesmanId: salesmanId || lead.assignedToId || null,
    },
    include: INCLUDE,
  });
  return toRow(created);
}
