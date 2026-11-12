# Sales Pipeline — Shared Data Model
## Requirements

### Background

The current schema has `Lead`, `Customer`, and `Deal` as three separate entity families with no unified "person" record underneath them. The same person can appear as a Lead, later as a Customer, and in a Deal — with their phone number duplicated across all three rows, no deduplication, and no single place to look up all their history.

This spec redesigns the shared data layer so that **Contact** becomes the master record for every person, and all pipeline entities (Leads, Deals, Customers) are views or records that hang off that Contact.

---

### R1 — Contact is the master person record

- A **Contact** is a unique person identified by the combination of **(phone, companyId)**.  
- A Contact has a **type** drawn from a user-managed lookup table called **ContactType** (examples: Customer, Employee, Supplier, Custom). Contact types are managed by ADMIN in Masters.  
- A Contact stores: firstName, lastName, phone, email, companyId (FK → Company), branchId, assignedToId, rating, createdAt, updatedAt, and a soft-delete `isActive` flag.  
- Two contacts with the same phone number but different companies are allowed (a person can be a contact at two companies).  
- A Contact with the same phone under the same company must be unique — the DB enforces a unique constraint on `(phone, companyId)`.

### R2 — Lead belongs to Contact; phone lookup on creation

- A **Lead** belongs to exactly one Contact via `contactId` (required).  
- When a Lead is created:
  - If a Contact with matching `(phone, companyId)` already exists → reuse that Contact; set `contactId` to its id.
  - If no match → create a new Contact first, then create the Lead referencing it.
- This applies to both manual entry and bulk import.
- Creating a Lead with a phone that matches an existing Contact must NOT create a duplicate Contact.

### R3 — Lead channel splits the list into two views

- Every Lead has a **channel** field (enum: `OUTDOOR | INSTORE`).  
- **OUTDOOR** leads have sources: Door to Door, Mass Marketing, Referral, Campaign. These appear in the **Leads** list view.  
- **INSTORE** leads have source: Walk In. These appear in the **Instore Leads** list view.  
- Both views query the same `Lead` table, filtered by `channel`.  
- Lead sources remain a master-managed list; each source has a `defaultChannel` that pre-fills the channel when that source is selected.

### R4 — Deal belongs to Contact, optionally a Lead

- A **Deal** belongs to exactly one Contact via `contactId` (required).  
- A Deal optionally belongs to a Lead via `leadId` (nullable). This link is set when a Deal is created from a Lead.  
- Deals are displayed in the **Deals Pipeline** kanban board, grouped by `PipelineStage`.

### R5 — Winning a lead creates or links a Deal

- When a Lead's stage/status moves to **Won**:
  - Option A — a new Deal is created in the "Won" pipeline stage with `value` = the sale amount entered by the user.
  - Option B — the Lead is linked to an existing sales invoice; the Deal `value` is sourced from the invoice amount.
- The winning action is atomic: Lead status update + Deal creation/link happen in a single DB transaction.
- A Lead that is Won gets `isWon = true`; a Lead that is Lost gets `isLost = true` (replaces the existing `isConverted` flag).

### R6 — All lists are server-side paginated and handle 100 000 records

- All list APIs (`GET /leads`, `GET /instore-leads`, `GET /contacts`, `GET /deals` list view) support server-side pagination: `page`, `limit` (max 100).  
- `GET /deals` for the kanban board returns aggregated stage summaries + first-page cards per column, not all records.  
- All paginated queries use Prisma `skip`/`take` with `count` in a `$transaction` for consistency.

### R7 — Indexes

The following database indexes are required for the query patterns above at 100 000 records:

| Table | Index |
|---|---|
| `Contact` | `(phone, companyId)` unique |
| `Contact` | `branchId` |
| `Contact` | `assignedToId` |
| `Lead` | `contactId` |
| `Lead` | `channel` |
| `Lead` | `branchId` |
| `Lead` | `assignedToId` |
| `Lead` | `statusId` |
| `Lead` | `dueDate` |
| `Deal` | `contactId` |
| `Deal` | `leadId` |
| `Deal` | `stageId` |
| `Deal` | `ownerId` |
| `Deal` | `expectedCloseDate` |

### R8 — Top-bar company and branch selectors

- The top bar has an **ALL COMPANIES** selector and an **ALL BRANCHES** selector.  
- These selectors produce a `companyId` and `branchId` filter that is applied globally to every list query.  
- ADMIN: sees all companies and all branches; both selectors are active.  
- MANAGER: company selector active; branch selector locked to their branch.  
- SALES: both selectors locked; sees only records assigned to them.

### R9 — Role-based visibility (unchanged contract, new fields)

| Role | Leads | Instore Leads | Deals | Contacts |
|---|---|---|---|---|
| ADMIN | All | All | All | All |
| MANAGER | Branch-scoped | Branch-scoped | Branch-scoped | Branch-scoped |
| SALES | Assigned only | Assigned only | Owned only | Assigned only |

### R10 — Data migration

- Existing `Lead` rows must be migrated to have a `contactId`.  
- Migration steps:
  1. Create one Contact per unique phone number found in existing Leads (using the Lead's firstName, lastName, email, branchId).
  2. Set `contactId` on every Lead row.
  3. For Leads with no phone, create a Contact with phone = null and mark it `requiresReview = true`.
  4. For phone numbers that appear more than once across existing Leads, flag all those Contacts as `isDuplicate = true` and emit a migration report.
  5. Existing `Customer` records are linked to their Contact via the `Lead.contactId` chain (Customer → Lead → Contact). No new FK is added to Customer in this phase.
  6. Existing `Deal` rows get `contactId` populated from `Deal.lead.contactId` in the same migration script.
