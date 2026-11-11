import prisma from '../utils/prisma.js';

// Processes parsed rows from CSV/Excel import.
// mapping: { name, phone, email, source, branch, assignedStaff } → column index or header name
// rows: array of objects (header-keyed) or arrays (index-keyed)
export async function importLeads(user, rows, mapping) {
  const results = { imported: 0, skipped: 0, errors: [] };
  const BATCH   = 100; // Process in batches for memory efficiency

  // Pre-load lookup maps once
  const [sources, branches, users] = await Promise.all([
    prisma.leadSource.findMany({ select: { id: true, name: true } }),
    prisma.branch.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, email: true } }),
  ]);

  const sourceMap = buildMap(sources);
  const branchMap = buildMap(branches);
  const userMap   = buildMap(users);

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    for (const [batchIdx, raw] of batch.entries()) {
      const rowNum = i + batchIdx + 2; // 1-indexed, row 1 = header
      try {
        const row = applyMapping(raw, mapping);

        // Required field validation
        const firstName = row.firstName?.trim();
        const lastName  = row.lastName?.trim();
        const phone     = row.phone?.trim();

        if (!firstName) { results.errors.push({ row: rowNum, error: 'firstName is required' }); continue; }
        if (!lastName)  { results.errors.push({ row: rowNum, error: 'lastName is required' });  continue; }

        // Skip duplicate by phone
        if (phone) {
          const dup = await prisma.lead.findFirst({ where: { phone } });
          if (dup) { results.skipped++; continue; }
        }

        // Resolve FK lookups (fuzzy name match, case-insensitive)
        const sourceId     = row.source     ? lookupId(sourceMap, row.source)     : null;
        const branchId     = row.branch     ? lookupId(branchMap, row.branch)     : null;
        const assignedToId = row.assignedTo ? lookupId(userMap,   row.assignedTo) : null;

        await prisma.lead.create({
          data: {
            firstName,
            lastName,
            email:        row.email?.trim()  || null,
            phone:        phone              || null,
            sourceId,
            branchId,
            assignedToId: assignedToId || user.id, // default to uploader
            sentiment:    'NEUTRAL',
          },
        });

        results.imported++;
      } catch (err) {
        results.errors.push({ row: rowNum, error: err.message || 'Unknown error' });
      }
    }
  }

  return results;
}

// Map a raw row through the user-defined column mapping
function applyMapping(raw, mapping) {
  const out = {};
  for (const [field, col] of Object.entries(mapping)) {
    if (col === null || col === undefined || col === '') continue;
    // col can be a header name (string) or column index (number)
    out[field] = typeof col === 'number' ? raw[col] : raw[col];
  }
  return out;
}

function buildMap(items) {
  return new Map(items.map((i) => [i.name.toLowerCase(), i.id]));
}

function lookupId(map, name) {
  return map.get(name?.trim().toLowerCase()) || null;
}
