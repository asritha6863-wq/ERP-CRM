# Product Overview

This project is a CRM (Customer Relationship Management) system for a jewellery retail company with multiple branches.

## Users

- **Admin** — Full access to all features, user management, and system configuration.
- **Manager** — Branch-level management, oversight of sales staff, leads, and pipeline.
- **Sales Staff** — Day-to-day lead management, customer interactions, and sales pipeline updates.

## Phase 1 Modules

1. **Auth** — Login, logout, JWT-based session management with role-based access control (Admin, Manager, Sales Staff).
2. **Masters** — Core master data: branches, products (jewellery items), categories, staff/users, and other reference data.
3. **Leads/Customers** — Lead capture, customer profiles, lead status tracking, conversion from lead to customer.
4. **Sales Pipeline** — Pipeline stages, deal tracking, sales flow from lead to closure, branch-level reporting.
5. **Dashboard** — Role-based dashboards with key metrics, charts (Recharts), and summary widgets.

## Context Notes

- The system supports multi-branch operations; data and access may be scoped by branch.
- Role-based access control determines what each user type can see and do.
- Phase 1 focuses on core CRM functionality; additional modules may be added in later phases.
