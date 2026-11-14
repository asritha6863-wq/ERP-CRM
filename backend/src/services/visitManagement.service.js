import prisma from '../utils/prisma.js';
import { ensureFeedbackRequest } from './feedbackRequest.service.js';
import { findOrCreateContact }   from './contact.service.js';

const STATUSES = ['IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
const DAY = 86_400_000;

const toDay = (s) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
  ? new Date(`${s}T00:00:00.000Z`) : null);

const INCLUDE = {
  user:    { select: { id: true, name: true } },
  contact: { select: { id: true, firstName: true, lastName: true, phone: true, branchId: true } },
  lead:    { select: { id: true, leadNo: true, firstName: true, lastName: true, phone: true, isWon: true, isLost: true } },
};

function scopeParts(user, q = {}) {
  const parts = [];
  if (user.role === 'MANAGER')     parts.push({ OR: [{ contact: { branchId: user.branchId } }, { lead: { branchId: user.branchId } }] });
  else if (user.role === 'SALES')  parts.push({ userId: user.id });
  if (q.status && STATUSES.includes(q.status)) parts.push({ status: q.status });
  if (q.userId && user.role !== 'SALES') parts.push({ userId: q.userId });
  if (q.counter) parts.push({ counter: { equals: q.counter, mode: 'insensitive' } });
  const from = toDay(q.dateFrom); const to = toDay(q.dateTo);
  if (from || to) {
    const r = {};
    if (from) r.gte = from;
    if (to)   r.lte = new Date(to.getTime() + DAY - 1);
    parts.push({ date: r });
  }
  for (const term of (q.search || '').trim().split(/\s+/).filter(Boolean)) {
    parts.push({ OR: [
      { contact: { firstName: { contains: term, mode: 'insensitive' } } },
      { contact: { lastName:  { contains: term, mode: 'insensitive' } } },
      { contact: { phone:     { contains: term } } },
      { newVisitorName:  { contains: term, mode: 'insensitive' } },
      { newVisitorPhone: { contains: term } },
    ] });
  }
  if (q.view === 'created')  parts.push({ userId: user.id });
  if (q.view === 'assigned') parts.push({ userId: user.id });
  return parts;
}

function toRow(v) {
  // displayStatus maps the lead outcome to report labels matching the screenshot
  let displayStatus = v.status;
  if (v.lead?.isWon)  displayStatus = 'CONVERTED';
  else if (v.lead?.isLost) displayStatus = 'LOST';
  else if (v.status === 'COMPLETED') displayStatus = 'CONVERTED';
  return {
    id:             v.id,
    date:           v.date.toISOString().slice(0, 10),
    status:         v.status,
    counter:        v.counter || '',
    category:       v.category || '',
    purpose:        v.purpose || '',
    visitLocation:  v.visitLocation || '',
    internalNotes:  v.internalNotes || '',
    newVisitorName: v.newVisitorName || '',
    newVisitorPhone:v.newVisitorPhone || '',
    notes:          v.notes || '',
    createdAt:      v.createdAt?.toISOString() || '',
    staff:          v.user?.name  || '',
    staffId:        v.user?.id    || '',
    contactId:      v.contact?.id || '',
    customer:       v.contact ? `${v.contact.firstName} ${v.contact.lastName}`.trim() : (v.newVisitorName || 'Unknown'),
    phone:          v.contact?.phone || v.newVisitorPhone || '',
    leadNo:         v.lead?.leadNo ?? null,
    leadId:         v.lead?.id  || '',
    displayStatus,
  };
}

export async function listVisits(user, q) {
  const parts = scopeParts(user, q);
  const where = parts.length ? { AND: parts } : {};
  const take  = Math.min(100, Math.max(1, +q.limit || 12));
  const page  = Math.max(1, +q.page || 1);

  const [items, total] = await Promise.all([
    prisma.visit.findMany({ where, skip: (page - 1) * take, take, orderBy: { date: 'desc' }, include: INCLUDE }),
    prisma.visit.count({ where }),
  ]);

  // Distinct counters for the filter dropdown
  const counters = await prisma.visit.findMany({ where: { counter: { not: null } }, distinct: ['counter'], select: { counter: true } });
  return { data: items.map(toRow), total, page, limit: take, pages: Math.ceil(total / take), counters: counters.map((c) => c.counter) };
}

export async function visitSummary(user, q) {
  const parts = scopeParts(user, { ...q, status: undefined });   // summary ignores status filter
  const where = parts.length ? { AND: parts } : {};
  const inScope = { where };

  const [total, converted, lost, contacts, newVisitors] = await Promise.all([
    prisma.visit.count(inScope),
    // Converted = completed visits or whose lead is Won
    prisma.visit.count({ where: { AND: [...(parts.length ? [{ AND: parts }] : []), { OR: [{ status: 'COMPLETED' }, { lead: { isWon: true } }] }] } }),
    // Lost = visits whose lead is Lost
    prisma.visit.count({ where: { AND: [...(parts.length ? [{ AND: parts }] : []), { lead: { isLost: true } }] } }),
    // Unique customers (contacts)
    prisma.visit.groupBy({ by: ['contactId'], where: { AND: [...(parts.length ? [{ AND: parts }] : []), { contactId: { not: null } }] }, _count: { _all: true } }),
    // New visitors (no contact on record)
    prisma.visit.count({ where: { AND: [...(parts.length ? [{ AND: parts }] : []), { contactId: null }] } }),
  ]);
  return { total, uniqueCustomers: contacts.length, newVisitors, converted, lost };
}

// CSV export — streams all matching rows
const CSV_COLS = [
  ['date',          'Visit Date'],
  ['customer',      'Customer / Visitor'],
  ['phone',         'Phone'],
  ['staff',         'Staff'],
  ['counter',       'Counter'],
  ['category',      'Requirement Category'],
  ['purpose',       'Purpose / Details'],
  ['visitLocation', 'Visit Location'],
  ['displayStatus', 'Status'],
  ['internalNotes', 'Internal Notes'],
];

export async function streamVisitCsv(user, q, res) {
  const parts = scopeParts(user, q);
  const where = parts.length ? { AND: parts } : {};
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="visit-report.csv"');
  res.write('\ufeff' + CSV_COLS.map(([, h]) => esc(h)).join(',') + '\n');

  let cursor; let written = 0;
  while (written < 50_000) {
    const batch = await prisma.visit.findMany({
      where, take: 1000, orderBy: { id: 'asc' }, include: INCLUDE,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (!batch.length) break;
    for (const v of batch) {
      const row = toRow(v);
      res.write(CSV_COLS.map(([k]) => esc(row[k])).join(',') + '\n');
    }
    written += batch.length;
    cursor = batch[batch.length - 1].id;
    if (batch.length < 1000) break;
  }
  res.end();
}

export async function createVisit(user, data) {
  const {
    visitDate, contactId, leadId, userId: assignedUserId,
    counter, category, purpose, visitLocation, internalNotes, notes,
    newVisitorName, newVisitorPhone, salutation,
  } = data;

  const date = toDay(visitDate) || new Date();

  // Resolve or create a contact for walk-in visitors without an existing record
  let resolvedContactId = contactId || null;
  let resolvedLeadId    = leadId    || null;

  if (!resolvedContactId && newVisitorPhone?.trim()) {
    // Find the default company (required by Contact)
    const company = await prisma.company.findFirst();
    if (company) {
      const result = await findOrCreateContact({
        firstName: (salutation ? `${salutation} ` : '') + (newVisitorName?.trim() || 'Visitor'),
        lastName:  '',
        phone:     newVisitorPhone.trim(),
        companyId: company.id,
      });
      resolvedContactId = result.contact.id;
    }
  }

  const staffId = (user.role === 'SALES' ? user.id : (assignedUserId || user.id));

  const visit = await prisma.visit.create({
    data: {
      date,
      contactId:       resolvedContactId,
      leadId:          resolvedLeadId,
      userId:          staffId,
      counter:         counter?.trim()       || null,
      category:        category?.trim()      || null,
      purpose:         purpose?.trim()       || null,
      visitLocation:   visitLocation?.trim() || null,
      internalNotes:   internalNotes?.trim() || null,
      notes:           notes?.trim()         || null,
      newVisitorName:  newVisitorName?.trim() || null,
      newVisitorPhone: newVisitorPhone?.trim() || null,
    },
    include: INCLUDE,
  });

  // Queue a feedback call for this store visit
  if (resolvedLeadId) {
    await ensureFeedbackRequest(prisma, { leadId: resolvedLeadId, kind: 'REGISTRATION', refNo: 'STORE VISIT' });
  }

  return toRow(visit);
}

export async function updateVisit(user, id, data) {
  const existing = await prisma.visit.findFirst({ where: { AND: [{ id }, ...scopeParts(user)] } });
  if (!existing) throw { statusCode: 404, message: 'Visit not found' };

  const { status, counter, category, purpose, visitLocation, internalNotes, notes } = data;
  const updated = await prisma.visit.update({
    where: { id },
    data: {
      ...(status && STATUSES.includes(status) && { status }),
      ...(counter       !== undefined && { counter:       counter?.trim()       || null }),
      ...(category      !== undefined && { category:      category?.trim()      || null }),
      ...(purpose       !== undefined && { purpose:       purpose?.trim()       || null }),
      ...(visitLocation !== undefined && { visitLocation: visitLocation?.trim() || null }),
      ...(internalNotes !== undefined && { internalNotes: internalNotes?.trim() || null }),
      ...(notes         !== undefined && { notes:         notes?.trim()         || null }),
    },
    include: INCLUDE,
  });
  return toRow(updated);
}
