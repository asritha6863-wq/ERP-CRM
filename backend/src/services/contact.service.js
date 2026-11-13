import prisma from '../utils/prisma.js';

const CONTACT_INCLUDE = {
  company:    { select: { id: true, name: true } },
  type:       { select: { id: true, name: true } },
  branch:     { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
};

// Build Prisma where based on role + optional top-bar selectors
function buildScope(user, { companyId, branchId } = {}) {
  const filter = {};
  if (companyId) filter.companyId = companyId;

  if (user.role === 'ADMIN') {
    if (branchId) filter.branchId = branchId;
  } else if (user.role === 'MANAGER') {
    filter.branchId = user.branchId;
  } else {
    filter.assignedToId = user.id;
  }
  return filter;
}

// 'YYYY-MM-DD' (or ISO) → Date at UTC midnight; empty → null
function toDate(v) {
  if (!v) return null;
  const d = new Date(String(v).slice(0, 10) + 'T00:00:00.000Z');
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalisePhone(phone) {
  return phone?.replace(/[\s\-().+]/g, '') || null;
}

export async function listContacts(user, query) {
  const {
    page = 1, limit = 20, search = '',
    companyId, branchId, typeId, assignedToId,
    isDuplicate, requiresReview,
  } = query;

  const skip  = (Math.max(1, +page) - 1) * Math.min(100, +limit);
  const take  = Math.min(100, +limit);
  const scope = buildScope(user, { companyId, branchId });
  const where = { ...scope, isActive: true };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName:  { contains: search, mode: 'insensitive' } },
      { email:     { contains: search, mode: 'insensitive' } },
      { phone:     { contains: search, mode: 'insensitive' } },
    ];
  }
  if (typeId)       where.typeId       = typeId;
  if (assignedToId) where.assignedToId = assignedToId;
  if (isDuplicate   === 'true') where.isDuplicate   = true;
  if (requiresReview === 'true') where.requiresReview = true;

  const [items, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        ...CONTACT_INCLUDE,
        _count: { select: { leads: true, deals: true } },
      },
    }),
    prisma.contact.count({ where }),
  ]);

  return { data: items, total, page: +page, limit: take, pages: Math.ceil(total / take) };
}

export async function getContact(user, id) {
  const scope = buildScope(user);
  const contact = await prisma.contact.findFirst({
    where: { id, ...scope, isActive: true },
    include: {
      ...CONTACT_INCLUDE,
      _count: { select: { leads: true, deals: true } },
    },
  });
  return contact;
}

export async function createContact(user, data) {
  const {
    firstName, lastName, phone, email,
    companyId, typeId, branchId, assignedToId, rating,
    dateOfBirth, anniversaryDate,
  } = data;

  if (!firstName?.trim()) throw { statusCode: 400, message: 'firstName is required' };
  if (!lastName?.trim())  throw { statusCode: 400, message: 'lastName is required' };
  if (!companyId)         throw { statusCode: 400, message: 'companyId is required' };

  const normPhone = normalisePhone(phone);

  // Check uniqueness (phone, companyId)
  if (normPhone) {
    const dup = await prisma.contact.findUnique({
      where: { phone_companyId: { phone: normPhone, companyId } },
    });
    if (dup) throw { statusCode: 409, message: `A contact with phone ${normPhone} already exists in this company` };
  }

  return prisma.contact.create({
    data: {
      firstName:  firstName.trim(),
      lastName:   lastName.trim(),
      phone:      normPhone,
      email:      email?.trim() || null,
      companyId,
      typeId:     typeId || null,
      branchId:   branchId || null,
      assignedToId: assignedToId || null,
      rating:     rating ? +rating : null,
      dateOfBirth:     toDate(dateOfBirth),
      anniversaryDate: toDate(anniversaryDate),
    },
    include: CONTACT_INCLUDE,
  });
}

export async function updateContact(user, id, data) {
  const existing = await getContact(user, id);
  if (!existing) throw { statusCode: 404, message: 'Contact not found' };

  const {
    firstName, lastName, phone, email,
    typeId, branchId, assignedToId, rating,
    dateOfBirth, anniversaryDate,
  } = data;

  const normPhone = phone !== undefined ? normalisePhone(phone) : undefined;

  // Uniqueness check on phone change
  if (normPhone && normPhone !== existing.phone) {
    const dup = await prisma.contact.findUnique({
      where: { phone_companyId: { phone: normPhone, companyId: existing.companyId } },
    });
    if (dup) throw { statusCode: 409, message: `A contact with phone ${normPhone} already exists in this company` };
  }

  return prisma.contact.update({
    where: { id },
    data: {
      ...(firstName    && { firstName: firstName.trim() }),
      ...(lastName     && { lastName:  lastName.trim() }),
      ...(normPhone    !== undefined && { phone: normPhone }),
      ...(email        !== undefined && { email: email?.trim() || null }),
      ...(typeId       !== undefined && { typeId }),
      ...(branchId     !== undefined && { branchId }),
      ...(assignedToId !== undefined && { assignedToId }),
      ...(rating       !== undefined && { rating: rating ? +rating : null }),
      ...(dateOfBirth     !== undefined && { dateOfBirth: toDate(dateOfBirth) }),
      ...(anniversaryDate !== undefined && { anniversaryDate: toDate(anniversaryDate) }),
      requiresReview: normPhone ? false : existing.requiresReview,
    },
    include: CONTACT_INCLUDE,
  });
}

export async function softDeleteContact(user, id) {
  const existing = await getContact(user, id);
  if (!existing) throw { statusCode: 404, message: 'Contact not found' };
  return prisma.contact.update({ where: { id }, data: { isActive: false } });
}

export async function getContactLeads(user, id, query) {
  const { page = 1, limit = 20 } = query;
  const skip = (Math.max(1, +page) - 1) * Math.min(100, +limit);
  const take = Math.min(100, +limit);

  const [items, total] = await Promise.all([
    prisma.lead.findMany({
      where: { contactId: id },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        source: { select: { id: true, name: true } },
        status: { select: { id: true, name: true, color: true } },
        branch: { select: { id: true, name: true } },
      },
    }),
    prisma.lead.count({ where: { contactId: id } }),
  ]);

  return { data: items, total, page: +page, limit: take, pages: Math.ceil(total / take) };
}

export async function getContactDeals(user, id, query) {
  const { page = 1, limit = 20 } = query;
  const skip = (Math.max(1, +page) - 1) * Math.min(100, +limit);
  const take = Math.min(100, +limit);

  const [items, total] = await Promise.all([
    prisma.deal.findMany({
      where: { contactId: id },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
      include: {
        stage:  { select: { id: true, name: true } },
        owner:  { select: { id: true, name: true } },
        lead:   { select: { id: true, firstName: true, lastName: true } },
      },
    }),
    prisma.deal.count({ where: { contactId: id } }),
  ]);

  return { data: items, total, page: +page, limit: take, pages: Math.ceil(total / take) };
}

// Find or create a contact by (phone, companyId) — used by lead creation
export async function findOrCreateContact(data) {
  const { firstName, lastName, phone, email, companyId, branchId, assignedToId } = data;
  const normPhone = normalisePhone(phone);

  if (normPhone) {
    const existing = await prisma.contact.findUnique({
      where: { phone_companyId: { phone: normPhone, companyId } },
    });
    if (existing) return { contact: existing, created: false };
  }

  const contact = await prisma.contact.create({
    data: {
      firstName:     firstName?.trim() || 'Unknown',
      lastName:      lastName?.trim()  || '',
      phone:         normPhone,
      email:         email?.trim() || null,
      companyId,
      branchId:      branchId || null,
      assignedToId:  assignedToId || null,
      requiresReview: !normPhone,
    },
  });
  return { contact, created: true };
}
