# Phase 1 Requirements — Jewellery Retail CRM

## 1. Authentication

### 1.1 Login

- **REQ-AUTH-01** The system shall authenticate a user with a valid email address and password.
- **REQ-AUTH-02** WHEN a user submits valid credentials, the system shall issue a JWT access token containing the user ID, role, and branch ID.
- **REQ-AUTH-03** WHEN a user submits invalid credentials, the system shall return a 401 authentication error and not issue a token.
- **REQ-AUTH-04** IF the user account is inactive, the system shall deny login and return a message indicating the account is disabled.
- **REQ-AUTH-05** The system shall store passwords using a one-way hash (bcrypt) and shall never store or return plaintext passwords.

### 1.2 Session

- **REQ-AUTH-06** The system shall include the JWT in the Authorization header (Bearer token) for all authenticated API requests.
- **REQ-AUTH-07** WHEN the JWT is missing, expired, or invalid, the system shall return a 401 error and the frontend shall redirect the user to the login page.
- **REQ-AUTH-08** The system shall provide a `GET /api/auth/me` endpoint that returns the current authenticated user's profile.

### 1.3 Role-Based Data Scoping

- **REQ-AUTH-09** IF the authenticated user's role is Admin, the system shall grant access to all data across all branches.
- **REQ-AUTH-10** IF the authenticated user's role is Manager, the system shall restrict data access to records belonging to staff within the Manager's assigned branch.
- **REQ-AUTH-11** IF the authenticated user's role is Sales, the system shall restrict data access to records assigned to that user only.
- **REQ-AUTH-12** The system shall enforce role-based data scoping on every API endpoint that returns lead, customer, deal, or activity data.

## 2. Masters

### 2.1 Master Data CRUD

- **REQ-MASTER-01** The system shall provide create, read, update, and delete (CRUD) operations for the following master entities: Branches, Lead Sources, Lead Statuses, Pipeline Stages, Lost Reasons, Customer Categories, and Users.
- **REQ-MASTER-02** IF the authenticated user's role is not Admin, the system shall deny access to master data management endpoints and return a 403 error.
- **REQ-MASTER-03** WHEN an Admin creates a master record, the system shall store it and make it available for selection in all related forms (leads, customers, deals).
- **REQ-MASTER-04** WHEN an Admin attempts to delete a master record that is referenced by existing leads, customers, or deals, the system shall prevent the deletion and return a constraint error message.
- **REQ-MASTER-05** The system shall require a unique name for each master entity record within its entity type.

### 2.2 Users Management

- **REQ-MASTER-06** The system shall allow an Admin to create user accounts with a name, email, password, role (Admin, Manager, Sales), and branch assignment.
- **REQ-MASTER-07** The system shall allow an Admin to update a user's role and branch assignment.
- **REQ-MASTER-08** The system shall allow an Admin to deactivate a user account without deleting it, preventing the user from logging in.
- **REQ-MASTER-09** The system shall allow an Admin to reset a user's password.

## 3. Leads and Customers

### 3.1 Lead Management

- **REQ-LEAD-01** The system shall allow users to create a lead with the following fields: first name, last name, email, phone, lead source, lead status, branch, assigned staff member, and tags.
- **REQ-LEAD-02** The system shall allow users to edit an existing lead.
- **REQ-LEAD-03** The system shall allow users to delete a lead.
- **REQ-LEAD-04** The system shall allow users to assign a lead to a staff member.
- **REQ-LEAD-05** The system shall allow users to add and remove tags on a lead.
- **REQ-LEAD-06** The system shall enforce role-based data scoping on all lead operations per REQ-AUTH-09 through REQ-AUTH-11.

### 3.2 Lead List — Search, Filters, Pagination

- **REQ-LEAD-07** The system shall display a paginated list of leads.
- **REQ-LEAD-08** The system shall provide a text search that matches against lead name, email, and phone.
- **REQ-LEAD-09** The system shall provide filters for lead source, lead status, branch, assigned staff member, and tags.
- **REQ-LEAD-10** WHEN no leads match the search or filter criteria, the system shall display an empty state with an icon and a message indicating no leads were found.

### 3.3 Customer Management

- **REQ-CUST-01** The system shall allow a lead to be converted into a customer.
- **REQ-CUST-02** The system shall allow users to create, edit, and delete customer records.
- **REQ-CUST-03** The system shall allow users to assign a customer category to a customer.
- **REQ-CUST-04** The system shall display a paginated customer list with text search and filters for category, branch, and assigned staff member.

### 3.4 Import

- **REQ-IMP-01** The system shall allow users to import leads from an Excel (.xlsx) or CSV file.
- **REQ-IMP-02** WHEN a user uploads an import file, the system shall validate each row against the required fields and report the number of records imported and the number of records that failed validation.
- **REQ-IMP-03** WHEN a row fails validation during import, the system shall skip that row, continue importing the remaining rows, and return a list of errors with row numbers.

### 3.5 Activity Timeline

- **REQ-ACT-01** The system shall display an activity timeline for each lead showing a chronological list of all activities (calls, visits, notes, status changes, assignments).
- **REQ-ACT-02** WHEN a lead's status changes or assignment changes, the system shall automatically record the change as an activity entry in the timeline.
- **REQ-ACT-03** The system shall allow users to manually add activity entries (e.g., a note, call log, or visit log) to a lead's timeline.

## 4. Sales Pipeline

### 4.1 Kanban Board

- **REQ-PIPE-01** The system shall display a Kanban board with columns for the following pipeline stages: Lead, Contacted, Qualified, Proposal, Negotiation, Won, Lost.
- **REQ-PIPE-02** The system shall allow users to move a deal between stages using drag-and-drop.
- **REQ-PIPE-03** WHEN a user moves a deal to a new stage via drag-and-drop, the system shall update the deal's stage and record the change in the activity timeline of the associated lead.
- **REQ-PIPE-04** The system shall display each deal card with the lead/customer name, deal value, and expected close date.

### 4.2 Deal Fields

- **REQ-PIPE-05** The system shall allow users to create a deal with the following fields: associated lead, current stage, deal value, expected close date, and lost reason.
- **REQ-PIPE-06** The system shall allow users to edit a deal's value, expected close date, and stage.
- **REQ-PIPE-07** WHEN a deal is moved to the Lost stage, the system shall require the user to select a lost reason before completing the move.
- **REQ-PIPE-08** IF the user attempts to move a deal to Lost without selecting a lost reason, the system shall prompt the user to select one and shall not save the stage change.

### 4.3 Pipeline Scoping

- **REQ-PIPE-09** The system shall enforce role-based data scoping on the Kanban board per REQ-AUTH-09 through REQ-AUTH-11.
- **REQ-PIPE-10** WHEN no deals exist for the visible scope, the system shall display an empty state on the Kanban board with an icon and a message indicating no deals.

## 5. Dashboard (CRM Intelligence)

### 5.1 KPI Cards

- **REQ-DASH-01** The system shall display six KPI cards: Total Leads, Total Visits, Gross Pipeline, Active Deals, Customer Rating, and Conversion.
- **REQ-DASH-02** The system shall calculate Total Leads as the count of leads created within the selected period.
- **REQ-DASH-03** The system shall calculate Total Visits as the count of visit activities logged within the selected period.
- **REQ-DASH-04** The system shall calculate Gross Pipeline as the sum of deal values for all deals not in Won or Lost stage within the selected period.
- **REQ-DASH-05** The system shall calculate Active Deals as the count of deals not in Won or Lost stage within the selected period.
- **REQ-DASH-06** The system shall calculate Customer Rating as the average customer rating within the selected period.
- **REQ-DASH-07** The system shall calculate Conversion as the percentage of leads converted to customers within the selected period.

### 5.2 Filters

- **REQ-DASH-08** The system shall provide a period filter with the options: Today, This Week, This Month, and Last Month.
- **REQ-DASH-09** The system shall provide a staff filter that allows the user to filter dashboard data by a specific staff member.
- **REQ-DASH-10** The system shall enforce role-based data scoping on dashboard data per REQ-AUTH-09 through REQ-AUTH-11. Sales users shall not see a staff filter (they only see their own data).

### 5.3 Charts

- **REQ-DASH-11** The system shall display a Revenue Trend chart (line chart) showing revenue over time within the selected period.
- **REQ-DASH-12** The system shall display a Lead Lifecycle bar chart showing the count of leads in each pipeline stage.
- **REQ-DASH-13** The system shall display a Sentiment Mix chart showing the distribution of lead/customer sentiment.
- **REQ-DASH-14** WHEN no data exists for the selected period and staff filter, the system shall display an empty state on each chart and KPI card.

## 6. Cross-Cutting Requirements

### 6.1 Error Handling

- **REQ-ERR-01** WHEN an API request fails due to a server error, the system shall return a 500 status with a generic error message and log the detailed error server-side.
- **REQ-ERR-02** WHEN an API request fails due to validation, the system shall return a 400 status with field-specific error messages.

### 6.2 Security

- **REQ-SEC-01** The system shall validate and sanitize all user input on the backend before processing.
- **REQ-SEC-02** The system shall use parameterized queries (via Prisma) for all database operations to prevent SQL injection.
- **REQ-SEC-03** The system shall store all secrets (database URL, JWT secret) in environment variables and shall never commit them to version control.

### 6.3 UI Conventions

- **REQ-UI-01** The system shall include search, filters, and pagination on every list screen.
- **REQ-UI-02** The system shall display an empty state with an icon and a message on every widget when there is no data.
