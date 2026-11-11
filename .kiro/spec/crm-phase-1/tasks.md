# Phase 1 Task List — Jewellery Retail CRM

## Foundation

- [ ] **1. Scaffold monorepo structure** — Create `/frontend` and `/backend` directories, root `.gitignore` (node_modules, .env, dist), and a root `README.md`.
- [ ] **2. Set up backend skeleton** — Initialize Node.js project, install Express, Prisma, JWT, bcrypt, cors, dotenv, morgan. Create `src/app.js`, `src/server.js`, and `.env.example` with `DATABASE_URL`, `JWT_SECRET`, `PORT`.
- [ ] **3. Set up frontend skeleton** — Initialize Vite + React project, install Tailwind CSS, React Router, Recharts, lucide-react, axios. Configure Tailwind, create base `App.jsx` and `main.jsx`, and `.env.example` with `VITE_API_URL`.
- [ ] **4. Define Prisma schema** — Create `prisma/schema.prisma` with all models (User, Branch, LeadSource, LeadStatus, PipelineStage, LostReason, CustomerCategory, Tag, Lead, Customer, Deal, Activity, Visit) per the design doc. Run `prisma migrate dev`.
- [ ] **5. Create database seed script** — Write `prisma/seed.js` to insert default master data (7 pipeline stages, sample lead sources, statuses, lost reasons, customer categories, one branch, and one Admin user). Configure the seed command in `package.json`.

## Authentication

- [ ] **6. Backend: JWT + bcrypt utilities** — Create `utils/jwt.js` (sign/verify token) and `utils/hash.js` (bcrypt hash/compare). Create `utils/prisma.js` Prisma client singleton.
- [ ] **7. Backend: auth middleware** — Create `middleware/auth.middleware.js` to verify JWT from the Authorization header and attach `req.user`. Create `middleware/role.middleware.js` with a `requireRole(...roles)` function. Create `middleware/error.middleware.js` for centralized error handling.
- [ ] **8. Backend: auth routes + controller** — Implement `POST /api/auth/login` (validate credentials, issue JWT) and `GET /api/auth/me` (return current user profile). Wire up `auth.routes.js`.
- [ ] **9. Backend: data scoping helper** — Create `middleware/scope.middleware.js` that builds a Prisma `where` clause based on `req.user.role` and `req.user.branchId`. Admin = no filter, Manager = filter by branch, Sales = filter by assignedToId.
- [ ] **10. Frontend: auth context + API service** — Create `services/api.js` (axios instance with JWT interceptor that attaches token from localStorage). Create `context/AuthContext.jsx` with login, logout, and current user state.
- [ ] **11. Frontend: login page** — Create `pages/Login.jsx` with email/password form, submit to `/api/auth/login`, store token, redirect to dashboard on success. Show error on invalid credentials.
- [ ] **12. Frontend: protected routes + app layout** — Create `routes/ProtectedRoute.jsx` (redirect to login if not authenticated, check role). Create `layouts/AppLayout.jsx` with sidebar navigation and topbar showing user name and role.

## Masters

- [ ] **13. Backend: masters CRUD routes + controller** — Implement generic CRUD for Branches, Lead Sources, Lead Statuses, Pipeline Stages, Lost Reasons, and Customer Categories. Use a shared controller pattern or factory to reduce duplication. Protect all routes with `requireRole('ADMIN')`. Prevent deletion of records referenced by leads/customers/deals.
- [ ] **14. Backend: users CRUD routes + controller** — Implement `users.routes.js` with create (with password hashing), update (role, branch, name), deactivate (set isActive=false), and list. Admin-only access.
- [ ] **15. Frontend: reusable master CRUD components** — Create `components/masters/MasterCrudTable.jsx` (table with add/edit/delete actions) and `components/masters/MasterForm.jsx` (modal form). These are reused across all master pages.
- [ ] **16. Frontend: master pages** — Create individual pages in `pages/masters/` for Branches, Lead Sources, Lead Statuses, Pipeline Stages, Lost Reasons, Customer Categories, and Users. Each page uses the reusable CRUD components wired to the corresponding API endpoints.
- [ ] **17. Frontend: sidebar navigation for masters** — Add a "Masters" section to the sidebar (Admin-only, hidden for Manager and Sales roles).

## Leads and Customers

- [ ] **18. Backend: leads routes + controller + service** — Implement `leads.routes.js` with GET (list with search, filters, pagination), GET/:id (with activities), POST, PUT, DELETE. Apply data scoping. Auto-create an activity record on status change and assignment change.
- [ ] **19. Backend: lead conversion + activities** — Implement `POST /api/leads/:id/convert` (create Customer from Lead, set isConverted). Implement `GET /api/leads/:id/activities` and `POST /api/leads/:id/activities` (manual activity entry).
- [ ] **20. Backend: lead import** — Implement `POST /api/leads/import` using `xlsx` or `csv-parse`. Parse file, validate rows, insert valid rows, return summary with counts and per-row errors.
- [ ] **21. Backend: customers routes + controller + service** — Implement `customers.routes.js` with GET (list with search, filters, pagination), GET/:id, POST, PUT, DELETE. Apply data scoping.
- [ ] **22. Frontend: leads list page** — Create `pages/Leads.jsx` with search bar, filter panel (source, status, branch, assigned staff, tags), paginated table, and add/edit/delete actions. Include empty state when no leads.
- [ ] **23. Frontend: lead detail page** — Create `pages/LeadDetail.jsx` showing lead info, editable form, tags, deal info, and the activity timeline (`components/leads/ActivityTimeline.jsx`). Include a form to add manual activities.
- [ ] **24. Frontend: lead import UI** — Add an import button to the leads list that opens a file picker, uploads Excel/CSV, and displays the import result summary (imported count, failed count, error list).
- [ ] **25. Frontend: customers list page** — Create `pages/Customers.jsx` with search, filters (category, branch, assigned staff), paginated table, and add/edit/delete actions. Include empty state.

## Sales Pipeline

- [ ] **26. Backend: deals routes + controller + service** — Implement `deals.routes.js` with GET (list all deals grouped by stage), GET/:id, POST, PUT, DELETE. Apply data scoping. Implement `PATCH /api/deals/:id/stage` that updates the stage and creates an activity record in a transaction. Enforce lost reason requirement when moving to Lost stage.
- [ ] **27. Frontend: Kanban board** — Create `pages/Pipeline.jsx` with `components/pipeline/KanbanBoard.jsx`. Render columns for all 7 stages. Use a drag-and-drop library (e.g., `@hello-pangea/dnd` or `react-beautiful-dnd`) to move deal cards between columns. On drop, call `PATCH /deals/:id/stage`.
- [ ] **28. Frontend: deal card + deal modal** — Create `components/pipeline/DealCard.jsx` (shows name, value, expected close date) and `components/pipeline/DealModal.jsx` (create/edit deal with stage, value, expected close date, lost reason fields). Lost reason field is required and shown only when stage is Lost.
- [ ] **29. Frontend: lost reason prompt** — WHEN a deal is dragged to the Lost column, show a modal prompting the user to select a lost reason before the stage change is saved. Block the save if no reason is selected.

## Dashboard

- [ ] **30. Backend: dashboard service + routes** — Implement `dashboard.service.js` with functions to calculate the six KPIs, revenue trend, lead lifecycle, and sentiment mix. All accept `period` and `staffId` params and apply data scoping. Wire up `dashboard.routes.js` with four GET endpoints.
- [ ] **31. Frontend: dashboard page + period filter + staff filter** — Create `pages/Dashboard.jsx` with a period filter (Today, This Week, This Month, Last Month) and a staff filter (hidden for Sales role). Fetch all dashboard data on filter change.
- [ ] **32. Frontend: KPI cards** — Create `components/dashboard/KpiCard.jsx` and render six cards: Total Leads, Total Visits, Gross Pipeline, Active Deals, Customer Rating, Conversion. Show empty state (—) when no data.
- [ ] **33. Frontend: dashboard charts** — Create `components/dashboard/RevenueTrendChart.jsx` (Recharts LineChart), `LeadLifecycleChart.jsx` (Recharts BarChart), and `SentimentMixChart.jsx` (Recharts PieChart). Each chart shows an empty state when no data.

## Cross-Cutting

- [ ] **34. Frontend: reusable list components** — Finalize `components/common/EmptyState.jsx`, `Pagination.jsx`, `SearchBar.jsx`, and `FilterPanel.jsx`. Ensure all list pages use these consistently.
- [ ] **35. Backend: input validation** — Add request validation using a library (e.g., `zod` or `express-validator`) on all POST/PUT endpoints. Return 400 with field-specific error messages on validation failure.
- [ ] **36. Frontend: permission helpers** — Create `utils/permissions.js` with helpers like `canAccessMasters(user)`, `canSeeStaffFilter(user)`. Use these in the sidebar and dashboard to conditionally render UI elements.
- [ ] **37. End-to-end verification** — Verify login flow, role-based data scoping (Admin sees all, Manager sees branch, Sales sees own), master CRUD, lead CRUD + import + activity timeline, Kanban drag-and-drop with lost reason, and dashboard KPIs + charts with period/staff filters. Confirm all empty states render correctly.
