import prisma from '../utils/prisma.js';

const DAY = 86_400_000;
const parseDay = (s) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00.000Z`) : null);

// Queues a feedback call for a lead. Safe to call repeatedly: the same lead/kind/ref is only queued once.
// `db` is either the prisma client or a transaction client.
export async function ensureFeedbackRequest(db, { leadId, kind, refNo }) {
  const ref = refNo || null;
  const existing = await db.feedbackRequest.findFirst({ where: { leadId, kind, refNo: ref }, select: { id: true } });
  if (existing) return existing;
  return db.feedbackRequest.create({ data: { leadId, kind, refNo: ref } });
}

const INCLUDE = {
  lead: { select: { id: true, leadNo: true, firstName: true, lastName: true, phone: true, assignedToId: true, assignedTo: { select: { name: true } } } },
  feedback: { select: { rating: true, comment: true } },
  completedBy: { select: { name: true } },
};

function toRow(r) {
  return {
    id:          r.id,
    kind:        r.kind,
    refNo:       r.refNo || (r.kind === 'REGISTRATION' ? 'NEW REGISTRATION' : 'PURCHASE'),
    status:      r.status,
    customer:    `${r.lead.firstName} ${r.lead.lastName}`.trim(),
    phone:       r.lead.phone || '',
    leadId:      r.lead.id,
    leadNo:      r.lead.leadNo,
    assignedTo:  r.lead.assignedTo?.name || '',
    createdAt:   r.createdAt.toISOString(),
    attempts:    r.attempts,
    lastAttemptAt:   r.lastAttemptAt ? r.lastAttemptAt.toISOString() : null,
    lastAttemptNote: r.lastAttemptNote || '',
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    completedBy: r.completedBy?.name || '',
    rating:      r.feedback?.rating ?? null,
    comment:     r.feedback?.comment || '',
  };
}

// Admin sees everything, a manager their branch, sales staff only their own customers
function scopeParts(user) {
  if (user.role === 'MANAGER') return [{ lead: { branchId: user.branchId } }];
  if (user.role === 'SALES')   return [{ lead: { assignedToId: user.id } }];
  return [];
}

export async function listRequests(user, q) {
  const status = q.status === 'COMPLETED' ? 'COMPLETED' : 'PENDING';
  const parts = [{ status }, ...scopeParts(user)];

  const from = parseDay(q.dateFrom);
  const to   = parseDay(q.dateTo);
  if (from || to) {
    const r = {};
    if (from) r.gte = from;
    if (to)   r.lte = new Date(to.getTime() + DAY - 1);
    parts.push({ [status === 'PENDING' ? 'createdAt' : 'completedAt']: r });
  }
  for (const term of (q.search || '').trim().split(/\s+/).filter(Boolean)) {
    parts.push({ OR: [
      { lead: { firstName: { contains: term, mode: 'insensitive' } } },
      { lead: { lastName:  { contains: term, mode: 'insensitive' } } },
      { lead: { phone:     { contains: term } } },
      { refNo:             { contains: term, mode: 'insensitive' } },
    ] });
  }

  const where = { AND: parts };
  const take  = Math.min(100, Math.max(1, +q.limit || 12));
  const page  = Math.max(1, +q.page || 1);

  const [items, total] = await Promise.all([
    prisma.feedbackRequest.findMany({
      where, skip: (page - 1) * take, take, include: INCLUDE,
      orderBy: status === 'PENDING' ? { createdAt: 'desc' } : { completedAt: 'desc' },
    }),
    prisma.feedbackRequest.count({ where }),
  ]);
  return { data: items.map(toRow), total, page, limit: take, pages: Math.ceil(total / take) };
}

async function findAccessible(user, id) {
  return prisma.feedbackRequest.findFirst({ where: { AND: [{ id }, ...scopeParts(user)] }, include: INCLUDE });
}

// The call was answered: save the feedback and move the request to history
export async function completeRequest(user, id, data) {
  const rating = Number.parseInt(data.rating, 10);
  if (!(rating >= 1 && rating <= 5)) throw { statusCode: 400, message: 'rating must be a whole number from 1 to 5' };
  const comment = data.comment?.trim() || null;
  if (comment && comment.length > 1000) throw { statusCode: 400, message: 'comment must be 1000 characters or fewer' };

  const req = await findAccessible(user, id);
  if (!req) throw { statusCode: 404, message: 'Feedback request not found' };

  const done = await prisma.$transaction(async (tx) => {
    // Claim it first so two people can't complete the same call
    const claimed = await tx.feedbackRequest.updateMany({
      where: { id, status: 'PENDING' },
      data:  { status: 'COMPLETED', completedAt: new Date(), completedById: user.id },
    });
    if (claimed.count === 0) throw { statusCode: 409, message: 'This feedback call was already completed' };

    const feedback = await tx.feedback.create({
      data: {
        leadId: req.leadId, rating, comment,
        invoiceRef: req.kind === 'PURCHASE' ? req.refNo : null,
        salesmanId: req.lead.assignedToId || null,
      },
    });
    await tx.feedbackRequest.update({ where: { id }, data: { feedbackId: feedback.id } });
    await tx.activity.create({
      data: { leadId: req.leadId, userId: user.id, type: 'CALL', description: `Feedback call by ${user.name}: rated ${rating}/5${comment ? ` — ${comment}` : ''}` },
    });
    return tx.feedbackRequest.findUnique({ where: { id }, include: INCLUDE });
  });
  return toRow(done);
}

// The customer didn't answer / asked to be called later: keep it pending, but log the attempt
export async function logAttempt(user, id, data) {
  const note = data.note?.trim() || null;
  if (note && note.length > 500) throw { statusCode: 400, message: 'note must be 500 characters or fewer' };

  const req = await findAccessible(user, id);
  if (!req) throw { statusCode: 404, message: 'Feedback request not found' };

  const updated = await prisma.feedbackRequest.updateMany({
    where: { id, status: 'PENDING' },
    data:  { attempts: { increment: 1 }, lastAttemptAt: new Date(), lastAttemptNote: note },
  });
  if (updated.count === 0) throw { statusCode: 409, message: 'This feedback call was already completed' };

  await prisma.activity.create({
    data: { leadId: req.leadId, userId: user.id, type: 'CALL', description: `Feedback call attempted by ${user.name}${note ? `: ${note}` : ''}` },
  });
  return toRow(await prisma.feedbackRequest.findUnique({ where: { id }, include: INCLUDE }));
}
