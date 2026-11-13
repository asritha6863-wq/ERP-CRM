import prisma from '../utils/prisma.js';

const DAY = 86_400_000;
const EXPORT_CAP = 200_000;
const BATCH = 2000;
const insensitive = (name) => ({ equals: name, mode: 'insensitive' });
const cancelledWhere = { status: { is: { name: insensitive('Cancelled') } } };

const parseDay = (s) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00.000Z`) : null);
const endOfDay = (s) => { const d = parseDay(s); return d ? new Date(d.getTime() + DAY - 1) : null; };
const ymd = (d) => (d ? d.toISOString().slice(0, 10) : '');

const ROW_INCLUDE = {
  branch:     { select: { name: true } },
  source:     { select: { name: true } },
  stage:      { select: { name: true } },
  status:     { select: { name: true } },
  createdBy:  { select: { name: true } },
  assignedTo: { select: { name: true } },
};

// Export / table column catalogue — the keys are shared with the frontend
export const COLUMNS = [
  ['name', 'Customer'], ['phone', 'Phone'], ['branch', 'Branch'], ['source', 'Lead Source'],
  ['channel', 'Channel'], ['stage', 'Stage'], ['status', 'Status'], ['leadStatus', 'Lead Status'],
  ['priority', 'Priority'], ['createdAt', 'Created'], ['dueDate', 'Due Date'],
  ['marriageDate', 'Marriage Date'], ['owner', 'Owner'], ['assignedTo', 'Assigned To'],
  ['expectedWeight', 'Expected Weight (g)'], ['expectedAmount', 'Expected Amount'],
  ['dnf', 'Date Not Fixed'], ['lossReason', 'Loss Reason'],
];

function outcomeOf(l) {
  if (l.isWon) return 'WON';
  if (l.isLost) return 'LOST';
  if (/^cancelled$/i.test(l.status?.name || '')) return 'CANCELLED';
  return 'PENDING';
}

function toRow(l, firstStageName) {
  return {
    id:             l.id,
    name:           `${l.firstName} ${l.lastName}`.trim(),
    phone:          l.phone || '',
    branch:         l.branch?.name || '',
    source:         l.source?.name || '',
    channel:        l.channel === 'INSTORE' ? 'Instore' : 'Outdoor',
    stage:          l.stage?.name || firstStageName || '',
    status:         outcomeOf(l),
    leadStatus:     l.status?.name || '',
    priority:       l.priority,
    createdAt:      ymd(l.createdAt),
    dueDate:        ymd(l.dueDate),
    marriageDate:   ymd(l.marriageDate),
    owner:          l.createdBy?.name || '',
    assignedTo:     l.assignedTo?.name || '',
    expectedWeight: l.expectedWeight ?? '',
    expectedAmount: l.expectedAmount ?? '',
    dnf:            l.dnf ? 'Yes' : 'No',
    lossReason:     l.lossReason || '',
  };
}

async function firstStage() {
  return prisma.pipelineStage.findFirst({ where: { isActive: true }, orderBy: { order: 'asc' }, select: { id: true, name: true } });
}

// Builds the Prisma where for the current user's scope plus every report filter
async function buildWhere(user, q) {
  const parts = [];

  if (user.role === 'SALES') parts.push({ assignedToId: user.id });
  else if (user.role === 'MANAGER') parts.push({ branchId: user.branchId });
  else if (q.branchId) parts.push({ branchId: q.branchId });

  // Every word typed must appear in the first or last name
  for (const term of (q.name || '').trim().split(/\s+/).filter(Boolean)) {
    parts.push({ OR: [
      { firstName: { contains: term, mode: 'insensitive' } },
      { lastName:  { contains: term, mode: 'insensitive' } },
    ] });
  }
  if (q.phone?.trim()) parts.push({ phone: { contains: q.phone.trim() } });

  const range = (field, from, to) => {
    const r = {};
    if (parseDay(from)) r.gte = parseDay(from);
    if (endOfDay(to))   r.lte = endOfDay(to);
    if (Object.keys(r).length) parts.push({ [field]: r });
  };
  range('marriageDate', q.marriageFrom, q.marriageTo);
  range('createdAt',    q.createdFrom,  q.createdTo);

  if (q.stageId) {
    const first = await firstStage();
    // Leads with no deal yet sit in the first stage
    parts.push(first && q.stageId === first.id
      ? { OR: [{ stageId: first.id }, { stageId: null }] }
      : { stageId: q.stageId });
  }

  switch ((q.status || '').toUpperCase()) {
    case 'WON':       parts.push({ isWon: true }); break;
    case 'LOST':      parts.push({ isLost: true }); break;
    case 'CANCELLED': parts.push(cancelledWhere); break;
    case 'PENDING':   parts.push({ isWon: false, isLost: false, NOT: cancelledWhere }); break;
    default: break;
  }

  if (q.sourceId)     parts.push({ sourceId: q.sourceId });
  if (q.createdById)  parts.push({ createdById: q.createdById });
  if (q.assignedToId) parts.push({ assignedToId: q.assignedToId });
  if (['LOW', 'MEDIUM', 'HIGH'].includes(q.priority))   parts.push({ priority: q.priority });
  if (['OUTDOOR', 'INSTORE'].includes(q.channel))       parts.push({ channel: q.channel });
  if (q.dnf === 'yes') parts.push({ dnf: true });
  if (q.dnf === 'no')  parts.push({ dnf: false });

  return parts.length ? { AND: parts } : {};
}

const and = (where, extra) => ({ AND: [where, extra] });

export async function leadSummary(user, q) {
  const where = await buildWhere(user, q);
  const first = await firstStage();

  const [total, won, lost, cancelled, pending, weight, byStage, byPriority, reasons, stages] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.count({ where: and(where, { isWon: true }) }),
    prisma.lead.count({ where: and(where, { isLost: true }) }),
    prisma.lead.count({ where: and(where, cancelledWhere) }),
    prisma.lead.count({ where: and(where, { isWon: false, isLost: false, NOT: cancelledWhere }) }),
    prisma.lead.aggregate({ where: and(where, { expectedWeight: { not: null } }), _avg: { expectedWeight: true } }),
    prisma.lead.groupBy({ by: ['stageId'], where, _count: { _all: true } }),
    prisma.lead.groupBy({ by: ['priority'], where, _count: { _all: true } }),
    prisma.lead.groupBy({
      by: ['lossReason'],
      where: and(where, { isLost: true, lossReason: { not: null } }),
      _count: { _all: true },
      orderBy: { _count: { lossReason: 'desc' } },
      take: 10,
    }),
    prisma.pipelineStage.findMany({ where: { isActive: true }, orderBy: { order: 'asc' }, select: { id: true, name: true } }),
  ]);

  // Leads without a stage are counted in the first stage
  const counts = new Map();
  for (const g of byStage) {
    const key = g.stageId ?? first?.id;
    counts.set(key, (counts.get(key) || 0) + g._count._all);
  }
  const stageRows = stages
    .map((s) => ({ name: s.name, count: counts.get(s.id) || 0 }))
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);

  const prio = Object.fromEntries(byPriority.map((p) => [p.priority, p._count._all]));

  return {
    totals: {
      total, won, lost, pending, cancelled,
      conversionRate: total > 0 ? (won / total) * 100 : 0,
      avgWeight: weight._avg.expectedWeight,
    },
    byStage: stageRows,
    byPriority: ['HIGH', 'MEDIUM', 'LOW'].map((k) => ({ name: k, count: prio[k] || 0 })),
    lossReasons: reasons.map((r) => ({ reason: r.lossReason, count: r._count._all })),
  };
}

export async function leadRows(user, q) {
  const where = await buildWhere(user, q);
  const take  = Math.min(100, Math.max(1, +q.limit || 20));
  const page  = Math.max(1, +q.page || 1);
  const first = await firstStage();

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where, skip: (page - 1) * take, take,
      orderBy: { createdAt: 'desc' }, include: ROW_INCLUDE,
    }),
    prisma.lead.count({ where }),
  ]);

  return { data: items.map((l) => toRow(l, first?.name)), total, page, limit: take, pages: Math.ceil(total / take) };
}

// Top customers by number of leads, under the same filters
export async function customerInsights(user, q) {
  const where = and(await buildWhere(user, q), { contactId: { not: null } });

  const top = await prisma.lead.groupBy({
    by: ['contactId'], where,
    _count: { _all: true }, _sum: { expectedAmount: true },
    orderBy: { _count: { contactId: 'desc' } }, take: 50,
  });
  const ids = top.map((t) => t.contactId);
  if (!ids.length) return { data: [] };

  const [contacts, wonBy, lostBy] = await Promise.all([
    prisma.contact.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true, phone: true } }),
    prisma.lead.groupBy({ by: ['contactId'], where: and(where, { isWon: true,  contactId: { in: ids } }), _count: { _all: true } }),
    prisma.lead.groupBy({ by: ['contactId'], where: and(where, { isLost: true, contactId: { in: ids } }), _count: { _all: true } }),
  ]);
  const byId   = new Map(contacts.map((c) => [c.id, c]));
  const wonMap = new Map(wonBy.map((w) => [w.contactId, w._count._all]));
  const lostMap = new Map(lostBy.map((w) => [w.contactId, w._count._all]));

  return {
    data: top.map((t) => {
      const c = byId.get(t.contactId);
      return {
        contactId: t.contactId,
        name:   c ? `${c.firstName} ${c.lastName}`.trim() : 'Unknown',
        phone:  c?.phone || '',
        leads:  t._count._all,
        won:    wonMap.get(t.contactId) || 0,
        lost:   lostMap.get(t.contactId) || 0,
        expectedAmount: t._sum.expectedAmount || 0,
      };
    }),
  };
}

// CSV cells starting with = + - @ would run as formulas in Excel, so neutralise them
const csvCell = (v) => {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export async function streamLeadCsv(user, q, res) {
  const where = await buildWhere(user, q);
  const first = await firstStage();

  const wanted = (q.columns || '').split(',').filter(Boolean);
  const cols = COLUMNS.filter(([key]) => wanted.includes(key));
  const chosen = cols.length ? cols : COLUMNS;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="lead-report.csv"');
  res.write('\ufeff' + chosen.map(([, h]) => csvCell(h)).join(',') + '\n');

  // Headers are already sent, so a failure here can't become a JSON error — mark the file instead
  let cursor; let written = 0;
  try {
    while (written < EXPORT_CAP) {
      const batch = await prisma.lead.findMany({
        where, take: BATCH, orderBy: { id: 'asc' }, include: ROW_INCLUDE,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      if (!batch.length) break;
      for (const l of batch) {
        const row = toRow(l, first?.name);
        res.write(chosen.map(([key]) => csvCell(row[key])).join(',') + '\n');
      }
      written += batch.length;
      cursor = batch[batch.length - 1].id;
      if (batch.length < BATCH) break;
    }
  } catch (err) {
    console.error('Lead CSV export failed:', err);
    res.write('"EXPORT INCOMPLETE - an error occurred, please retry"\n');
  } finally {
    res.end();
  }
}
