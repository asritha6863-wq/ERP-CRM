import prisma from '../utils/prisma.js';
import { findOrCreateContact } from './contact.service.js';

const STATUSES = ['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'];
const DAY = 86_400_000;
const toDay = (s) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00.000Z`) : null);

const INCLUDE = {
  contact:   { select: { id: true, firstName: true, lastName: true, phone: true } },
  branch:    { select: { id: true, name: true } },
  advisor:   { select: { id: true, name: true } },
  createdBy: { select: { id: true, name: true } },
};

function scopeParts(user, q = {}) {
  const parts = [];
  if (user.role === 'MANAGER')     parts.push({ branchId: user.branchId });
  else if (user.role === 'SALES')  parts.push({ OR: [{ advisorId: user.id }, { createdById: user.id }] });
  if (q.branchId   && user.role === 'ADMIN') parts.push({ branchId: q.branchId });
  if (q.advisorId) parts.push({ advisorId: q.advisorId });
  if (q.status && STATUSES.includes(q.status)) parts.push({ status: q.status });
  const from = toDay(q.dateFrom); const to = toDay(q.dateTo);
  if (from || to) {
    const r = {};
    if (from) r.gte = from;
    if (to)   r.lte = new Date(to.getTime() + DAY - 1);
    parts.push({ appointmentDate: r });
  }
  for (const term of (q.search || '').trim().split(/\s+/).filter(Boolean)) {
    parts.push({ OR: [
      { contact: { firstName: { contains: term, mode: 'insensitive' } } },
      { contact: { lastName:  { contains: term, mode: 'insensitive' } } },
      { contact: { phone:     { contains: term } } },
      { newCustomerName:  { contains: term, mode: 'insensitive' } },
      { newCustomerPhone: { contains: term } },
    ] });
  }
  return parts;
}

function toRow(a) {
  return {
    id:              a.id,
    customer:        a.contact ? `${a.contact.firstName} ${a.contact.lastName}`.trim() : (a.newCustomerName || 'Walk-in'),
    phone:           a.contact?.phone || a.newCustomerPhone || '',
    contactId:       a.contactId || '',
    branch:          a.branch?.name || '',
    branchId:        a.branchId || '',
    advisor:         a.advisor?.name || 'Auto-Assign',
    advisorId:       a.advisorId || '',
    appointmentType: a.appointmentType || '',
    date:            a.appointmentDate.toISOString().slice(0, 10),
    notes:           a.notes || '',
    status:          a.status,
    createdAt:       a.createdAt.toISOString(),
    createdBy:       a.createdBy?.name || '',
  };
}

export async function listAppointments(user, q) {
  const parts = scopeParts(user, q);
  const where = parts.length ? { AND: parts } : {};
  const take  = Math.min(100, Math.max(1, +q.limit || 20));
  const page  = Math.max(1, +q.page || 1);
  const [items, total] = await Promise.all([
    prisma.appointment.findMany({ where, skip: (page - 1) * take, take, orderBy: { appointmentDate: 'asc' }, include: INCLUDE }),
    prisma.appointment.count({ where }),
  ]);
  return { data: items.map(toRow), total, page, limit: take, pages: Math.ceil(total / take) };
}

export async function createAppointment(user, data) {
  const { contactId, branchId, advisorId, appointmentType, appointmentDate, notes, newCustomerName, newCustomerPhone } = data;
  if (!appointmentDate) throw { statusCode: 400, message: 'appointmentDate is required' };
  const date = toDay(appointmentDate);
  if (!date) throw { statusCode: 400, message: 'appointmentDate is invalid' };

  let resolvedContactId = contactId || null;
  if (!resolvedContactId && newCustomerPhone?.trim()) {
    const company = await prisma.company.findFirst();
    if (company) {
      const result = await findOrCreateContact({ firstName: newCustomerName?.trim() || 'Visitor', lastName: '', phone: newCustomerPhone.trim(), companyId: company.id, branchId: branchId || null });
      resolvedContactId = result.contact.id;
    }
  }

  const appt = await prisma.appointment.create({
    data: {
      contactId:       resolvedContactId,
      branchId:        branchId    || null,
      advisorId:       advisorId   || null,
      appointmentType: appointmentType?.trim() || null,
      appointmentDate: date,
      notes:           notes?.trim() || null,
      newCustomerName: newCustomerName?.trim() || null,
      newCustomerPhone: newCustomerPhone?.trim() || null,
      createdById:     user.id,
    },
    include: INCLUDE,
  });
  return toRow(appt);
}

export async function updateAppointment(user, id, data) {
  const existing = await prisma.appointment.findFirst({ where: { AND: [{ id }, ...scopeParts(user)] } });
  if (!existing) throw { statusCode: 404, message: 'Appointment not found' };
  const { status, advisorId, notes } = data;
  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      ...(status    && STATUSES.includes(status) && { status }),
      ...(advisorId !== undefined && { advisorId: advisorId || null }),
      ...(notes     !== undefined && { notes: notes?.trim() || null }),
    },
    include: INCLUDE,
  });
  return toRow(updated);
}
