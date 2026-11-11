import prisma from '../utils/prisma.js';
import { getScopeFilter } from '../middleware/scope.middleware.js';

const LEAD_INCLUDE = {
  source:     { select: { id: true, name: true } },
  status:     { select: { id: true, name: true, color: true } },
  branch:     { select: { id: true, name: true } },
  assignedTo: { select: { id: true, name: true } },
  tags:       { select: { id: true, name: true } },
  customer:   { select: { id: true } },
};

export async function listLeads(user, query) {
  const {
    page = 1, limit = 20, search = '',
    statusId, sourceId, branchId, assignedToId,
    dateFrom, dateTo,
  } = query;

  const skip = (Math.max(1, +page) - 1) * Math.min(100, +limit);
  const take = Math.min(100, +limit);

  const scope  = getScopeFilter(user);
  const where  = { ...scope };

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName:  { contains: search, mode: 'insensitive' } },
      { email:     { contains: search, mode: 'insensitive' } },
      { phone:     { contains: search, mode: 'insensitive' } },
    ];
  }
  if (statusId)     where.statusId     = statusId;
  if (sourceId)     where.sourceId     = sourceId;
  if (branchId)     where.branchId     = branchId;
  if (assignedToId) where.assignedToId = assignedToId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) where.createdAt.gte = new Date(dateFrom);
    if (dateTo)   where.createdAt.lte = new Date(dateTo);
  }

  const [items, total] = await Promise.all([
    prisma.lead.findMany({ where, skip, take, orderBy: { createdAt: 'desc' }, include: LEAD_INCLUDE }),
    prisma.lead.count({ where }),
  ]);

  return { data: items, total, page: +page, limit: take, pages: Math.ceil(total / take) };
}

export async function getLead(user, id) {
  const scope = getScopeFilter(user);
  const lead  = await prisma.lead.findFirst({
    where: { id, ...scope },
    include: {
      ...LEAD_INCLUDE,
      activities: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'desc' },
      },
      visits: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { date: 'desc' },
      },
      deals: {
        include: {
          stage:  { select: { id: true, name: true } },
          owner:  { select: { id: true, name: true } },
        },
      },
    },
  });
  return lead;
}

export async function createLead(user, data) {
  const { firstName, lastName, email, phone, sourceId, statusId, branchId,
          assignedToId, tagNames = [], sentiment, rating } = data;

  if (!firstName?.trim()) throw { statusCode: 400, message: 'firstName is required' };
  if (!lastName?.trim())  throw { statusCode: 400, message: 'lastName is required' };

  // Duplicate phone check
  if (phone?.trim()) {
    const dup = await prisma.lead.findFirst({ where: { phone: phone.trim() } });
    if (dup) throw { statusCode: 409, message: `Phone ${phone} is already registered` };
  }

  // Resolve/create tags
  const tags = await resolveTags(tagNames);

  const lead = await prisma.lead.create({
    data: {
      firstName: firstName.trim(),
      lastName:  lastName.trim(),
      email:     email?.trim() || null,
      phone:     phone?.trim() || null,
      sourceId:  sourceId || null,
      statusId:  statusId || null,
      branchId:  branchId || null,
      assignedToId: assignedToId || null,
      sentiment: sentiment || 'NEUTRAL',
      rating:    rating ? +rating : null,
      tags:      { connect: tags.map((t) => ({ id: t.id })) },
    },
    include: LEAD_INCLUDE,
  });

  await prisma.activity.create({
    data: {
      leadId: lead.id,
      userId: user.id,
      type: 'CREATED',
      description: `Lead created by ${user.name}`,
    },
  });

  return lead;
}

export async function updateLead(user, id, data) {
  const existing = await getLead(user, id);
  if (!existing) throw { statusCode: 404, message: 'Lead not found' };

  const { firstName, lastName, email, phone, sourceId, statusId, branchId,
          assignedToId, tagNames, sentiment, rating } = data;

  // Duplicate phone check (exclude self)
  if (phone?.trim() && phone.trim() !== existing.phone) {
    const dup = await prisma.lead.findFirst({
      where: { phone: phone.trim(), NOT: { id } },
    });
    if (dup) throw { statusCode: 409, message: `Phone ${phone} is already registered` };
  }

  const activities = [];

  if (statusId && statusId !== existing.statusId) {
    activities.push({ type: 'STATUS_CHANGE', description: `Status changed to ${statusId}` });
  }
  if (assignedToId && assignedToId !== existing.assignedToId) {
    activities.push({ type: 'ASSIGNMENT_CHANGE', description: `Assigned staff changed` });
  }

  const tags = tagNames ? await resolveTags(tagNames) : undefined;

  const updated = await prisma.lead.update({
    where: { id },
    data: {
      ...(firstName  && { firstName: firstName.trim() }),
      ...(lastName   && { lastName:  lastName.trim() }),
      ...(email      !== undefined && { email:  email?.trim() || null }),
      ...(phone      !== undefined && { phone:  phone?.trim() || null }),
      ...(sourceId   !== undefined && { sourceId }),
      ...(statusId   !== undefined && { statusId }),
      ...(branchId   !== undefined && { branchId }),
      ...(assignedToId !== undefined && { assignedToId }),
      ...(sentiment  && { sentiment }),
      ...(rating     !== undefined && { rating: rating ? +rating : null }),
      ...(tags && { tags: { set: tags.map((t) => ({ id: t.id })) } }),
    },
    include: LEAD_INCLUDE,
  });

  for (const a of activities) {
    await prisma.activity.create({
      data: { leadId: id, userId: user.id, ...a },
    });
  }

  return updated;
}

export async function bulkAssign(user, { leadIds, assignedToId }) {
  if (!leadIds?.length) throw { statusCode: 400, message: 'leadIds required' };
  if (!assignedToId)    throw { statusCode: 400, message: 'assignedToId required' };

  const scope = getScopeFilter(user);
  await prisma.lead.updateMany({
    where: { id: { in: leadIds }, ...scope },
    data: { assignedToId },
  });

  await prisma.activity.createMany({
    data: leadIds.map((lid) => ({
      leadId: lid,
      userId: user.id,
      type: 'ASSIGNMENT_CHANGE',
      description: `Bulk assigned by ${user.name}`,
    })),
  });

  return { updated: leadIds.length };
}

export async function convertLead(user, id) {
  const lead = await getLead(user, id);
  if (!lead) throw { statusCode: 404, message: 'Lead not found' };
  if (lead.isConverted) throw { statusCode: 409, message: 'Lead already converted' };

  const [customer] = await prisma.$transaction([
    prisma.customer.create({
      data: {
        leadId:      lead.id,
        firstName:   lead.firstName,
        lastName:    lead.lastName,
        email:       lead.email,
        phone:       lead.phone,
        branchId:    lead.branchId,
        assignedToId: lead.assignedToId,
      },
    }),
    prisma.lead.update({ where: { id }, data: { isConverted: true } }),
    prisma.activity.create({
      data: {
        leadId: id,
        userId: user.id,
        type:   'STATUS_CHANGE',
        description: `Converted to customer by ${user.name}`,
      },
    }),
  ]);

  return customer;
}

export async function addActivity(user, leadId, { type, description }) {
  const lead = await getLead(user, leadId);
  if (!lead) throw { statusCode: 404, message: 'Lead not found' };

  const VALID = ['NOTE', 'CALL', 'VISIT', 'STATUS_CHANGE'];
  if (!VALID.includes(type)) throw { statusCode: 400, message: `Invalid type. Must be one of ${VALID.join(', ')}` };
  if (!description?.trim())  throw { statusCode: 400, message: 'description is required' };

  return prisma.activity.create({
    data: { leadId, userId: user.id, type, description: description.trim() },
    include: { user: { select: { id: true, name: true } } },
  });
}

// ── Helpers ─────────────────────────────────────────────

async function resolveTags(names) {
  const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
  const tags   = [];
  for (const name of unique) {
    const tag = await prisma.tag.upsert({
      where:  { name },
      update: {},
      create: { name },
    });
    tags.push(tag);
  }
  return tags;
}
