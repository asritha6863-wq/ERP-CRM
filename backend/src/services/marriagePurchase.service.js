import prisma from '../utils/prisma.js';

const DAY = 86_400_000;
const parseDay = (s) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
  ? new Date(`${s}T00:00:00.000Z`) : null);
const ymd = (d) => (d ? d.toISOString().slice(0, 10) : '');
const wonStage = { name: { equals: 'Won', mode: 'insensitive' } };

function scope(user) {
  if (user.role === 'ADMIN')   return {};
  if (user.role === 'MANAGER') return { branchId: user.branchId };
  return { assignedToId: user.id };
}

function buildWhere(user, q) {
  const sc = scope(user);
  const parts = [
    { isActive: true, ...sc },
    { OR: [{ marriageDate: { not: null } }, { leads: { some: { brideGroom: { not: null } } } }] },
  ];
  if (q.marriageFrom || q.marriageTo) {
    const r = {};
    if (parseDay(q.marriageFrom)) r.gte = parseDay(q.marriageFrom);
    if (parseDay(q.marriageTo))   r.lte = new Date(parseDay(q.marriageTo).getTime() + DAY - 1);
    parts.push({ marriageDate: r });
  }
  for (const term of (q.search || '').trim().split(/\s+/).filter(Boolean)) {
    parts.push({ OR: [
      { firstName: { contains: term, mode: 'insensitive' } },
      { lastName:  { contains: term, mode: 'insensitive' } },
      { phone:     { contains: term } },
      { deals: { some: { invoiceRef: { contains: term, mode: 'insensitive' } } } },
    ] });
  }
  return { AND: parts };
}

function computeStatus(marriageDate, attendeeId) {
  if (!attendeeId) return 'PENDING';
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  if (marriageDate && new Date(marriageDate) < today) return 'COMPLETED';
  return 'ASSIGNED';
}

function toRow(c) {
  const deal = c.deals?.[0];
  const a    = c.bridalAttendee;
  const status = computeStatus(c.marriageDate, a?.userId);
  return {
    id:           c.id,
    customer:     `${c.firstName} ${c.lastName}`.trim(),
    phone:        c.phone || '',
    marriageDate: ymd(c.marriageDate),
    invoiceRef:   deal?.invoiceRef || '',
    amount:       deal?.value      ?? 0,
    attendeeId:   a?.userId        || '',
    attendee:     a?.user?.name    || '',
    status,
    branch:       c.branch?.name   || '',
  };
}

const INCLUDE = {
  branch:        { select: { name: true } },
  bridalAttendee: { include: { user: { select: { id: true, name: true } } } },
  deals: {
    where:   { stage: wonStage },
    orderBy: { updatedAt: 'desc' },
    take:    1,
    select:  { value: true, invoiceRef: true },
  },
};

export async function listMarriagePurchases(user, q) {
  const where = buildWhere(user, q);
  const take  = Math.min(100, Math.max(1, +q.limit || 20));
  const page  = Math.max(1, +q.page || 1);

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({ where, skip: (page - 1) * take, take, orderBy: [{ marriageDate: 'asc' }, { firstName: 'asc' }], include: INCLUDE }),
    prisma.contact.count({ where }),
  ]);

  const rows = contacts.map(toRow);
  const statusFilter = q.status;
  const data = statusFilter ? rows.filter((r) => r.status === statusFilter) : rows;

  return {
    data, total, page, limit: take, pages: Math.ceil(total / take),
    summary: {
      total:     rows.filter((r) => r.amount > 0).length,
      pending:   rows.filter((r) => r.status === 'PENDING').length,
      completed: rows.filter((r) => r.status === 'COMPLETED').length,
    },
  };
}

export async function assignAttendee(user, contactId, data) {
  const { userId } = data;
  if (!userId) throw { statusCode: 400, message: 'userId is required' };

  const contact = await prisma.contact.findFirst({ where: { AND: [{ id: contactId }, scope(user)] } });
  if (!contact) throw { statusCode: 404, message: 'Contact not found' };

  const result = await prisma.bridalAttendee.upsert({
    where:  { contactId },
    update: { userId },
    create: { contactId, userId },
    include: { user: { select: { name: true } } },
  });

  return {
    contactId,
    attendeeId: result.userId,
    attendee:   result.user?.name || '',
    status:     computeStatus(contact.marriageDate, result.userId),
  };
}
