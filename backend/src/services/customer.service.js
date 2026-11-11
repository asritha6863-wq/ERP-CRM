import prisma from '../utils/prisma.js';
import { getScopeFilter } from '../middleware/scope.middleware.js';

const CUSTOMER_INCLUDE = {
  category:   { select: { id: true, name: true } },
  branch:     { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
  lead:       { select: { id: true, firstName: true, lastName: true } },
};

export async function listCustomers(user, query) {
  const {
    page = 1, limit = 20, search = '',
    categoryId, branchId, assignedToId,
    dateFrom, dateTo,
  } = query;

  const skip  = (Math.max(1, +page) - 1) * Math.min(100, +limit);
  const take  = Math.min(100, +limit);
  const scope = getScopeFilter(user);
  const where = { ...scope };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName:  { contains: search, mode: 'insensitive' } },
      { email:     { contains: search, mode: 'insensitive' } },
      { phone:     { contains: search, mode: 'insensitive' } },
    ];
  }
  if (categoryId)   where.categoryId   = categoryId;
  if (branchId)     where.branchId     = branchId;
  if (assignedToId) where.assignedToId = assignedToId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo)   where.createdAt.lte = new Date(dateTo);
  }

  const [items, total] = await Promise.all([
    prisma.customer.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: CUSTOMER_INCLUDE }),
    prisma.customer.count({ where }),
  ]);

  return { data: items, total, page: +page, limit: take, pages: Math.ceil(total / take) };
}

export async function getCustomer(user, id) {
  const scope = getScopeFilter(user);
  return prisma.customer.findFirst({ where: { id, ...scope }, include: CUSTOMER_INCLUDE });
}

export async function createCustomer(user, data) {
  const { firstName, lastName, email, phone, categoryId, branchId, assignedToId, rating } = data;
  if (!firstName?.trim()) throw { statusCode: 400, message: 'firstName is required' };
  if (!lastName?.trim())  throw { statusCode: 400, message: 'lastName is required' };

  if (phone?.trim()) {
    const dup = await prisma.customer.findFirst({ where: { phone: phone.trim() } });
    if (dup) throw { statusCode: 409, message: `Phone ${phone} is already registered` };
  }

  return prisma.customer.create({
    data: {
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      email:     email?.trim() || null,
      phone:     phone?.trim() || null,
      categoryId:   categoryId   || null,
      branchId:     branchId     || null,
      assignedToId: assignedToId || null,
      rating:       rating ? +rating : null,
    },
    include: CUSTOMER_INCLUDE,
  });
}

export async function updateCustomer(user, id, data) {
  const existing = await getCustomer(user, id);
  if (!existing) throw { statusCode: 404, message: 'Customer not found' };

  const { firstName, lastName, email, phone, categoryId, branchId, assignedToId, rating } = data;

  if (phone?.trim() && phone.trim() !== existing.phone) {
    const dup = await prisma.customer.findFirst({
      where: { phone: phone.trim(), NOT: { id } },
    });
    if (dup) throw { statusCode: 409, message: `Phone ${phone} is already registered` };
  }

  return prisma.customer.update({
    where: { id },
    data: {
      ...(firstName    && { firstName: firstName.trim() }),
      ...(lastName     && { lastName:  lastName.trim() }),
      ...(email        !== undefined && { email:  email?.trim() || null }),
      ...(phone        !== undefined && { phone:  phone?.trim() || null }),
      ...(categoryId   !== undefined && { categoryId }),
      ...(branchId     !== undefined && { branchId }),
      ...(assignedToId !== undefined && { assignedToId }),
      ...(rating       !== undefined && { rating: rating ? +rating : null }),
    },
    include: CUSTOMER_INCLUDE,
  });
}

export async function deleteCustomer(user, id) {
  const existing = await getCustomer(user, id);
  if (!existing) throw { statusCode: 404, message: 'Customer not found' };
  return prisma.customer.delete({ where: { id } });
}
