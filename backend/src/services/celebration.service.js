import prisma from '../utils/prisma.js';

const DAY = 86_400_000;
const MAX_RANGE_DAYS = 366;
const CANDIDATE_CAP = 5000;

// 'YYYY-MM-DD' → Date at UTC midnight, otherwise null
function parseDay(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00.000Z`) : null;
}

function utcToday() {
  const n = new Date();
  return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
}

// Every occurrence of a date's month/day that falls inside [from, to]
function occurrencesIn(date, from, to) {
  const month = date.getUTCMonth();
  const day   = date.getUTCDate();
  const out = [];
  for (let y = from.getUTCFullYear(); y <= to.getUTCFullYear(); y++) {
    const occ = new Date(Date.UTC(y, month, day));
    if (occ >= from && occ <= to) out.push(occ);
  }
  return out;
}

function buildEntries(people, from, to, today) {
  const entries = [];
  for (const p of people) {
    for (const occ of occurrencesIn(p.date, from, to)) {
      entries.push({
        id:        `${p.kind}-${p.personId}-${p.occasion}-${occ.getUTCFullYear()}`,
        personId:  p.personId,
        kind:      p.kind,
        name:      p.name,
        phone:     p.phone,
        branch:    p.branch,
        occasion:  p.occasion,
        date:      occ.toISOString(),
        daysAway:  Math.round((occ - today) / DAY),
      });
    }
  }
  return entries.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}

export async function listCelebrations(user, query) {
  const { type = 'all', occasion, branchId, search = '', dateFrom, dateTo } = query;

  const today   = parseDay(query.today) || utcToday();
  const weekEnd = new Date(today.getTime() + 7 * DAY);

  // List window: explicit range if given, otherwise today → +7 days
  let from = parseDay(dateFrom);
  let to   = parseDay(dateTo);
  const hasRange = !!(from || to);
  if (!from) from = hasRange && to ? new Date(to.getTime() - 7 * DAY) : today;
  if (!to)   to   = new Date(from.getTime() + 7 * DAY);
  if (to < from) [from, to] = [to, from];
  if ((to - from) / DAY > MAX_RANGE_DAYS) to = new Date(from.getTime() + MAX_RANGE_DAYS * DAY);
  if (!hasRange) { from = today; to = weekEnd; }

  const term = search.trim();

  // ── Customers (contacts) ──────────────────────────────
  const contactAnd = [
    { isActive: true },
    { OR: [{ dateOfBirth: { not: null } }, { anniversaryDate: { not: null } }] },
  ];
  if (user.role === 'MANAGER') contactAnd.push({ branchId: user.branchId });
  else if (user.role === 'SALES') contactAnd.push({ assignedToId: user.id });
  else if (branchId) contactAnd.push({ branchId });
  if (term) {
    contactAnd.push({
      OR: [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName:  { contains: term, mode: 'insensitive' } },
        { phone:     { contains: term, mode: 'insensitive' } },
      ],
    });
  }

  // ── Staff (users) ─────────────────────────────────────
  const userAnd = [{ isActive: true }, { dateOfBirth: { not: null } }];
  if (user.role === 'ADMIN') { if (branchId) userAnd.push({ branchId }); }
  else userAnd.push({ branchId: user.branchId });
  if (term) {
    userAnd.push({
      OR: [
        { name:  { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ],
    });
  }

  const [contacts, staff] = await Promise.all([
    prisma.contact.findMany({
      where: { AND: contactAnd },
      take: CANDIDATE_CAP,
      select: {
        id: true, firstName: true, lastName: true, phone: true,
        dateOfBirth: true, anniversaryDate: true,
        branch: { select: { name: true } },
      },
    }),
    occasion === 'ANNIVERSARY' ? [] : prisma.user.findMany({
      where: { AND: userAnd },
      take: CANDIDATE_CAP,
      select: { id: true, name: true, email: true, dateOfBirth: true, branch: { select: { name: true } } },
    }),
  ]);

  const people = [];
  for (const c of contacts) {
    const base = {
      kind: 'CUSTOMER', personId: c.id,
      name: `${c.firstName} ${c.lastName}`.trim(), phone: c.phone, branch: c.branch?.name || null,
    };
    if (c.dateOfBirth     && occasion !== 'ANNIVERSARY') people.push({ ...base, occasion: 'BIRTHDAY',    date: c.dateOfBirth });
    if (c.anniversaryDate && occasion !== 'BIRTHDAY')    people.push({ ...base, occasion: 'ANNIVERSARY', date: c.anniversaryDate });
  }
  for (const s of staff) {
    people.push({
      kind: 'STAFF', personId: s.id, name: s.name, phone: null,
      branch: s.branch?.name || null, occasion: 'BIRTHDAY', date: s.dateOfBirth,
    });
  }

  // Stats always cover today → +7 days regardless of the list window
  const week = buildEntries(people, today, weekEnd, today);
  const stats = {
    today:    week.filter((e) => e.daysAway === 0).length,
    upcoming: week.filter((e) => e.daysAway >= 1).length,
  };

  const all = buildEntries(people, from, to, today);
  const counts = {
    all:       all.length,
    customers: all.filter((e) => e.kind === 'CUSTOMER').length,
    staff:     all.filter((e) => e.kind === 'STAFF').length,
  };

  const data = type === 'customers' ? all.filter((e) => e.kind === 'CUSTOMER')
             : type === 'staff'     ? all.filter((e) => e.kind === 'STAFF')
             : all;

  return { data, stats, counts, range: { from: from.toISOString(), to: to.toISOString(), custom: hasRange } };
}
