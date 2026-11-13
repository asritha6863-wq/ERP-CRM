import { Prisma } from '@prisma/client';
import prisma from '../utils/prisma.js';

const HOUR = 3_600_000;
const wonStage  = { name: { equals: 'Won',  mode: 'insensitive' } };
const lostStage = { name: { equals: 'Lost', mode: 'insensitive' } };

const pctOf = (part, whole) => (whole > 0 ? (part / whole) * 100 : null);

// ── Sales Performance ──────────────────────────────────────────────

export async function salesPerformance(user, query) {
  // Reps = active sales/manager staff. Non-admins only see their own branch.
  const userWhere = { isActive: true, role: { in: ['SALES', 'MANAGER'] } };
  if (user.role === 'ADMIN') { if (query.branchId) userWhere.branchId = query.branchId; }
  else userWhere.branchId = user.branchId;

  const reps = await prisma.user.findMany({ where: userWhere, select: { id: true, name: true } });
  const ids  = reps.map((r) => r.id);

  const empty = {
    totalReps: 0,
    summary: { revenue: 0, conversionRate: null, activePipeline: 0, staffContributing: 0 },
    leaderboard: [], excellence: [],
    efficiency: { taskCompliance: null, followUpHours: null, customerRating: null },
  };
  if (!ids.length) return empty;

  const now = new Date();
  const [wonByOwner, activityByUser, activePipeline, totalLeads, wonLeads, dueReminders, doneReminders, feedback, leadsForFollowUp] =
    await Promise.all([
      prisma.deal.groupBy({
        by: ['ownerId'],
        where: { ownerId: { in: ids }, stage: wonStage },
        _sum: { value: true }, _count: { _all: true },
      }),
      prisma.activity.groupBy({ by: ['userId'], where: { userId: { in: ids } }, _count: { _all: true } }),
      prisma.deal.count({ where: { ownerId: { in: ids }, NOT: [{ stage: wonStage }, { stage: lostStage }] } }),
      prisma.lead.count({ where: { assignedToId: { in: ids } } }),
      prisma.lead.count({ where: { assignedToId: { in: ids }, isWon: true } }),
      prisma.reminder.count({ where: { assignedToId: { in: ids }, dueDate: { lte: now } } }),
      prisma.reminder.count({ where: { assignedToId: { in: ids }, dueDate: { lte: now }, status: 'COMPLETED' } }),
      prisma.feedback.aggregate({ _avg: { rating: true }, where: { lead: { assignedToId: { in: ids } } } }),
      // Most recent leads + their first real activity (anything after the auto "CREATED" entry)
      prisma.lead.findMany({
        where: { assignedToId: { in: ids } },
        orderBy: { createdAt: 'desc' }, take: 1000,
        select: {
          createdAt: true,
          activities: { where: { type: { not: 'CREATED' } }, orderBy: { createdAt: 'asc' }, take: 1, select: { createdAt: true } },
        },
      }),
    ]);

  const won      = new Map(wonByOwner.map((w) => [w.ownerId, { sales: w._sum.value || 0, deals: w._count._all }]));
  const activity = new Map(activityByUser.map((a) => [a.userId, a._count._all]));

  const leaderboard = reps
    .map((r) => ({
      id: r.id, name: r.name,
      interactions: activity.get(r.id) || 0,
      wonDeals:     won.get(r.id)?.deals || 0,
      sales:        won.get(r.id)?.sales || 0,
    }))
    .sort((a, b) => b.sales - a.sales || b.wonDeals - a.wonDeals || b.interactions - a.interactions)
    .map((r, i) => ({ ...r, rank: i + 1 }));

  const gaps = leadsForFollowUp
    .filter((l) => l.activities[0])
    .map((l) => l.activities[0].createdAt - l.createdAt)
    .filter((ms) => ms >= 0);

  return {
    totalReps: reps.length,
    summary: {
      revenue:           leaderboard.reduce((s, r) => s + r.sales, 0),
      conversionRate:    pctOf(wonLeads, totalLeads),
      activePipeline,
      staffContributing: leaderboard.filter((r) => r.interactions > 0 || r.wonDeals > 0).length,
    },
    leaderboard,
    excellence: leaderboard.filter((r) => r.wonDeals > 0).slice(0, 5),
    efficiency: {
      taskCompliance: pctOf(doneReminders, dueReminders),
      followUpHours:  gaps.length ? gaps.reduce((s, g) => s + g, 0) / gaps.length / HOUR : null,
      customerRating: feedback._avg.rating ?? null,
    },
  };
}

// ── Location Wise Sales ────────────────────────────────────────────

// ── CRM Analytics ──────────────────────────────────────────────────

const PERIOD_DAYS = { '7D': 7, '30D': 30, '90D': 90, YEAR: 365 };
const DAY_MS = 86_400_000;

function branchFor(user, branchId) {
  return user.role === 'MANAGER' ? user.branchId : user.role === 'ADMIN' ? branchId : null;
}

function dealScope(user, branchId) {
  if (user.role === 'SALES') return { ownerId: user.id };
  const b = branchFor(user, branchId);
  return b ? { OR: [{ lead: { branchId: b } }, { contact: { branchId: b } }] } : {};
}

// Leads and contacts: Sales sees assigned records, everyone else is branch-scoped
function ownedScope(user, branchId) {
  if (user.role === 'SALES') return { assignedToId: user.id };
  const b = branchFor(user, branchId);
  return b ? { branchId: b } : {};
}

export async function crmAnalytics(user, query) {
  const period = PERIOD_DAYS[query.period] ? query.period : '30D';
  const now    = new Date();
  const since  = new Date(now.getTime() - PERIOD_DAYS[period] * DAY_MS);
  const recent = new Date(now.getTime() - 30 * DAY_MS);
  const year   = now.getFullYear();

  const deals    = dealScope(user, query.branchId);
  const leads    = ownedScope(user, query.branchId);
  const contacts = ownedScope(user, query.branchId);
  const inPeriod = { createdAt: { gte: since } };

  // Monthly won revenue (SQL so it scales); a deal's close month is when it was last updated
  const conds = [
    Prisma.sql`LOWER(s."name") = 'won'`,
    Prisma.sql`EXTRACT(YEAR FROM d."updatedAt") = ${year}::int`,
  ];
  if (user.role === 'SALES') {
    conds.push(Prisma.sql`d."ownerId" = ${user.id}`);
  } else {
    const b = branchFor(user, query.branchId);
    if (b) conds.push(Prisma.sql`COALESCE(c."branchId", l."branchId") = ${b}`);
  }

  const [
    stages, openByStage, totalLeads, qualifiedLeads, pipelineDeals, closedWon,
    sentiment, dbTotal, dbRecent, monthlyRows,
  ] = await Promise.all([
    prisma.pipelineStage.findMany({ select: { id: true, name: true, order: true } }),
    prisma.deal.groupBy({
      by: ['stageId'],
      where: { ...deals, ...inPeriod, NOT: [{ stage: wonStage }, { stage: lostStage }] },
      _sum: { value: true }, _count: { _all: true },
    }),
    prisma.lead.count({ where: { ...leads, ...inPeriod } }),
    prisma.lead.count({ where: { ...leads, ...inPeriod, status: { name: { equals: 'Qualified', mode: 'insensitive' } } } }),
    prisma.deal.count({ where: { ...deals, ...inPeriod } }),
    prisma.deal.count({ where: { ...deals, ...inPeriod, stage: wonStage } }),
    prisma.lead.groupBy({ by: ['sentiment'], where: { ...leads, ...inPeriod }, _count: { _all: true } }),
    prisma.contact.count({ where: { ...contacts, isActive: true } }),
    prisma.contact.count({ where: { ...contacts, isActive: true, updatedAt: { gte: recent } } }),
    prisma.$queryRaw`
      SELECT EXTRACT(MONTH FROM d."updatedAt")::int AS month, COALESCE(SUM(d."value"), 0)::float8 AS value
      FROM "Deal" d
      JOIN "PipelineStage" s ON s."id" = d."stageId"
      LEFT JOIN "Contact" c ON c."id" = d."contactId"
      LEFT JOIN "Lead" l    ON l."id" = d."leadId"
      WHERE ${Prisma.join(conds, ' AND ')}
      GROUP BY 1`,
  ]);

  const stageById = new Map(stages.map((s) => [s.id, s]));
  const distribution = openByStage
    .map((g) => ({
      stage: stageById.get(g.stageId)?.name || 'Unknown',
      order: stageById.get(g.stageId)?.order ?? 99,
      value: g._sum.value || 0,
      count: g._count._all,
    }))
    .sort((a, b) => a.order - b.order);

  const monthly = Array(12).fill(0);
  for (const r of monthlyRows) monthly[r.month - 1] = r.value;

  const sentimentCounts = Object.fromEntries(sentiment.map((s) => [s.sentiment, s._count._all]));

  return {
    period,
    totalPipeline:       distribution.reduce((s, d) => s + d.value, 0),
    activePipelineDeals: distribution.reduce((s, d) => s + d.count, 0),
    distribution,
    database: { total: dbTotal, recentlyActive: dbRecent },
    monthly,
    year,
    funnel: {
      totalLeads, pipelineDeals, qualifiedLeads, closedWon,
      conversionRate: totalLeads > 0 ? Math.min(100, (closedWon / totalLeads) * 100) : 0,
    },
    behavioral: ['POSITIVE', 'NEUTRAL', 'NEGATIVE'].map((k) => ({ label: k, count: sentimentCounts[k] || 0 })),
  };
}

export async function locationSales(user, query) {
  const { branchId, companyId } = query;

  // Aggregated in SQL so it stays fast on large deal tables
  const conds = [Prisma.sql`LOWER(s."name") = 'won'`];
  if (user.role === 'SALES') {
    conds.push(Prisma.sql`d."ownerId" = ${user.id}`);
  } else {
    const scopedBranch = user.role === 'MANAGER' ? user.branchId : branchId;
    if (scopedBranch) conds.push(Prisma.sql`COALESCE(c."branchId", l."branchId") = ${scopedBranch}`);
    if (companyId)    conds.push(Prisma.sql`c."companyId" = ${companyId}`);
  }

  const rows = await prisma.$queryRaw`
    SELECT
      COALESCE(b."name", 'Unknown')                AS branch,
      COALESCE(NULLIF(c."state", ''), 'Unknown')   AS state,
      COALESCE(NULLIF(c."city", ''), 'Unknown')    AS city,
      COALESCE(NULLIF(c."pincode", ''), 'Unknown') AS pincode,
      COUNT(*)::int                                AS orders,
      COALESCE(SUM(d."value"), 0)::float8          AS value
    FROM "Deal" d
    JOIN "PipelineStage" s ON s."id" = d."stageId"
    LEFT JOIN "Contact" c  ON c."id" = d."contactId"
    LEFT JOIN "Lead" l     ON l."id" = d."leadId"
    LEFT JOIN "Branch" b   ON b."id" = COALESCE(c."branchId", l."branchId")
    WHERE ${Prisma.join(conds, ' AND ')}
    GROUP BY 1, 2, 3, 4`;

  const roll = (keyFn, extra = () => ({})) => {
    const map = new Map();
    for (const r of rows) {
      const key = keyFn(r);
      const cur = map.get(key) || { name: key, value: 0, orders: 0, ...extra(r) };
      cur.value  += r.value;
      cur.orders += r.orders;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  };

  const value  = rows.reduce((s, r) => s + r.value, 0);
  const orders = rows.reduce((s, r) => s + r.orders, 0);

  return {
    totals: {
      value, orders,
      average: orders > 0 ? value / orders : 0,
      cities:  new Set(rows.filter((r) => r.city !== 'Unknown').map((r) => `${r.state}|${r.city}`)).size,
    },
    byBranch:  roll((r) => r.branch),
    byState:   roll((r) => r.state),
    byCity:    roll((r) => `${r.state}|${r.city}`, (r) => ({ city: r.city, state: r.state })),
    byPincode: roll((r) => r.pincode, (r) => ({ pincode: r.pincode })),
  };
}
