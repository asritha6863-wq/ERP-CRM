import prisma from '../utils/prisma.js';

const PRIORITIES  = ['LOW', 'MEDIUM', 'HIGH'];
const STATUSES    = ['PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED'];
const toDay  = (s) => (typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00.000Z`) : null);

const INCLUDE = {
  assignedTo: { select: { id: true, name: true } },
  createdBy:  { select: { id: true, name: true } },
  lead:       { select: { id: true, leadNo: true, firstName: true, lastName: true, phone: true } },
  deal:       { select: { id: true, value: true, stage: { select: { name: true } } } },
  contact:    { select: { id: true, firstName: true, lastName: true, phone: true } },
  visit:      { select: { id: true, date: true } },
};

function scope(user, branchId) {
  if (user.role === 'ADMIN')   return branchId ? { assignedTo: { branchId } } : {};
  if (user.role === 'MANAGER') return { assignedTo: { branchId: user.branchId } };
  return { assignedToId: user.id };
}

export async function listTasks(user, q) {
  const {
    page = 1, limit = 20, search = '',
    status, priority, assignedToId, branchId,
    dateFrom, dateTo, view,
  } = q;

  const take = Math.min(100, Math.max(1, +limit));
  const skip = (Math.max(1, +page) - 1) * take;
  const parts = [scope(user, branchId)];

  if (status   && STATUSES.includes(status))   parts.push({ status });
  if (priority && PRIORITIES.includes(priority)) parts.push({ priority });
  if (assignedToId && user.role !== 'SALES') parts.push({ assignedToId });

  // today / overdue / upcoming views match the same contract as leads
  if (view) {
    const now     = new Date();
    const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const tomorrow = new Date(todayUTC.getTime() + 86_400_000);
    const open     = { status: { in: ['PENDING', 'IN_PROGRESS'] } };
    if (view === 'today')    parts.push({ ...open, dueDate: { gte: todayUTC, lt: tomorrow } });
    if (view === 'overdue')  parts.push({ ...open, dueDate: { lt: todayUTC } });
    if (view === 'upcoming') parts.push({ ...open, dueDate: { gte: tomorrow } });
    if (view === 'mine')     parts.push({ assignedToId: user.id });
  }

  if (dateFrom || dateTo) {
    const r = {};
    if (dateFrom) r.gte = new Date(`${dateFrom}T00:00:00.000Z`);
    if (dateTo)   r.lte = new Date(`${dateTo}T23:59:59.999Z`);
    parts.push({ dueDate: r });
  }

  for (const term of search.trim().split(/\s+/).filter(Boolean)) {
    parts.push({ title: { contains: term, mode: 'insensitive' } });
  }

  const where = parts.length > 1 ? { AND: parts } : (parts[0] || {});

  const [items, total] = await Promise.all([
    prisma.task.findMany({ where, skip, take, orderBy: { dueDate: 'asc' }, include: INCLUDE }),
    prisma.task.count({ where }),
  ]);
  return { data: items, total, page: +page, limit: take, pages: Math.ceil(total / take) };
}

export async function createTask(user, data) {
  const { title, description, dueDate, reminderDate, priority, leadId, dealId, contactId, visitId, assignedToId } = data;
  if (!title?.trim()) throw { statusCode: 400, message: 'title is required' };
  if (!leadId && !dealId && !contactId) throw { statusCode: 400, message: 'Link the task to a lead, deal or customer' };

  return prisma.task.create({
    data: {
      title:        title.trim(),
      description:  description?.trim() || null,
      dueDate:      toDay(dueDate),
      reminderDate: toDay(reminderDate),
      priority:     PRIORITIES.includes(priority) ? priority : 'MEDIUM',
      leadId:       leadId    || null,
      dealId:       dealId    || null,
      contactId:    contactId || null,
      visitId:      visitId   || null,
      assignedToId: assignedToId || user.id,
      createdById:  user.id,
    },
    include: INCLUDE,
  });
}

export async function updateTask(user, id, data) {
  const existing = await prisma.task.findFirst({ where: { AND: [{ id }, scope(user)] } });
  if (!existing) throw { statusCode: 404, message: 'Task not found' };

  const { title, description, dueDate, reminderDate, priority, status, assignedToId } = data;
  return prisma.task.update({
    where: { id },
    data: {
      ...(title        !== undefined && { title: title.trim() }),
      ...(description  !== undefined && { description: description?.trim() || null }),
      ...(dueDate      !== undefined && { dueDate: toDay(dueDate) }),
      ...(reminderDate !== undefined && { reminderDate: toDay(reminderDate) }),
      ...(priority && PRIORITIES.includes(priority) && { priority }),
      ...(status   && STATUSES.includes(status)     && { status }),
      ...(assignedToId !== undefined && user.role !== 'SALES' && { assignedToId: assignedToId || null }),
    },
    include: INCLUDE,
  });
}

export async function deleteTask(user, id) {
  const existing = await prisma.task.findFirst({ where: { AND: [{ id }, scope(user)] } });
  if (!existing) throw { statusCode: 404, message: 'Task not found' };
  return prisma.task.delete({ where: { id } });
}
