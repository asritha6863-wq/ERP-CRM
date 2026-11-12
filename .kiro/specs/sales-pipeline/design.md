# Sales Pipeline — Shared Data Model
## Design

---

## 1. Prisma Schema

```prisma
// ── New Enums ───────────────────────────────────────────

enum LeadChannel {
  OUTDOOR   // Door to Door, Mass Marketing, Referral, Campaign
  INSTORE   // Walk In
}

// ── New / Replaced Master Tables ───────────────────────

// Replaces the implicit single-company assumption.
model Company {
  id        String   @id @default(cuid())
  name      String   @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  branches  Branch[]
  contacts  Contact[]
}

// ContactType — user-defined, managed in Masters by ADMIN
model ContactType {
  id        String   @id @default(cuid())
  name      String   @unique          // e.g. "Customer", "Employee", "Supplier"
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  contacts  Contact[]
}

// ── Updated Branch ──────────────────────────────────────

model Branch {
  id        String   @id @default(cuid())
  name      String                      // unique within a company
  companyId String
  company   Company  @relation(fields: [companyId], references: [id])
  address   String?
  phone     String?
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users     User[]
  leads     Lead[]
  contacts  Contact[]

  @@unique([name, companyId])
}

// ── Contact — master person record ─────────────────────

model Contact {
  id              String       @id @default(cuid())
  firstName       String
  lastName        String
  phone           String?
  email           String?
  companyId       String
  company         Company      @relation(fields: [companyId], references: [id])
  typeId          String?
  type            ContactType? @relation(fields: [typeId], references: [id])
  branchId        String?
  branch          Branch?      @relation(fields: [branchId], references: [id])
  assignedToId    String?
  assignedTo      User?        @relation("ContactAssignee", fields: [assignedToId], references: [id])
  rating          Int?
  requiresReview  Boolean      @default(false)  // set by migration for phone=null rows
  isDuplicate     Boolean      @default(false)  // set by migration for duplicate phones
  isActive        Boolean      @default(true)
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt

  leads    Lead[]
  deals    Deal[]

  @@unique([phone, companyId])            // R1 uniqueness constraint
  @@index([branchId])                     // R7
  @@index([assignedToId])                 // R7
  @@index([phone])                        // fast lookup on lead creation (R2)
}

// ── Updated Lead ────────────────────────────────────────

model Lead {
  id            String      @id @default(cuid())
  contactId     String                                // R2 — required after migration
  contact       Contact     @relation(fields: [contactId], references: [id])
  channel       LeadChannel @default(OUTDOOR)         // R3 — drives which list it appears in
  firstName     String                                // denormalised copy from Contact for display speed
  lastName      String
  email         String?
  phone         String?
  sourceId      String?
  source        LeadSource? @relation(fields: [sourceId], references: [id])
  statusId      String?
  status        LeadStatus? @relation(fields: [statusId], references: [id])
  branchId      String?
  branch        Branch?     @relation(fields: [branchId], references: [id])
  assignedToId  String?
  assignedTo    User?       @relation("AssignedStaff", fields: [assignedToId], references: [id])
  tags          Tag[]
  sentiment     Sentiment   @default(NEUTRAL)
  rating        Int?
  dueDate       DateTime?                             // new — indexed for follow-up queries
  isWon         Boolean     @default(false)           // R5 — replaces isConverted
  isLost        Boolean     @default(false)           // R5
  isConverted   Boolean     @default(false)           // kept for backward compat during migration
  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  customer   Customer?
  deals      Deal[]
  visits     Visit[]
  activities Activity[]
  feedbacks  Feedback[]

  @@index([contactId])                               // R7
  @@index([channel])                                 // R7 — Leads vs Instore filter
  @@index([branchId])                                // R7
  @@index([assignedToId])                            // R7
  @@index([statusId])                                // R7
  @@index([dueDate])                                 // R7
}

// ── Updated LeadSource — adds defaultChannel ───────────

model LeadSource {
  id             String      @id @default(cuid())
  name           String      @unique
  defaultChannel LeadChannel @default(OUTDOOR)       // R3 — pre-fills channel on selection
  isActive       Boolean     @default(true)
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt

  leads Lead[]
}

// ── Updated Deal ────────────────────────────────────────

model Deal {
  id                String         @id @default(cuid())
  contactId         String                              // R4 — required
  contact           Contact        @relation(fields: [contactId], references: [id])
  leadId            String?                             // R4 — optional
  lead              Lead?          @relation(fields: [leadId], references: [id])
  stageId           String
  stage             PipelineStage  @relation(fields: [stageId], references: [id])
  value             Float          @default(0)
  expectedCloseDate DateTime?
  dueDate           DateTime?
  lostReasonId      String?
  lostReason        LostReason?    @relation(fields: [lostReasonId], references: [id])
  ownerId           String?
  owner             User?          @relation("DealOwner", fields: [ownerId], references: [id])
  invoiceRef        String?                             // R5 — optional link to external invoice
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  @@index([contactId])                                 // R7
  @@index([leadId])                                    // R7
  @@index([stageId])                                   // R7
  @@index([ownerId])                                   // R7
  @@index([expectedCloseDate])                         // R7
}
```

> **Unchanged models** (kept as-is): `User`, `Customer`, `LeadStatus`, `PipelineStage`, `LostReason`, `CustomerCategory`, `Tag`, `Visit`, `Activity`, `Feedback`.

---

## 2. API Design

### Base conventions
- All list endpoints: `GET /api/<resource>?page=1&limit=20&companyId=&branchId=&...`
- All responses: `{ data: [], total, page, limit, pages }`
- Deals kanban: `GET /api/deals/kanban` returns aggregated columns
- Auth header: `Authorization: Bearer <jwt>`

---

### 2.1 Contacts API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/contacts` | Paginated list. Filters: `companyId`, `branchId`, `typeId`, `search` (name/phone/email), `assignedToId` |
| `GET` | `/api/contacts/:id` | Single contact with linked leads + deals counts |
| `POST` | `/api/contacts` | Create contact. Enforces `(phone, companyId)` uniqueness |
| `PUT` | `/api/contacts/:id` | Update contact |
| `DELETE` | `/api/contacts/:id` | Soft delete (`isActive = false`) |
| `GET` | `/api/contacts/:id/leads` | All leads linked to this contact |
| `GET` | `/api/contacts/:id/deals` | All deals linked to this contact |

**Scope rules (same pattern as Leads):**
- ADMIN → no extra filter
- MANAGER → `branchId = user.branchId`
- SALES → `assignedToId = user.id`

---

### 2.2 Leads API (updated)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/leads` | Paginated. `channel=OUTDOOR` by default |
| `GET` | `/api/leads/instore` | Alias: `GET /api/leads?channel=INSTORE` |
| `POST` | `/api/leads` | Create lead. Phone lookup → reuse or create Contact (R2) |
| `PUT` | `/api/leads/:id` | Update |
| `POST` | `/api/leads/:id/win` | Mark Won; body: `{ value, invoiceRef? }` → creates Deal in Won stage (R5) |
| `POST` | `/api/leads/:id/lose` | Mark Lost; body: `{ lostReasonId }` |
| `POST` | `/api/leads/bulk-assign` | Unchanged |
| `POST` | `/api/leads/:id/convert` | Kept for backward compat; internally calls win flow |
| `POST` | `/api/leads/import` | Bulk import; phone lookup per row (R2) |

**Key behaviour — `POST /api/leads`:**
```
1. Normalise phone (strip spaces/dashes)
2. Look up Contact by (phone, companyId)
3. If found  → contactId = existing.id
4. If not    → INSERT Contact, contactId = new.id
5. INSERT Lead with contactId + channel derived from source.defaultChannel
6. Log CREATED activity
7. Return lead + contact
```

**Key behaviour — `POST /api/leads/:id/win`:**
```
prisma.$transaction([
  lead.update({ isWon: true, status: Won }),
  deal.create({ contactId: lead.contactId, leadId: lead.id,
                stageId: wonStage.id, value, invoiceRef }),
  activity.create({ type: STAGE_CHANGE, description: 'Lead won' })
])
```

---

### 2.3 Deals API (updated)

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/deals/kanban` | Kanban columns. Returns `[{ stage, totalValue, count, deals[first 20] }]` |
| `GET` | `/api/deals` | Paginated flat list for reporting |
| `GET` | `/api/deals/:id` | Single deal |
| `POST` | `/api/deals` | Create deal. `contactId` required; `leadId` optional |
| `PUT` | `/api/deals/:id` | Update value / dates / owner |
| `PATCH` | `/api/deals/:id/stage` | Move kanban card `{ stageId, lostReasonId? }` |
| `DELETE` | `/api/deals/:id` | Hard delete |

**Kanban query pattern for 100 000 deals:**
```js
// 1. Aggregate totals per stage — single fast query
const summaries = await prisma.deal.groupBy({
  by: ['stageId'],
  _sum: { value: true },
  _count: { id: true },
  where: scopeFilter,
});

// 2. Fetch first page of cards per stage — parallel
const columns = await Promise.all(
  stages.map(stage =>
    prisma.deal.findMany({
      where: { ...scopeFilter, stageId: stage.id },
      take: 20,
      orderBy: { updatedAt: 'desc' },
      include: { contact: true, owner: true },
    })
  )
);
```
This avoids loading all 100 000 records into memory. Each column lazy-loads more cards via `GET /api/deals?stageId=&page=2`.

---

### 2.4 Top-bar selector API

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/companies` | List all companies (ADMIN only) |
| `GET` | `/api/companies/:id/branches` | Branches for a company |

The selected `companyId` and `branchId` are sent as query params on every list request. The backend validates that the requesting user is allowed to see the requested company/branch before applying the filter.

---

### 2.5 Updated Masters API additions

| Entity | Path | Notes |
|---|---|---|
| Contact Types | `/api/masters/contact-types` | CRUD, ADMIN only |
| Companies | `/api/masters/companies` | CRUD, ADMIN only |
| Lead Sources | `/api/masters/lead-sources` | Existing + add `defaultChannel` field |

---

## 3. Scope Filter (updated `scope.middleware.js`)

```js
// getScopeFilter now accepts optional companyId / branchId from query params
export function getScopeFilter(user, { companyId, branchId } = {}) {
  const filter = {};

  // Company filter — ADMIN can override via query param
  if (companyId) filter.companyId = companyId;

  // Branch filter
  if (user.role === 'ADMIN') {
    if (branchId) filter.branchId = branchId;
    // else no branch filter
  } else if (user.role === 'MANAGER') {
    filter.branchId = user.branchId; // always locked to own branch
  } else {
    // SALES
    filter.assignedToId = user.id;
  }

  return filter;
}
```

---

## 4. Data Migration Plan

### Phase 0 — Pre-migration snapshot
```sql
-- Back up existing counts
SELECT COUNT(*) FROM "Lead";      -- e.g. 4 500
SELECT COUNT(*) FROM "Customer";  -- e.g. 1 200
SELECT COUNT(*) FROM "Deal";      -- e.g. 300
```

### Phase 1 — Schema additions (non-breaking)
Apply via `prisma migrate dev --name add_contacts_channel`:
1. Add `Company` table (seed one default company "Main Company")
2. Add `ContactType` table (seed: Customer, Employee)
3. Add `companyId` to `Branch` (default = Main Company id)
4. Add `Contact` table (no FK constraints on Lead/Deal yet)
5. Add `channel` column to `Lead` (default `OUTDOOR`, nullable during migration)
6. Add `dueDate` to `Lead` and `Deal`
7. Add `isWon`, `isLost` to `Lead`
8. Add `defaultChannel` to `LeadSource`
9. Add `invoiceRef` to `Deal`

### Phase 2 — Back-fill Contacts from Leads (migration script)

```js
// scripts/migrate-contacts.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const defaultCompany = await prisma.company.findFirst();
const phoneMap = new Map(); // phone → Contact.id
const duplicates = [];

const leads = await prisma.lead.findMany({ orderBy: { createdAt: 'asc' } });

for (const lead of leads) {
  const phone = lead.phone?.replace(/\s+/g, '').replace(/-/g, '') || null;
  const key   = `${phone}__${defaultCompany.id}`;

  if (phone && phoneMap.has(key)) {
    // Duplicate phone — reuse existing contact, flag it
    const existingId = phoneMap.get(key);
    await prisma.contact.update({ where: { id: existingId }, data: { isDuplicate: true } });
    await prisma.lead.update({ where: { id: lead.id }, data: { contactId: existingId } });
    duplicates.push({ leadId: lead.id, phone, contactId: existingId });
  } else {
    // Create new Contact
    const contact = await prisma.contact.create({
      data: {
        firstName:      lead.firstName,
        lastName:       lead.lastName,
        phone:          phone,
        email:          lead.email,
        companyId:      defaultCompany.id,
        branchId:       lead.branchId,
        assignedToId:   lead.assignedToId,
        requiresReview: !phone,
      },
    });
    if (phone) phoneMap.set(key, contact.id);
    await prisma.lead.update({ where: { id: lead.id }, data: { contactId: contact.id } });
  }
}
```

### Phase 3 — Back-fill Deal.contactId

```js
const deals = await prisma.deal.findMany({ include: { lead: true } });
for (const deal of deals) {
  if (deal.lead?.contactId) {
    await prisma.deal.update({
      where: { id: deal.id },
      data: { contactId: deal.lead.contactId },
    });
  }
}
```

### Phase 4 — Back-fill Lead.channel from source

```js
const leads = await prisma.lead.findMany({ include: { source: true } });
for (const lead of leads) {
  const channel = lead.source?.defaultChannel ?? 'OUTDOOR';
  await prisma.lead.update({ where: { id: lead.id }, data: { channel } });
}
```

### Phase 5 — Apply NOT NULL constraints

After back-fill is verified:
```sql
ALTER TABLE "Lead" ALTER COLUMN "contactId" SET NOT NULL;
ALTER TABLE "Deal" ALTER COLUMN "contactId" SET NOT NULL;
ALTER TABLE "Lead" ALTER COLUMN "channel"   SET NOT NULL;
```
Apply via `prisma migrate dev --name enforce_not_nulls`.

### Phase 6 — Duplicate report

Emit a CSV `migration-report.csv`:
```
leadId, contactId, phone, firstName, lastName, reason
```
Rows for: `isDuplicate=true` Contacts, `requiresReview=true` Contacts.
ADMIN reviews via `/contacts?isDuplicate=true` filter in the UI.

---

## 5. Frontend Page Changes

| Page | Change |
|---|---|
| **Leads** | Filter by `channel=OUTDOOR` by default. Top-bar company/branch selectors send `companyId`/`branchId` as query params. |
| **Instore Leads** | New route `/instore-leads` — identical to Leads page, pre-filtered `channel=INSTORE`. |
| **Contacts** | New route `/contacts` — master list of people. Shows type, linked lead count, linked deal count. |
| **Deals Pipeline** | Kanban lazy-loads per column. Win modal prompts for `value` + optional `invoiceRef`. |
| **Top Bar** | Company selector (ADMIN only) + Branch selector (ADMIN/MANAGER). Values stored in a new `GlobalFilterContext`. Every API hook reads `companyId`/`branchId` from that context. |
| **Masters** | Add: Contact Types, Companies. Update Lead Sources to show/edit `defaultChannel`. |
