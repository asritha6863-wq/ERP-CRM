import prisma from '../utils/prisma.js';

const wonStage = { name: { equals: 'Won', mode: 'insensitive' } };
const ymd = (d) => (d ? d.toISOString().slice(0, 10) : '');

// Admin sees every customer, a manager their branch, sales staff only customers assigned to them
function scopeParts(user, branchId) {
  if (user.role === 'MANAGER') return [{ branchId: user.branchId }];
  if (user.role === 'SALES')   return [{ assignedToId: user.id }];
  return branchId ? [{ branchId }] : [];
}

const LIST_INCLUDE = {
  branch:     { select: { name: true } },
  type:       { select: { name: true } },
  assignedTo: { select: { name: true } },
};

export async function listCustomers(user, q) {
  const parts = [{ isActive: true }, ...scopeParts(user, q.branchId)];

  for (const term of (q.search || '').trim().split(/\s+/).filter(Boolean)) {
    parts.push({ OR: [
      { firstName: { contains: term, mode: 'insensitive' } },
      { lastName:  { contains: term, mode: 'insensitive' } },
      { phone:     { contains: term } },
      { email:     { contains: term, mode: 'insensitive' } },
      { city:      { contains: term, mode: 'insensitive' } },
    ] });
  }
  if (q.typeId) parts.push({ typeId: q.typeId });
  if (q.assignedToId && user.role !== 'SALES') parts.push({ assignedToId: q.assignedToId });

  const where = { AND: parts };
  const take  = Math.min(100, Math.max(1, +q.limit || 20));
  const page  = Math.max(1, +q.page || 1);

  const [items, total] = await Promise.all([
    prisma.contact.findMany({
      where, skip: (page - 1) * take, take, include: LIST_INCLUDE,
      orderBy: q.sort === 'name' ? [{ firstName: 'asc' }, { lastName: 'asc' }] : { createdAt: 'desc' },
    }),
    prisma.contact.count({ where }),
  ]);

  // Per-customer totals for just this page of customers
  const ids = items.map((c) => c.id);
  const inIds = { contactId: { in: ids } };
  const [leads, visits, purchases] = ids.length ? await Promise.all([
    prisma.lead.groupBy({ by: ['contactId'], where: inIds, _count: { _all: true } }),
    prisma.visit.groupBy({ by: ['contactId'], where: inIds, _count: { _all: true }, _max: { date: true } }),
    prisma.deal.groupBy({ by: ['contactId'], where: { ...inIds, stage: wonStage }, _count: { _all: true }, _sum: { value: true } }),
  ]) : [[], [], []];

  const L = new Map(leads.map((g) => [g.contactId, g._count._all]));
  const V = new Map(visits.map((g) => [g.contactId, g]));
  const P = new Map(purchases.map((g) => [g.contactId, g]));

  return {
    data: items.map((c) => ({
      id:         c.id,
      name:       `${c.firstName} ${c.lastName}`.trim(),
      phone:      c.phone || '',
      email:      c.email || '',
      city:       c.city || '',
      state:      c.state || '',
      branch:     c.branch?.name || '',
      type:       c.type?.name || '',
      assignedTo: c.assignedTo?.name || '',
      rating:     c.rating,
      createdAt:  ymd(c.createdAt),
      leads:      L.get(c.id) || 0,
      visits:     V.get(c.id)?._count._all || 0,
      lastVisit:  ymd(V.get(c.id)?._max.date),
      purchases:  P.get(c.id)?._count._all || 0,
      lifetimeValue: P.get(c.id)?._sum.value || 0,
    })),
    total, page, limit: take, pages: Math.ceil(total / take),
  };
}

async function findAccessible(user, id) {
  return prisma.contact.findFirst({
    where: { AND: [{ id, isActive: true }, ...scopeParts(user)] },
    include: { ...LIST_INCLUDE, company: { select: { name: true } } },
  });
}

export async function getCustomerProfile(user, id) {
  const contact = await findAccessible(user, id);
  if (!contact) throw { statusCode: 404, message: 'Customer not found' };

  const byLead = { lead: { contactId: id } };
  const [leads, visits, deals, feedback, reminders, activities] = await Promise.all([
    prisma.lead.findMany({
      where: { contactId: id }, orderBy: { createdAt: 'desc' }, take: 100,
      include: {
        source: { select: { name: true } }, status: { select: { name: true, color: true } },
        stage: { select: { name: true } }, assignedTo: { select: { name: true } },
      },
    }),
    prisma.visit.findMany({
      where: { contactId: id }, orderBy: { date: 'desc' }, take: 100,
      include: { user: { select: { name: true } }, lead: { select: { leadNo: true } } },
    }),
    prisma.deal.findMany({
      where: { contactId: id }, orderBy: { updatedAt: 'desc' }, take: 100,
      include: { stage: { select: { name: true } }, owner: { select: { name: true } } },
    }),
    prisma.feedback.findMany({
      where: byLead, orderBy: { createdAt: 'desc' }, take: 100,
      include: { salesman: { select: { name: true } } },
    }),
    prisma.reminder.findMany({
      where: { contactId: id }, orderBy: { dueDate: 'desc' }, take: 50,
      include: { assignedTo: { select: { name: true } } },
    }),
    prisma.activity.findMany({
      where: byLead, orderBy: { createdAt: 'desc' }, take: 50,
      include: { user: { select: { name: true } } },
    }),
  ]);

  const purchases = deals.filter((d) => /^won$/i.test(d.stage.name));
  const rated = feedback.filter((f) => f.rating);

  return {
    contact: {
      id: contact.id,
      firstName: contact.firstName, lastName: contact.lastName,
      phone: contact.phone, email: contact.email,
      company: contact.company?.name || '', branch: contact.branch?.name || '',
      type: contact.type?.name || '', assignedTo: contact.assignedTo?.name || '',
      rating: contact.rating,
      state: contact.state, city: contact.city, pincode: contact.pincode,
      dateOfBirth: ymd(contact.dateOfBirth), anniversaryDate: ymd(contact.anniversaryDate),
      createdAt: ymd(contact.createdAt),
      // raw ids so the edit form can be pre-filled
      companyId: contact.companyId, typeId: contact.typeId, branchId: contact.branchId, assignedToId: contact.assignedToId,
    },
    summary: {
      leads:  leads.length,
      visits: visits.length,
      purchases: purchases.length,
      lifetimeValue: purchases.reduce((s, d) => s + d.value, 0),
      averageRating: rated.length ? rated.reduce((s, f) => s + f.rating, 0) / rated.length : null,
    },
    leads: leads.map((l) => ({
      id: l.id, leadNo: l.leadNo, createdAt: ymd(l.createdAt), source: l.source?.name || '',
      stage: l.stage?.name || '', leadStatus: l.status?.name || '', assignedTo: l.assignedTo?.name || '',
      outcome: l.isWon ? 'WON' : l.isLost ? 'LOST' : 'PENDING', expectedAmount: l.expectedAmount, lossReason: l.lossReason || '',
    })),
    visits: visits.map((v) => ({
      id: v.id, date: ymd(v.date), notes: v.notes || '', staff: v.user?.name || '', leadNo: v.lead?.leadNo ?? null,
    })),
    purchases: purchases.map((d) => ({ id: d.id, date: ymd(d.updatedAt), value: d.value, invoiceRef: d.invoiceRef || '', owner: d.owner?.name || '' })),
    openDeals: deals.filter((d) => !/^(won|lost)$/i.test(d.stage.name))
      .map((d) => ({ id: d.id, stage: d.stage.name, value: d.value, owner: d.owner?.name || '' })),
    feedback: feedback.map((f) => ({ id: f.id, date: ymd(f.createdAt), rating: f.rating, comment: f.comment || '', invoiceRef: f.invoiceRef || '', salesman: f.salesman?.name || '' })),
    reminders: reminders.map((r) => ({ id: r.id, title: r.title, dueDate: ymd(r.dueDate), status: r.status, assignedTo: r.assignedTo?.name || '' })),
    timeline: activities.map((a) => ({ id: a.id, type: a.type, description: a.description, at: a.createdAt.toISOString(), by: a.user?.name || '' })),
  };
}

export async function logVisit(user, id, data) {
  const contact = await findAccessible(user, id);
  if (!contact) throw { statusCode: 404, message: 'Customer not found' };

  let date = new Date();
  if (data.date) {
    date = new Date(`${String(data.date).slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) throw { statusCode: 400, message: 'date is invalid' };
  }
  if (date.getTime() > Date.now() + 86_400_000) throw { statusCode: 400, message: 'A visit date cannot be in the future' };

  const notes = data.notes?.trim() || null;
  if (notes && notes.length > 1000) throw { statusCode: 400, message: 'notes must be 1000 characters or fewer' };

  let leadId = null;
  if (data.leadId) {
    const lead = await prisma.lead.findFirst({ where: { id: data.leadId, contactId: id }, select: { id: true } });
    if (!lead) throw { statusCode: 400, message: 'That lead does not belong to this customer' };
    leadId = lead.id;
  }

  const visit = await prisma.visit.create({
    data: { contactId: id, leadId, userId: user.id, date, notes },
    include: { user: { select: { name: true } }, lead: { select: { leadNo: true } } },
  });

  // Visits tied to a lead also appear in that lead's history log
  if (leadId) {
    await prisma.activity.create({
      data: { leadId, userId: user.id, type: 'VISIT', description: `Store visit logged by ${user.name}${notes ? `: ${notes}` : ''}` },
    });
  }

  return { id: visit.id, date: ymd(visit.date), notes: visit.notes || '', staff: visit.user?.name || '', leadNo: visit.lead?.leadNo ?? null };
}
