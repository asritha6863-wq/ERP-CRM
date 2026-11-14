import prisma from '../utils/prisma.js';

const CHUNK = 500;

// ── helpers ────────────────────────────────────────────────────────────────
const str = (v) => (v === null || v === undefined ? '' : String(v).trim());

function applyMapping(raw, mapping) {
  const out = {};
  for (const [field, col] of Object.entries(mapping || {})) {
    if (col === null || col === undefined || col === '') continue;
    out[field] = raw[col];
  }
  return out;
}

function normPhone(v) {
  const s = str(v).replace(/\.0+$/, '').replace(/[^\d+]/g, '');
  return s.length >= 5 ? s : null;
}

function parseDate(v) {
  if (v === null || v === undefined || v === '') return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  if (typeof v === 'number') {
    const d = new Date(Math.round((v - 25569) * 86400 * 1000));
    return isNaN(d) ? null : d;
  }
  const s = str(v);
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/); // dd/mm/yyyy
  const d = m ? new Date(Date.UTC(+m[3], +m[2] - 1, +m[1])) : new Date(s);
  return isNaN(d) ? null : d;
}

function splitName(row) {
  let first = str(row.firstName);
  let last = str(row.lastName);
  if (!first && row.name) {
    const parts = str(row.name).split(/\s+/);
    first = parts.shift() || '';
    last = last || parts.join(' ');
  }
  return { first, last };
}

const buildMap = (items) => new Map(items.map((i) => [i.name.toLowerCase(), i]));
const lookup = (map, name) => (name ? map.get(str(name).toLowerCase()) || null : null);

async function inChunks(arr, fn) {
  for (let i = 0; i < arr.length; i += CHUNK) await fn(arr.slice(i, i + CHUNK));
}

async function defaultCompany() {
  const c = await prisma.company.findFirst({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
  if (c) return c;
  return prisma.company.create({ data: { name: 'Main Company' } });
}

const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

// ── Contacts / Customers ───────────────────────────────────────────────────
export async function importContacts(user, rows, mapping) {
  const results = { imported: 0, skipped: 0, errors: [] };
  const company = await defaultCompany();
  const [branches, types, users, existing] = await Promise.all([
    prisma.branch.findMany({ select: { id: true, name: true } }),
    prisma.contactType.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, email: true } }),
    prisma.contact.findMany({ where: { companyId: company.id, phone: { not: null } }, select: { phone: true } }),
  ]);
  const branchMap = buildMap(branches);
  const typeMap = buildMap(types);
  const userMap = buildMap(users);
  for (const u of users) userMap.set(u.email.toLowerCase(), u);
  const seen = new Set(existing.map((c) => c.phone));
  const data = [];

  rows.forEach((raw, idx) => {
    const rowNum = idx + 2;
    try {
      const row = applyMapping(raw, mapping);
      const { first, last } = splitName(row);
      const phone = normPhone(row.phone);
      if (!first && !phone) { results.errors.push({ row: rowNum, error: 'Name or phone is required' }); return; }
      if (phone) {
        if (seen.has(phone)) { results.skipped++; return; }
        seen.add(phone);
      }
      data.push({
        firstName: first || phone,
        lastName: last,
        phone,
        email: str(row.email) || null,
        companyId: company.id,
        typeId: lookup(typeMap, row.type)?.id || null,
        branchId: lookup(branchMap, row.branch)?.id || user.branchId || null,
        assignedToId: lookup(userMap, row.assignedTo)?.id || user.id,
        city: str(row.city) || null,
        state: str(row.state) || null,
        pincode: str(row.pincode) || null,
        dateOfBirth: parseDate(row.dateOfBirth),
        anniversaryDate: parseDate(row.anniversaryDate),
      });
    } catch (err) {
      results.errors.push({ row: rowNum, error: err.message });
    }
  });

  await inChunks(data, async (chunk) => {
    const r = await prisma.contact.createMany({ data: chunk, skipDuplicates: true });
    results.imported += r.count;
    results.skipped += chunk.length - r.count;
  });
  return results;
}

// ── Leads ──────────────────────────────────────────────────────────────────
export async function importLeads(user, rows, mapping) {
  const results = { imported: 0, skipped: 0, errors: [] };
  const company = await defaultCompany();
  const [sources, branches, users, stages, statuses, existingLeads, existingContacts] = await Promise.all([
    prisma.leadSource.findMany({ select: { id: true, name: true, defaultChannel: true } }),
    prisma.branch.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, email: true } }),
    prisma.pipelineStage.findMany({ select: { id: true, name: true } }),
    prisma.leadStatus.findMany({ select: { id: true, name: true } }),
    prisma.lead.findMany({ where: { phone: { not: null } }, select: { phone: true } }),
    prisma.contact.findMany({ where: { companyId: company.id, phone: { not: null } }, select: { id: true, phone: true } }),
  ]);
  const sourceMap = buildMap(sources);
  const branchMap = buildMap(branches);
  const userMap = buildMap(users);
  for (const u of users) userMap.set(u.email.toLowerCase(), u);
  const stageMap = buildMap(stages);
  const statusMap = buildMap(statuses);
  const leadPhones = new Set(existingLeads.map((l) => l.phone));
  const contactIds = new Map(existingContacts.map((c) => [c.phone, c.id]));

  // Create missing lead sources found in the file
  const newSources = new Set();
  for (const raw of rows) {
    const s = str(applyMapping(raw, mapping).source);
    if (s && !sourceMap.has(s.toLowerCase())) newSources.add(s);
  }
  for (const name of newSources) {
    const created = await prisma.leadSource.upsert({ where: { name }, update: {}, create: { name } });
    sourceMap.set(name.toLowerCase(), created);
  }

  const leads = [];
  const newContacts = [];
  const queuedPhones = new Set();

  rows.forEach((raw, idx) => {
    const rowNum = idx + 2;
    try {
      const row = applyMapping(raw, mapping);
      const { first, last } = splitName(row);
      const phone = normPhone(row.phone);
      if (!first && !phone) { results.errors.push({ row: rowNum, error: 'Name or phone is required' }); return; }
      if (phone) {
        if (leadPhones.has(phone)) { results.skipped++; return; }
        leadPhones.add(phone);
      }
      const source = lookup(sourceMap, row.source);
      const chRaw = str(row.channel).toUpperCase();
      const channel = chRaw.startsWith('IN') ? 'INSTORE' : chRaw.startsWith('OUT') ? 'OUTDOOR' : source?.defaultChannel || 'OUTDOOR';
      const branchId = lookup(branchMap, row.branch)?.id || user.branchId || null;
      const assignedToId = lookup(userMap, row.assignedTo)?.id || user.id;
      const pr = str(row.priority).toUpperCase();

      if (phone && !contactIds.has(phone) && !queuedPhones.has(phone)) {
        queuedPhones.add(phone);
        newContacts.push({
          firstName: first || phone, lastName: last, phone,
          email: str(row.email) || null, companyId: company.id, branchId, assignedToId,
        });
      }
      leads.push({
        _phone: phone,
        firstName: first || phone,
        lastName: last,
        phone,
        altPhone: normPhone(row.altPhone),
        email: str(row.email) || null,
        sourceId: source?.id || null,
        branchId,
        assignedToId,
        createdById: user.id,
        channel,
        area: str(row.area) || null,
        notes: str(row.notes) || null,
        priority: PRIORITIES.includes(pr) ? pr : 'MEDIUM',
        dueDate: parseDate(row.dueDate),
        marriageDate: parseDate(row.marriageDate),
        stageId: lookup(stageMap, row.stage)?.id || null,
        statusId: lookup(statusMap, row.status)?.id || null,
        sentiment: 'NEUTRAL',
      });
    } catch (err) {
      results.errors.push({ row: rowNum, error: err.message });
    }
  });

  await inChunks(newContacts, (chunk) => prisma.contact.createMany({ data: chunk, skipDuplicates: true }));
  if (newContacts.length) {
    const fresh = await prisma.contact.findMany({
      where: { companyId: company.id, phone: { in: newContacts.map((c) => c.phone) } },
      select: { id: true, phone: true },
    });
    for (const c of fresh) contactIds.set(c.phone, c.id);
  }

  const payload = leads.map(({ _phone, ...l }) => ({ ...l, contactId: _phone ? contactIds.get(_phone) || null : null }));
  await inChunks(payload, async (chunk) => {
    const r = await prisma.lead.createMany({ data: chunk });
    results.imported += r.count;
  });
  return results;
}

// ── Masters ────────────────────────────────────────────────────────────────
const MASTER_IMPORTERS = {
  areas: { model: 'area' },
  locations: { model: 'location' },
  channels: { model: 'channel' },
  'lead-sources': { model: 'leadSource' },
  'lead-statuses': { model: 'leadStatus' },
  'pipeline-stages': { model: 'pipelineStage' },
  'lost-reasons': { model: 'lostReason' },
  'contact-types': { model: 'contactType' },
  'customer-categories': { model: 'customerCategory' },
};

export const isImportableMaster = (entity) => Object.prototype.hasOwnProperty.call(MASTER_IMPORTERS, entity);

export async function importMaster(entity, rows, mapping) {
  const results = { imported: 0, skipped: 0, errors: [] };
  const { model } = MASTER_IMPORTERS[entity];
  const existing = await prisma[model].findMany({ select: { name: true } });
  const seen = new Set(existing.map((e) => e.name.toLowerCase()));
  const branches = entity === 'areas' ? await prisma.branch.findMany({ select: { id: true, name: true } }) : [];
  const branchMap = buildMap(branches);
  const data = [];

  rows.forEach((raw, idx) => {
    const rowNum = idx + 2;
    const row = applyMapping(raw, mapping);
    const name = str(row.name);
    if (!name) { results.errors.push({ row: rowNum, error: 'Name is required' }); return; }
    if (seen.has(name.toLowerCase())) { results.skipped++; return; }
    seen.add(name.toLowerCase());
    const rec = { name };
    if (entity === 'areas') {
      const b = str(row.branch);
      if (b) {
        const br = lookup(branchMap, b);
        if (!br) { results.errors.push({ row: rowNum, error: `Branch "${b}" not found` }); return; }
        rec.branchId = br.id;
      }
      rec.pincode = str(row.pincode) || null;
      rec.locations = str(row.locations) || null;
    }
    if (entity === 'pipeline-stages' && row.order !== undefined && row.order !== '') rec.order = parseInt(row.order, 10) || 0;
    data.push(rec);
  });

  await inChunks(data, async (chunk) => {
    const r = await prisma[model].createMany({ data: chunk, skipDuplicates: true });
    results.imported += r.count;
  });
  return results;
}
