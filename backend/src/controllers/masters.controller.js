import prisma from '../utils/prisma.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Map URL entity segment → { model, fields, hasIsActive }
const ENTITY_MAP = {
  'branches': {
    model: 'branch',
    searchFields: ['name'],
    createFields: ['name', 'address', 'phone', 'companyId'],
    updateFields: ['name', 'address', 'phone', 'companyId'],
    hasIsActive: true,
  },
  'lead-sources': {
    model: 'leadSource',
    searchFields: ['name'],
    createFields: ['name', 'defaultChannel'],
    updateFields: ['name', 'defaultChannel'],
    hasIsActive: true,
  },
  'lead-statuses': {
    model: 'leadStatus',
    searchFields: ['name'],
    createFields: ['name', 'color'],
    updateFields: ['name', 'color'],
    hasIsActive: true,
  },
  'pipeline-stages': {
    model: 'pipelineStage',
    searchFields: ['name'],
    createFields: ['name', 'order'],
    updateFields: ['name', 'order'],
    hasIsActive: true,
  },
  'lost-reasons': {
    model: 'lostReason',
    searchFields: ['name'],
    createFields: ['name'],
    updateFields: ['name'],
    hasIsActive: true,
  },
  'customer-categories': {
    model: 'customerCategory',
    searchFields: ['name'],
    createFields: ['name'],
    updateFields: ['name'],
    hasIsActive: true,
  },
  'contact-types': {
    model: 'contactType',
    searchFields: ['name'],
    createFields: ['name'],
    updateFields: ['name'],
    hasIsActive: true,
  },
  'companies': {
    model: 'company',
    searchFields: ['name'],
    createFields: ['name'],
    updateFields: ['name'],
    hasIsActive: true,
  },
};

function getConfig(entity, res) {
  const cfg = ENTITY_MAP[entity];
  if (!cfg) {
    res.status(404).json({ error: `Unknown entity: ${entity}` });
    return null;
  }
  return cfg;
}

function pick(obj, keys) {
  return Object.fromEntries(keys.filter((k) => k in obj).map((k) => [k, obj[k]]));
}

// GET /:entity — paginated list with optional search
export const listMaster = asyncHandler(async (req, res) => {
  const cfg = getConfig(req.params.entity, res);
  if (!cfg) return;

  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const skip  = (page - 1) * limit;
  const search = req.query.search?.trim() || '';

  const where = search
    ? { OR: cfg.searchFields.map((f) => ({ [f]: { contains: search, mode: 'insensitive' } })) }
    : {};

  const [items, total] = await Promise.all([
    prisma[cfg.model].findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma[cfg.model].count({ where }),
  ]);

  res.json({ data: items, total, page, limit, pages: Math.ceil(total / limit) });
});

// GET /:entity/:id
export const getMaster = asyncHandler(async (req, res) => {
  const cfg = getConfig(req.params.entity, res);
  if (!cfg) return;

  const item = await prisma[cfg.model].findUnique({ where: { id: req.params.id } });
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

// POST /:entity
export const createMaster = asyncHandler(async (req, res) => {
  const cfg = getConfig(req.params.entity, res);
  if (!cfg) return;

  const name = req.body.name?.trim();
  if (!name) return res.status(400).json({ error: 'name is required' });

  // Duplicate check
  const existing = await prisma[cfg.model].findUnique({ where: { name } });
  if (existing) return res.status(409).json({ error: `"${name}" already exists` });

  const data = pick(req.body, cfg.createFields);
  data.name = name;

  const item = await prisma[cfg.model].create({ data });
  res.status(201).json(item);
});

// PUT /:entity/:id
export const updateMaster = asyncHandler(async (req, res) => {
  const cfg = getConfig(req.params.entity, res);
  if (!cfg) return;

  const existing = await prisma[cfg.model].findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const name = req.body.name?.trim();
  if (name && name !== existing.name) {
    const dup = await prisma[cfg.model].findUnique({ where: { name } });
    if (dup) return res.status(409).json({ error: `"${name}" already exists` });
  }

  const data = pick(req.body, cfg.updateFields);
  if (name) data.name = name;

  const item = await prisma[cfg.model].update({ where: { id: req.params.id }, data });
  res.json(item);
});

// PATCH /:entity/:id/toggle — activate / deactivate (soft)
export const toggleMaster = asyncHandler(async (req, res) => {
  const cfg = getConfig(req.params.entity, res);
  if (!cfg) return;

  if (!cfg.hasIsActive) {
    return res.status(400).json({ error: 'This entity does not support activation toggle' });
  }

  const existing = await prisma[cfg.model].findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const item = await prisma[cfg.model].update({
    where: { id: req.params.id },
    data: { isActive: !existing.isActive },
  });
  res.json(item);
});
