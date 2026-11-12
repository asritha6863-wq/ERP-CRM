# Sales Pipeline — Shared Data Model
## Implementation Tasks

---

- [ ] **Task 1 — Prisma schema: add Company, ContactType, Contact models**
  - Add `Company` model with `name`, `isActive`
  - Add `ContactType` model with `name`, `isActive`
  - Add `companyId` to `Branch` (nullable, FK → Company)
  - Add `Contact` model with all fields, `@@unique([phone, companyId])`, and all indexes from R7
  - Add `typeId` FK on `Contact` → `ContactType`
  - Run `prisma migrate dev --name add_contact_model`

- [ ] **Task 2 — Prisma schema: update Lead and Deal**
  - Add `contactId` (nullable String) to `Lead`
  - Add `channel` (LeadChannel enum, default OUTDOOR) to `Lead`
  - Add `dueDate` (DateTime?) to `Lead`
  - Add `isWon` and `isLost` (Boolean, default false) to `Lead`
  - Add `@@index` entries on `Lead` per R7
  - Add `contactId` (nullable String) to `Deal`
  - Make `Deal.leadId` nullable
  - Add `dueDate` and `invoiceRef` to `Deal`
  - Add `@@index` entries on `Deal` per R7
  - Add `defaultChannel` to `LeadSource`
  - Run `prisma migrate dev --name update_lead_deal_for_contacts`

- [ ] **Task 3 — Migration script: back-fill Contacts**
  - Create `backend/scripts/migrate-contacts.js`
  - Seed default Company "Main Company" if none exists
  - Create Contact per unique (phone, companyId) from existing Leads
  - Set `isDuplicate=true` on Contacts with repeated phone
  - Set `requiresReview=true` on Contacts where phone is null
  - Update every `Lead.contactId` and `Lead.channel`
  - Update every `Deal.contactId` via lead chain
  - Emit `migration-report.csv` listing duplicates and review items

- [ ] **Task 4 — Contacts service and controller**
  - Create `backend/src/services/contact.service.js`
    - `listContacts({ user, companyId, branchId, typeId, search, page, limit })`
    - `getContact(id, user)`
    - `createContact(data, user)` — enforces `(phone, companyId)` uniqueness with Prisma unique catch
    - `updateContact(id, data, user)`
    - `softDeleteContact(id, user)` — sets `isActive=false`
    - `getContactLeads(id, user, pagination)`
    - `getContactDeals(id, user, pagination)`
  - Create `backend/src/controllers/contacts.controller.js`
  - Create `backend/src/routes/contacts.routes.js`
  - Register `/api/contacts` in `app.js`

- [ ] **Task 5 — Update Lead creation to use phone lookup**
  - In `lead.service.js`, update `createLead()`:
    - Normalise phone (strip spaces, dashes, country code prefix)
    - Look up `Contact` by `(phone, companyId)`
    - If found: use existing `contactId`
    - If not: create Contact, use new `contactId`
    - Derive `channel` from `source.defaultChannel` if not provided
  - Update `importLeads()` in `import.service.js` with same phone lookup logic per row

- [ ] **Task 6 — Lead win / lose endpoints**
  - Add `POST /api/leads/:id/win` route and handler
    - Body: `{ value: Float, invoiceRef?: String }`
    - Transaction: update Lead (isWon, statusId→Won), create Deal in Won stage, log activity
  - Add `POST /api/leads/:id/lose` route and handler
    - Body: `{ lostReasonId: String }`
    - Transaction: update Lead (isLost, statusId→Lost), log activity
  - Remove old `POST /api/leads/:id/convert` or keep as deprecated alias

- [ ] **Task 7 — Update scope middleware for company/branch selectors**
  - Update `getScopeFilter(user, { companyId, branchId })` signature
  - ADMIN: apply `companyId` and/or `branchId` from query params if provided
  - MANAGER: always apply `branchId = user.branchId`; ignore query param override
  - SALES: always apply `assignedToId = user.id`; ignore both selectors
  - Update all controllers (leads, contacts, deals, customers) to pass `req.query` selectors into `getScopeFilter`

- [ ] **Task 8 — Update Deals service for kanban performance**
  - Add `GET /api/deals/kanban` endpoint
    - Use `prisma.deal.groupBy` for stage summaries (count + totalValue)
    - Fetch first 20 cards per stage in parallel with `Promise.all`
    - Return `[{ stage, count, totalValue, deals[] }]`
  - Add `GET /api/deals` flat paginated list (for reports view)
  - Update `POST /api/deals` to require `contactId`
  - Update scope filter to use updated `getScopeFilter`

- [ ] **Task 9 — Masters API additions**
  - Add `contact-types` and `companies` to `ENTITY_MAP` in `masters.controller.js`
  - Seed default ContactTypes: Customer, Employee
  - Update `lead-sources` master to expose and accept `defaultChannel` field
  - Update `branches` master to expose and accept `companyId` field

- [ ] **Task 10 — Frontend: GlobalFilterContext**
  - Create `frontend/src/context/GlobalFilterContext.jsx`
    - State: `{ companyId, branchId }`
    - ADMIN: both selectors active, reads from `/api/companies`
    - MANAGER: companyId derived from `user.branchId → branch.companyId`; branchId locked
    - SALES: both null, selectors hidden
  - Add company + branch dropdowns to `Topbar.jsx`
  - Wrap app in `GlobalFilterProvider` in `App.jsx`

- [ ] **Task 11 — Frontend: update useLeads and useDeals hooks**
  - `useLeads(channel)` — accept `channel` param (OUTDOOR / INSTORE); pass `companyId`, `branchId` from GlobalFilterContext in every request
  - `useDeals()` — call `/api/deals/kanban`; lazy-load more cards per column via `loadMoreDealsForStage(stageId, page)`
  - `useContacts()` — new hook, same pattern as `useLeads`

- [ ] **Task 12 — Frontend: Leads and Instore Leads pages**
  - `LeadsPage.jsx` — pass `channel="OUTDOOR"` to `useLeads`; no other changes needed
  - New `InstoreLeadsPage.jsx` — copy of LeadsPage with `channel="INSTORE"`, different title/icon
  - Add `/instore-leads` route in `routes/index.jsx`
  - Add "Instore Leads" entry to `Sidebar.jsx`

- [ ] **Task 13 — Frontend: Contacts page**
  - New `ContactsPage.jsx` — paginated DataTable
    - Columns: Name, Phone, Email, Type, Branch, Assigned To, Leads (count), Deals (count), Actions
    - `isDuplicate` rows highlighted with a warning badge
    - `requiresReview` rows highlighted with an info badge
  - New `ContactFormModal.jsx` — create/edit contact; phone field shows "existing contact found" hint on match
  - Add `/contacts` route in `routes/index.jsx`
  - Add "Contacts" entry to `Sidebar.jsx`

- [ ] **Task 14 — Frontend: Deal win modal on LeadsPage**
  - Add "Mark Won" button on LeadDetailPage and LeadsPage row actions
  - `WinLeadModal.jsx` — inputs: Sale Value (required), Invoice Ref (optional)
  - On submit: call `POST /api/leads/:id/win`, then refresh lead and open pipeline tab

- [ ] **Task 15 — Masters UI additions**
  - Add Contact Types to master config list in `configs.jsx`
  - Add Companies to master config list
  - Update Lead Sources master screen to show `defaultChannel` column (dropdown: OUTDOOR / INSTORE)
