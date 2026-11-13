import prisma from '../utils/prisma.js';
import { buildWhere, ROW_INCLUDE, outcomeOf } from './leadReport.service.js';

const wonStage = { name: { equals: 'Won', mode: 'insensitive' } };
const ymd = (d) => (d ? d.toISOString().slice(0, 10) : '');
const sumValues = (deals) => deals.reduce((s, d) => s + d.value, 0);

// Lead view: one row per lead. Customer view: one row per customer (top 100 by lead count).
export async function incentiveReport(user, q) {
  const where = await buildWhere(user, q);
  const view  = q.view === 'customer' ? 'customer' : 'lead';

  const [leads, expected, revenue] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.aggregate({ where, _sum: { expectedAmount: true } }),
    prisma.deal.aggregate({ where: { stage: wonStage, lead: where }, _sum: { value: true } }),
  ]);
  const summary = { leads, expected: expected._sum.expectedAmount || 0, revenue: revenue._sum.value || 0 };

  if (view === 'lead') return { view, summary, ...(await leadView(where, q)) };
  return { view, summary, ...(await customerView(where)) };
}

async function leadView(where, q) {
  const take = Math.min(100, Math.max(1, +q.limit || 20));
  const page = Math.max(1, +q.page || 1);

  const [items, total] = await Promise.all([
    prisma.lead.findMany({ where, skip: (page - 1) * take, take, orderBy: { createdAt: 'desc' }, include: ROW_INCLUDE }),
    prisma.lead.count({ where }),
  ]);

  // How many leads each of these customers has overall (for the Single / Multi lead tag)
  const contactIds = [...new Set(items.map((l) => l.contactId).filter(Boolean))];
  const perContact = contactIds.length
    ? await prisma.lead.groupBy({ by: ['contactId'], where: { contactId: { in: contactIds } }, _count: { _all: true } })
    : [];
  const counts = new Map(perContact.map((g) => [g.contactId, g._count._all]));

  return {
    data: items.map((l) => ({
      id:             l.id,
      leadNo:         l.leadNo,
      customer:       `${l.firstName} ${l.lastName}`.trim(),
      phone:          l.phone || '',
      area:           l.area || '',
      createdAt:      ymd(l.createdAt),
      owner:          l.createdBy?.name || '',
      ownerRole:      l.createdBy?.role || '',
      assignedTo:     l.assignedTo?.name || '',
      stage:          l.stage?.name || '',
      status:         outcomeOf(l),
      source:         l.source?.name || '',
      channel:        l.channel === 'INSTORE' ? 'Instore' : 'Outdoor',
      expectedAmount: l.expectedAmount ?? null,
      actualRevenue:  l.isWon ? sumValues(l.deals) : null,
      customerLeads:  l.contactId ? counts.get(l.contactId) || 1 : 1,
    })),
    total, page, limit: take, pages: Math.ceil(total / take),
  };
}

async function customerView(where) {
  const base = { AND: [where, { contactId: { not: null } }] };

  const top = await prisma.lead.groupBy({
    by: ['contactId'], where: base,
    _count: { _all: true }, _sum: { expectedAmount: true },
    orderBy: { _count: { contactId: 'desc' } }, take: 100,
  });
  const ids = top.map((t) => t.contactId);
  if (!ids.length) return { data: [], total: 0, page: 1, limit: 100, pages: 1 };

  const inIds = { contactId: { in: ids } };
  const [contacts, wonLeads, lostLeads, revenue] = await Promise.all([
    prisma.contact.findMany({ where: { id: { in: ids } }, select: { id: true, firstName: true, lastName: true, phone: true } }),
    prisma.lead.groupBy({ by: ['contactId'], where: { AND: [base, inIds, { isWon: true }] },  _count: { _all: true } }),
    prisma.lead.groupBy({ by: ['contactId'], where: { AND: [base, inIds, { isLost: true }] }, _count: { _all: true } }),
    prisma.deal.groupBy({ by: ['contactId'], where: { stage: wonStage, ...inIds, lead: where }, _sum: { value: true } }),
  ]);
  const byId  = new Map(contacts.map((c) => [c.id, c]));
  const won   = new Map(wonLeads.map((g) => [g.contactId, g._count._all]));
  const lost  = new Map(lostLeads.map((g) => [g.contactId, g._count._all]));
  const money = new Map(revenue.map((g) => [g.contactId, g._sum.value || 0]));

  return {
    data: top.map((t) => {
      const c = byId.get(t.contactId);
      return {
        contactId: t.contactId,
        customer:  c ? `${c.firstName} ${c.lastName}`.trim() : 'Unknown',
        phone:     c?.phone || '',
        leads:     t._count._all,
        won:       won.get(t.contactId) || 0,
        lost:      lost.get(t.contactId) || 0,
        expectedAmount: t._sum.expectedAmount || 0,
        actualRevenue:  money.get(t.contactId) || 0,
      };
    }),
    total: top.length, page: 1, limit: 100, pages: 1,
  };
}
