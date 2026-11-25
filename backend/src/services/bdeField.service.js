import prisma from '../utils/prisma.js';
import { findOrCreateContact } from './contact.service.js';

const VISIT_INCLUDE = {
  user:    { select: { id: true, name: true, role: true } },
  lead:    { select: { id: true, leadNo: true, firstName: true, lastName: true, phone: true } },
  contact: { select: { id: true, firstName: true, lastName: true, phone: true } },
};

// ── Check-in: BDE arrives at a customer, captures GPS + enters customer info ──
export async function checkIn(user, data) {
  const {
    customerName, customerPhone, customerAddress, purpose, notes,
    lat, lng, address,
  } = data;

  if (lat === undefined || lng === undefined) {
    throw { statusCode: 400, message: 'GPS location (lat, lng) is required to check in' };
  }

  // Already has an open visit? Block a second check-in until they check out.
  const open = await prisma.bdeFieldVisit.findFirst({
    where: { userId: user.id, status: 'CHECKED_IN' },
  });
  if (open) throw { statusCode: 409, message: 'You already have an open visit. Check out first.' };

  // Create / link a Contact if customer details were entered
  let contactId = null;
  if (customerName?.trim() || customerPhone?.trim()) {
    const company = await prisma.company.findFirst({ where: { isActive: true } });
    if (company) {
      const { contact } = await findOrCreateContact({
        firstName: customerName?.trim() || 'Field Visitor',
        lastName: '',
        phone: customerPhone?.trim() || null,
        companyId: company.id,
        branchId: user.branchId || null,
        assignedToId: user.id,
      });
      contactId = contact.id;
    }
  }

  const visit = await prisma.bdeFieldVisit.create({
    data: {
      userId: user.id,
      contactId,
      customerName:    customerName?.trim() || null,
      customerPhone:   customerPhone?.trim() || null,
      customerAddress: customerAddress?.trim() || null,
      purpose:         purpose?.trim() || null,
      notes:           notes?.trim() || null,
      checkInLat: +lat,
      checkInLng: +lng,
      checkInAddress: address?.trim() || null,
      status: 'CHECKED_IN',
    },
    include: VISIT_INCLUDE,
  });

  // Also drop a location ping so the live map has an immediate point
  await prisma.bdeLocationPing.create({
    data: { userId: user.id, lat: +lat, lng: +lng },
  });

  return visit;
}

// ── Check-out: closes the visit, records outcome + GPS ──
export async function checkOut(user, id, data) {
  const { lat, lng, address, outcome, notes } = data;

  const visit = await prisma.bdeFieldVisit.findUnique({ where: { id } });
  if (!visit) throw { statusCode: 404, message: 'Visit not found' };
  if (visit.userId !== user.id && user.role === 'SALES') {
    throw { statusCode: 403, message: 'You can only check out your own visit' };
  }
  if (visit.status !== 'CHECKED_IN') throw { statusCode: 409, message: 'Visit is already closed' };

  const updated = await prisma.bdeFieldVisit.update({
    where: { id },
    data: {
      status: 'CHECKED_OUT',
      checkOutAt:  new Date(),
      checkOutLat: lat !== undefined ? +lat : null,
      checkOutLng: lng !== undefined ? +lng : null,
      checkOutAddress: address?.trim() || null,
      outcome: outcome?.trim() || null,
      notes: notes?.trim() ? (visit.notes ? `${visit.notes}\n${notes.trim()}` : notes.trim()) : visit.notes,
    },
    include: VISIT_INCLUDE,
  });

  if (lat !== undefined && lng !== undefined) {
    await prisma.bdeLocationPing.create({ data: { userId: user.id, lat: +lat, lng: +lng } });
  }

  return updated;
}

// ── Cancel an open visit without a full checkout ──
export async function cancelVisit(user, id) {
  const visit = await prisma.bdeFieldVisit.findUnique({ where: { id } });
  if (!visit) throw { statusCode: 404, message: 'Visit not found' };
  if (visit.userId !== user.id && user.role === 'SALES') {
    throw { statusCode: 403, message: 'You can only cancel your own visit' };
  }
  return prisma.bdeFieldVisit.update({
    where: { id },
    data: { status: 'CANCELLED', checkOutAt: new Date() },
    include: VISIT_INCLUDE,
  });
}

// ── List visits (Admin/Manager see all scoped staff; Sales sees own) ──
export async function listVisits(user, query) {
  const { page = 1, limit = 20, userId, status, dateFrom, dateTo } = query;
  const skip = (Math.max(1, +page) - 1) * Math.min(100, +limit);
  const take = Math.min(100, +limit);

  const where = {};
  if (user.role === 'SALES') where.userId = user.id;
  else if (user.role === 'MANAGER') where.user = { branchId: user.branchId };
  if (userId) where.userId = userId;
  if (status) where.status = status;
  if (dateFrom || dateTo) {
    where.checkInAt = {};
    if (dateFrom) where.checkInAt.gte = new Date(`${dateFrom}T00:00:00.000Z`);
    if (dateTo)   where.checkInAt.lte = new Date(`${dateTo}T23:59:59.999Z`);
  }

  const [items, total] = await Promise.all([
    prisma.bdeFieldVisit.findMany({ where, skip, take, orderBy: { checkInAt: 'desc' }, include: VISIT_INCLUDE }),
    prisma.bdeFieldVisit.count({ where }),
  ]);

  return { data: items, total, page: +page, limit: take, pages: Math.ceil(total / take) };
}

export async function getActiveVisit(user) {
  return prisma.bdeFieldVisit.findFirst({
    where: { userId: user.id, status: 'CHECKED_IN' },
    include: VISIT_INCLUDE,
  });
}

// ── Live location ping — called every ~2-5 min while BDE is on duty ──
export async function pingLocation(user, { lat, lng, accuracy }) {
  if (lat === undefined || lng === undefined) throw { statusCode: 400, message: 'lat and lng are required' };
  return prisma.bdeLocationPing.create({
    data: { userId: user.id, lat: +lat, lng: +lng, accuracy: accuracy !== undefined ? +accuracy : null },
  });
}

// ── Admin view: latest known location for every BDE (role SALES by default) ──
export async function listLiveLocations(user, query = {}) {
  if (user.role === 'SALES') throw { statusCode: 403, message: 'Not allowed' };

  const staffWhere = { role: query.role || 'SALES', isActive: true };
  if (user.role === 'MANAGER') staffWhere.branchId = user.branchId;

  const staff = await prisma.user.findMany({
    where: staffWhere,
    select: { id: true, name: true, role: true, branch: { select: { id: true, name: true } } },
  });

  const results = await Promise.all(staff.map(async (s) => {
    const [lastPing, openVisit] = await Promise.all([
      prisma.bdeLocationPing.findFirst({ where: { userId: s.id }, orderBy: { createdAt: 'desc' } }),
      prisma.bdeFieldVisit.findFirst({ where: { userId: s.id, status: 'CHECKED_IN' }, include: VISIT_INCLUDE }),
    ]);
    return {
      user: s,
      lastSeenAt: lastPing?.createdAt || null,
      lat: lastPing?.lat ?? null,
      lng: lastPing?.lng ?? null,
      accuracy: lastPing?.accuracy ?? null,
      activeVisit: openVisit || null,
    };
  }));

  return results;
}

// ── Location history for one BDE (today's trail, for the admin map) ──
export async function getLocationHistory(user, staffId, query = {}) {
  if (user.role === 'SALES' && staffId !== user.id) throw { statusCode: 403, message: 'Not allowed' };

  const date = /^\d{4}-\d{2}-\d{2}$/.test(query.date || '') ? query.date : new Date().toLocaleDateString('en-CA');
  const dayStart = new Date(`${date}T00:00:00.000Z`);
  const dayEnd   = new Date(dayStart.getTime() + 86_400_000);

  return prisma.bdeLocationPing.findMany({
    where: { userId: staffId, createdAt: { gte: dayStart, lt: dayEnd } },
    orderBy: { createdAt: 'asc' },
  });
}
