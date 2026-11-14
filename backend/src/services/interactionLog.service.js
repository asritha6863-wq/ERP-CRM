import prisma from '../utils/prisma.js';

const CHANNELS = ['CALL', 'WHATSAPP', 'EMAIL', 'SMS', 'IN_PERSON', 'OTHER'];
const DAY = 86_400_000;
const parseDay = (s) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00.000Z`) : null);
const ymd = (d) => (d ? d.toISOString().slice(0, 10) : '');

const INCLUDE = {
  contact:  { select: { id: true, firstName: true, lastName: true, phone: true } },
  lead:     { select: { id: true, leadNo: true, firstName: true, lastName: true, phone: true } },
  loggedBy: { select: { id: true, name: true } },
};

function scope(user) {
  if (user.role === 'ADMIN')   return {};
  if (user.role === 'MANAGER') return { OR: [{ contact: { branchId: user.branchId } }, { lead: { branchId: user.branchId } }] };
  return { loggedById: user.id };
}

function toRow(l) {
  return {
    id:        l.id,
    customer:  l.contact ? `${l.contact.firstName} ${l.contact.lastName}`.trim() : (l.lead ? `${l.lead.firstName} ${l.lead.lastName}`.trim() : 'Unknown'),
    phone:     l.contact?.phone || l.lead?.phone || '',
    contactId: l.contactId || '',
    leadId:    l.leadId    || '',
    channel:   l.channel,
    notes:     l.notes || '',
    staff:     l.loggedBy?.name || '',
    staffId:   l.loggedById || '',
    loggedAt:  ymd(l.loggedAt),
  };
}

export async function listLogs(user, q) {
  const sc  = scope(user);
  const parts = [sc];
  const from = parseDay(q.dateFrom); const to = parseDay(q.dateTo);
  if (from || to) {
    const r = {};
    if (from) r.gte = from;
    if (to)   r.lte = new Date(to.getTime() + DAY - 1);
    parts.push({ loggedAt: r });
  }
  if (q.channel && CHANNELS.includes(q.channel)) parts.push({ channel: q.channel });
  for (const term of (q.search || '').trim().split(/\s+/).filter(Boolean)) {
    parts.push({ OR: [
      { notes:    { contains: term, mode: 'insensitive' } },
      { contact:  { firstName: { contains: term, mode: 'insensitive' } } },
      { contact:  { lastName:  { contains: term, mode: 'insensitive' } } },
      { contact:  { phone:     { contains: term } } },
      { lead:     { firstName: { contains: term, mode: 'insensitive' } } },
      { lead:     { lastName:  { contains: term, mode: 'insensitive' } } },
    ] });
  }

  const where = { AND: parts.filter((p) => Object.keys(p).length > 0) };
  const take  = Math.min(100, Math.max(1, +q.limit || 12));
  const page  = Math.max(1, +q.page || 1);

  const [items, total] = await Promise.all([
    prisma.interactionLog.findMany({ where, skip: (page - 1) * take, take, orderBy: { loggedAt: 'desc' }, include: INCLUDE }),
    prisma.interactionLog.count({ where }),
  ]);
  return { data: items.map(toRow), total, page, limit: take, pages: Math.ceil(total / take) };
}

export async function createLog(user, data) {
  const { contactId, leadId, channel, notes, loggedById } = data;
  if (!contactId && !leadId) throw { statusCode: 400, message: 'Link the interaction to a customer or a lead' };
  if (!CHANNELS.includes(channel)) throw { statusCode: 400, message: `channel must be one of: ${CHANNELS.join(', ')}` };
  if (!notes?.trim()) throw { statusCode: 400, message: 'notes are required' };

  const log = await prisma.interactionLog.create({
    data: {
      contactId:  contactId  || null,
      leadId:     leadId     || null,
      channel,
      notes:      notes.trim(),
      loggedById: loggedById || user.id,
    },
    include: INCLUDE,
  });
  return toRow(log);
}
