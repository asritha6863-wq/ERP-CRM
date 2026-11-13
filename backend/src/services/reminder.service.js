import prisma from '../utils/prisma.js';

const INCLUDE = {
  assignedTo: { select: { id: true, name: true } },
  contact:    { select: { id: true, firstName: true, lastName: true, phone: true } },
};

// ADMIN sees all, MANAGER sees their branch's staff, SALES sees own
function buildScope(user) {
  if (user.role === 'ADMIN')   return {};
  if (user.role === 'MANAGER') return { assignedTo: { branchId: user.branchId } };
  return { OR: [{ assignedToId: user.id }, { createdById: user.id }] };
}

export async function listReminders(user, query) {
  const { page = 1, limit = 50, dateFrom, dateTo, assignedToId, status } = query;
  const take = Math.min(100, Math.max(1, +limit));
  const skip = (Math.max(1, +page) - 1) * take;

  const where = { ...buildScope(user) };
  if (assignedToId) where.assignedToId = assignedToId;
  if (status === 'PENDING' || status === 'COMPLETED') where.status = status;
  if (dateFrom || dateTo) {
    where.dueDate = {};
    if (dateFrom) where.dueDate.gte = new Date(`${dateFrom}T00:00:00.000Z`);
    if (dateTo)   where.dueDate.lte = new Date(`${dateTo}T23:59:59.999Z`);
  }

  const [items, total] = await Promise.all([
    prisma.reminder.findMany({ where, skip, take, orderBy: { dueDate: 'asc' }, include: INCLUDE }),
    prisma.reminder.count({ where }),
  ]);
  return { data: items, total, page: +page, limit: take, pages: Math.ceil(total / take) };
}

export async function createReminder(user, data) {
  const { title, description, dueDate, assignedToId, contactId } = data;
  if (!title?.trim()) throw { statusCode: 400, message: 'title is required' };
  if (!dueDate)       throw { statusCode: 400, message: 'dueDate is required' };

  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) throw { statusCode: 400, message: 'dueDate is invalid' };

  return prisma.reminder.create({
    data: {
      title:        title.trim(),
      description:  description?.trim() || null,
      dueDate:      due,
      assignedToId: assignedToId || user.id,
      createdById:  user.id,
      contactId:    contactId || null,
    },
    include: INCLUDE,
  });
}

export async function setReminderStatus(user, id, status) {
  if (!['PENDING', 'COMPLETED'].includes(status)) {
    throw { statusCode: 400, message: 'status must be PENDING or COMPLETED' };
  }
  const existing = await prisma.reminder.findFirst({ where: { id, ...buildScope(user) } });
  if (!existing) throw { statusCode: 404, message: 'Reminder not found' };

  return prisma.reminder.update({ where: { id }, data: { status }, include: INCLUDE });
}
