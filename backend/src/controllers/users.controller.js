import prisma from '../utils/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { hashPassword } from '../utils/hash.js';

// GET /api/users — paginated + search
export const listUsers = asyncHandler(async (req, res) => {
  const page   = Math.max(1, parseInt(req.query.page)  || 1);
  const limit  = Math.min(100, parseInt(req.query.limit) || 20);
  const skip   = (page - 1) * limit;
  const search = req.query.search?.trim() || '';

  const where = search
    ? {
        OR: [
          { name:  { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, role: true,
        branchId: true, isActive: true, createdAt: true,
        branch: { select: { id: true, name: true } },
      },
    }),
    prisma.user.count({ where }),
  ]);

  res.json({ data: users, total, page, limit, pages: Math.ceil(total / limit) });
});

// GET /api/users/:id
export const getUser = asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, name: true, email: true, role: true,
      branchId: true, isActive: true, createdAt: true,
      branch: { select: { id: true, name: true } },
    },
  });
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// POST /api/users
export const createUser = asyncHandler(async (req, res) => {
  const { name, email, password, role, branchId } = req.body;

  if (!name?.trim())     return res.status(400).json({ error: 'name is required' });
  if (!email?.trim())    return res.status(400).json({ error: 'email is required' });
  if (!password?.trim()) return res.status(400).json({ error: 'password is required' });
  if (!role)             return res.status(400).json({ error: 'role is required' });

  const VALID_ROLES = ['ADMIN', 'MANAGER', 'SALES'];
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: `role must be one of ${VALID_ROLES.join(', ')}` });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim() } });
  if (existing) return res.status(409).json({ error: 'Email already in use' });

  const user = await prisma.user.create({
    data: {
      name:     name.trim(),
      email:    email.trim().toLowerCase(),
      password: hashPassword(password),
      role,
      branchId: branchId || null,
    },
    select: {
      id: true, name: true, email: true, role: true,
      branchId: true, isActive: true, createdAt: true,
    },
  });

  res.status(201).json(user);
});

// PUT /api/users/:id
export const updateUser = asyncHandler(async (req, res) => {
  const { name, email, role, branchId, password } = req.body;

  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'User not found' });

  if (role) {
    const VALID_ROLES = ['ADMIN', 'MANAGER', 'SALES'];
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: `role must be one of ${VALID_ROLES.join(', ')}` });
    }
  }

  if (email && email.trim().toLowerCase() !== existing.email) {
    const dup = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (dup) return res.status(409).json({ error: 'Email already in use' });
  }

  const data = {};
  if (name)     data.name     = name.trim();
  if (email)    data.email    = email.trim().toLowerCase();
  if (role)     data.role     = role;
  if (password) data.password = hashPassword(password);
  if (branchId !== undefined) data.branchId = branchId || null;

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data,
    select: {
      id: true, name: true, email: true, role: true,
      branchId: true, isActive: true, createdAt: true,
      branch: { select: { id: true, name: true } },
    },
  });

  res.json(user);
});

// PATCH /api/users/:id/toggle — activate / deactivate
export const toggleUser = asyncHandler(async (req, res) => {
  const existing = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'User not found' });

  // Prevent deactivating yourself
  if (existing.id === req.user.id) {
    return res.status(400).json({ error: 'You cannot deactivate your own account' });
  }

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: !existing.isActive },
    select: {
      id: true, name: true, email: true, role: true,
      branchId: true, isActive: true, createdAt: true,
    },
  });

  res.json(user);
});
