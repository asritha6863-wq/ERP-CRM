# Phase 1 Design — Jewellery Retail CRM

## Architecture Overview

Monorepo with a React + Vite frontend and a Node.js + Express + Prisma backend. The frontend communicates with the backend via a REST API secured with JWT. PostgreSQL is the database, managed through Prisma ORM.

```
┌─────────────────┐        REST / JSON         ┌─────────────────┐
│   Frontend       │  ←──────────────────────→  │   Backend        │
│   React + Vite   │   JWT in Auth header       │   Express + Prisma │
│   (Vercel)       │                            │   (Render)        │
└─────────────────┘                            └────────┬────────┘
                                                        │
                                               ┌────────▼────────┐
                                               │   PostgreSQL     │
                                               │   (Render)       │
                                               └─────────────────┘
```

---

## Database Schema (Prisma)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  ADMIN
  MANAGER
  SALES
}

enum Sentiment {
  POSITIVE
  NEUTRAL
  NEGATIVE
}

model User {
  id           String     @id @default(cuid())
  email        String     @unique
  password     String
  name         String
  role         Role       @default(SALES)
  branchId     String?
  branch       Branch?    @relation(fields: [branchId], references: [id])
  isActive     Boolean    @default(true)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  leads        Lead[]      @relation("AssignedStaff")
  customers    Customer[]  @relation("AssignedStaff")
  activities   Activity[]
  deals        Deal[]      @relation("DealOwner")
  visits       Visit[]
}

model Branch {
  id         String    @id @default(cuid())
  name        String    @unique
  address     String?
  phone       String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  users       User[]
  leads       Lead[]
  customers   Customer[]
}

model LeadSource {
  id         String    @id @default(cuid())
  name        String    @unique
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  leads       Lead[]
}

model LeadStatus {
  id         String    @id @default(cuid())
  name        String    @unique
  color       String    @default("#6b7280")
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  leads       Lead[]
}

model PipelineStage {
  id         String    @id @default(cuid())
  name        String    @unique
  order       Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deals       Deal[]
}

model LostReason {
  id         String    @id @default(cuid())
  name        String    @unique
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  deals       Deal[]
}

model CustomerCategory {
  id         String    @id @default(cuid())
  name        String    @unique
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  customers   Customer[]
}

model Tag {
  id         String    @id @default(cuid())
  name        String    @unique
  leads       Lead[]
}

model Lead {
  id            String         @id @default(cuid())
  firstName     String
  lastName      String
  email         String?
  phone         String?
  sourceId      String?
  source        LeadSource?    @relation(fields: [sourceId], references: [id])
  statusId      String?
  status        LeadStatus?    @relation(fields: [statusId], references: [id])
  branchId      String?
  branch        Branch?        @relation(fields: [branchId], references: [id])
  assignedToId  String?
  assignedTo    User?          @relation("AssignedStaff", fields: [assignedToId], references: [id])
  tags          Tag[]
  sentiment     Sentiment      @default(NEUTRAL)
  rating        Int?           // 1-5 customer rating
  isConverted   Boolean        @default(false)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  customer      Customer?
  deals         Deal[]
  activities    Activity[]
  visits        Visit[]
}

model Customer {
  id            String             @id @default(cuid())
  leadId        String?            @unique
  lead          Lead?              @relation(fields: [leadId], references: [id])
  firstName     String
  lastName      String
  email         String?
  phone         String?
  categoryId    String?
  category      CustomerCategory?  @relation(fields: [categoryId], references: [id])
  branchId      String?
  branch        Branch?            @relation(fields: [branchId], references: [id])
  assignedToId  String?
  assignedTo    User?              @relation("AssignedStaff", fields: [assignedToId], references: [id])
  rating        Int?
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
}

model Deal {
  id               String         @id @default(cuid())
  leadId           String
  lead             Lead           @relation(fields: [leadId], references: [id])
  stageId          String
  stage            PipelineStage  @relation(fields: [stageId], references: [id])
  value            Float          @default(0)
  expectedCloseDate DateTime?
  lostReasonId     String?
  lostReason       LostReason?    @relation(fields: [lostReasonId], references: [id])
  ownerId          String?
  owner            User?          @relation("DealOwner", fields: [ownerId], references: [id])
  createdAt        DateTime       @default(now())
  updatedAt        DateTime       @updatedAt
}

model Activity {
  id          String    @id @default(cuid())
  leadId      String
  lead        Lead      @relation(fields: [leadId], references: [id])
  userId      String?
  user        User?     @relation(fields: [userId], references: [id])
  type        String    // 'NOTE' | 'CALL' | 'VISIT' | 'STATUS_CHANGE' | 'ASSIGNMENT' | 'STAGE_CHANGE'
  description  String
  createdAt   DateTime  @default(now())
}

model Visit {
  id          String    @id @default(cuid())
  leadId      String
  lead        Lead      @relation(fields: [leadId], references: [id])
  userId      String?
  user        User?     @relation(fields: [userId], references: [id])
  date        DateTime
  notes       String?
  createdAt   DateTime  @default(now())
}
```

### Key Schema Decisions

- **Lead ↔ Customer**: A customer can originate from a lead (via `leadId` foreign key) or be created independently. `Lead.isConverted` flags conversion.
- **Tags**: Many-to-many between Lead and Tag via implicit Prisma relation table.
- **Activity timeline**: Single `Activity` model with a `type` discriminator for all activity kinds. Stage changes and assignments auto-generate activity records.
- **Data scoping**: Enforced at the query layer in the backend using the authenticated user's role and branch ID — not via database-level row security.
- **Soft relationships**: Most foreign keys are optional (`String?`) so leads can be created with partial data and linked to master records later.

---

## API Endpoints

All endpoints are prefixed with `/api`. All non-auth endpoints require a valid JWT Bearer token.

### Authentication

| Method | Path                | Description                          | Access         |
|--------|---------------------|--------------------------------------|----------------|
| POST   | /auth/login         | Login with email + password          | Public         |
| GET    | /auth/me            | Get current user profile             | Authenticated  |

### Masters (Admin only)

| Method | Path                          | Description                    |
|--------|-------------------------------|--------------------------------|
| GET    | /branches                     | List all branches              |
| POST   | /branches                     | Create a branch                |
| PUT    | /branches/:id                 | Update a branch                |
| DELETE | /branches/:id                 | Delete a branch                |
| GET    | /lead-sources                 | List lead sources              |
| POST   | /lead-sources                 | Create a lead source           |
| PUT    | /lead-sources/:id             | Update a lead source           |
| DELETE | /lead-sources/:id             | Delete a lead source           |
| GET    | /lead-statuses                | List lead statuses             |
| POST   | /lead-statuses                | Create a lead status           |
| PUT    | /lead-statuses/:id            | Update a lead status           |
| DELETE | /lead-statuses/:id            | Delete a lead status           |
| GET    | /pipeline-stages              | List pipeline stages           |
| POST   | /pipeline-stages              | Create a pipeline stage        |
| PUT    | /pipeline-stages/:id          | Update a pipeline stage        |
| DELETE | /pipeline-stages/:id           | Delete a pipeline stage        |
| GET    | /lost-reasons                 | List lost reasons              |
| POST   | /lost-reasons                 | Create a lost reason           |
| PUT    | /lost-reasons/:id             | Update a lost reason           |
| DELETE | /lost-reasons/:id             | Delete a lost reason           |
| GET    | /customer-categories           | List customer categories       |
| POST   | /customer-categories           | Create a customer category     |
| PUT    | /customer-categories/:id       | Update a customer category     |
| DELETE | /customer-categories/:id       | Delete a customer category     |
| GET    | /users                        | List users                     |
| POST   | /users                        | Create a user                 |
| PUT    | /users/:id                    | Update a user                 |
| DELETE | /users/:id                    | Deactivate a user             |

### Leads

| Method | Path                        | Description                         | Access               |
|--------|-----------------------------|-------------------------------------|----------------------|
| GET    | /leads                      | List leads (search, filter, paginate) | Scoped by role     |
| GET    | /leads/:id                  | Get a single lead with activity timeline | Scoped by role  |
| POST   | /leads                      | Create a lead                       | Scoped by role        |
| PUT    | /leads/:id                  | Update a lead                       | Scoped by role        |
| DELETE | /leads/:id                  | Delete a lead                       | Scoped by role        |
| POST   | /leads/:id/convert          | Convert lead to customer            | Scoped by role        |
| POST   | /leads/import               | Import leads from Excel/CSV         | Scoped by role        |
| GET    | /leads/:id/activities        | Get activity timeline for a lead    | Scoped by role        |
| POST   | /leads/:id/activities        | Add a manual activity to a lead     | Scoped by role        |

### Customers

| Method | Path                        | Description                          | Access            |
|--------|-----------------------------|-------------------------------------|-------------------|
| GET    | /customers                  | List customers (search, filter, paginate) | Scoped by role |
| GET    | /customers/:id              | Get a single customer               | Scoped by role     |
| POST   | /customers                  | Create a customer                   | Scoped by role     |
| PUT    | /customers/:id              | Update a customer                   | Scoped by role     |
| DELETE | /customers/:id              | Delete a customer                   | Scoped by role     |

### Deals / Pipeline

| Method | Path                        | Description                         | Access            |
|--------|-----------------------------|-------------------------------------|-------------------|
| GET    | /deals                      | List deals (grouped by stage for Kanban) | Scoped by role |
| GET    | /deals/:id                  | Get a single deal                   | Scoped by role     |
| POST   | /deals                      | Create a deal                       | Scoped by role     |
| PUT    | /deals/:id                  | Update a deal (stage, value, date)  | Scoped by role     |
| PATCH   | /deals/:id/stage           | Move a deal to a new stage          | Scoped by role     |
| DELETE | /deals/:id                  | Delete a deal                       | Scoped by role     |

### Dashboard

| Method | Path                              | Description                                     | Access            |
|--------|-----------------------------------|-------------------------------------------------|-------------------|
| GET    | /dashboard/kpis                   | Get six KPI values (?period=&staffId=)          | Scoped by role    |
| GET    | /dashboard/revenue-trend          | Get revenue trend chart data (?period=&staffId=) | Scoped by role   |
| GET    | /dashboard/lead-lifecycle         | Get lead lifecycle bar chart data               | Scoped by role    |
| GET    | /dashboard/sentiment-mix         | Get sentiment mix chart data                    | Scoped by role    |

### Query Parameter Conventions

- **Pagination**: `?page=1&limit=20`
- **Search**: `?search=keyword`
- **Filters**: `?sourceId=&statusId=&branchId=&assignedToId=&tagId=`
- **Period**: `?period=today|this_week|this_month|last_month`
- **Staff filter**: `?staffId=<userId>`

---

## Folder Structure

```
/
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                    # Reusable UI primitives (Button, Input, Card, Modal, etc.)
│   │   │   ├── layout/                # Sidebar, Topbar, PageContainer
│   │   │   ├── common/                # EmptyState, Pagination, SearchBar, FilterPanel
│   │   │   ├── leads/                 # Lead-specific components (LeadForm, LeadTable, ActivityTimeline)
│   │   │   ├── pipeline/             # KanbanBoard, KanbanColumn, DealCard, DealModal
│   │   │   ├── dashboard/            # KpiCard, RevenueTrendChart, LeadLifecycleChart, SentimentMixChart
│   │   │   └── masters/             # MasterCrudTable, MasterForm
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Leads.jsx
│   │   │   ├── LeadDetail.jsx
│   │   │   ├── Customers.jsx
│   │   │   ├── Pipeline.jsx
│   │   │   └── masters/
│   │   │       ├── Branches.jsx
│   │   │       ├── LeadSources.jsx
│   │   │       ├── LeadStatuses.jsx
│   │   │       ├── PipelineStages.jsx
│   │   │       ├── LostReasons.jsx
│   │   │       ├── CustomerCategories.jsx
│   │   │       └── Users.jsx
│   │   ├── layouts/
│   │   │   └── AppLayout.jsx          # Sidebar + topbar wrapper for authenticated pages
│   │   ├── routes/
│   │   │   ├── index.jsx             # Route definitions
│   │   │   └── ProtectedRoute.jsx     # Auth guard + role guard
│   │   ├── context/
│   │   │   └── AuthContext.jsx        # Current user, login, logout
│   │   ├── services/
│   │   │   └── api.js                 # Axios instance with JWT interceptor
│   │   ├── hooks/
│   │   │   ├── useAuth.js
│   │   │   ├── useLeads.js
│   │   │   ├── useDeals.js
│   │   │   └── useDashboard.js
│   │   ├── utils/
│   │   │   ├── permissions.js         # Role-based permission helpers
│   │   │   └── format.js             # Date, currency, number formatters
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── .env.example
│
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.routes.js
│   │   │   ├── masters.routes.js      # Branches, sources, statuses, stages, lost reasons, categories
│   │   │   ├── users.routes.js
│   │   │   ├── leads.routes.js
│   │   │   ├── customers.routes.js
│   │   │   ├── deals.routes.js
│   │   │   └── dashboard.routes.js
│   │   ├── controllers/
│   │   │   ├── auth.controller.js
│   │   │   ├── masters.controller.js
│   │   │   ├── users.controller.js
│   │   │   ├── leads.controller.js
│   │   │   ├── customers.controller.js
│   │   │   ├── deals.controller.js
│   │   │   └── dashboard.controller.js
│   │   ├── middleware/
│   │   │   ├── auth.middleware.js     # JWT verification
│   │   │   ├── role.middleware.js     # Role-based access control (requireRole)
│   │   │   ├── scope.middleware.js   # Data scoping helper
│   │   │   └── error.middleware.js    # Centralized error handler
│   │   ├── services/
│   │   │   ├── lead.service.js       # Business logic + data scoping
│   │   │   ├── deal.service.js
│   │   │   ├── customer.service.js
│   │   │   ├── dashboard.service.js
│   │   │   └── import.service.js     # Excel/CSV parsing + validation
│   │   ├── utils/
│   │   │   ├── jwt.js
│   │   │   ├── hash.js
│   │   │   └── prisma.js             # Prisma client singleton
│   │   ├── app.js                    # Express app setup
│   │   └── server.js                 # Entry point
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js                    # Seed default master data + admin user
│   ├── package.json
│   └── .env.example
│
├── .gitignore
└── README.md
```

### Key Design Decisions

- **Data scoping in services, not middleware**: The service layer reads the authenticated user from the request context and applies `where` clauses to Prisma queries based on role. This keeps scoping logic in one testable place per entity.
- **Centralized error handling**: A single `error.middleware.js` catches all thrown errors and formats the response. Controllers use `asyncHandler` wrappers to avoid try/catch boilerplate.
- **Import service**: Uses `xlsx` or `csv-parse` to parse uploaded files, validates each row, and returns a summary with per-row errors.
- **Drag-and-drop stage updates**: The `PATCH /deals/:id/stage` endpoint is lightweight — it updates the stage and creates an activity entry in a single transaction.
- **Dashboard queries**: Period filtering is resolved to date ranges in `dashboard.service.js` and applied as `createdAt` bounds. Staff filter narrows the `assignedToId` / `ownerId` scope.
