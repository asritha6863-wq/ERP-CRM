# Project Structure

## Repository Layout

Monorepo structure with two main applications:

```
/
├── frontend/    # React + Vite frontend application
├── backend/     # Node.js + Express + Prisma backend application
```

## UI Conventions

### List Screens

Every list screen (leads, customers, deals, master data, users, etc.) must include:

- **Search** — Text search across relevant fields.
- **Filters** — Filter by relevant dimensions (status, branch, date range, etc.).
- **Pagination** — Paginated results, not infinite scroll, for predictable navigation.

### Widgets

Every data widget (charts, tables, stat cards, lists) must include:

- **Empty state** — A clear, user-friendly empty state when there is no data to display. Use an icon and a short message explaining what will appear here once data exists.

## Code Organization

- Frontend and backend are independent applications within the monorepo, each with their own `package.json`.
- Shared types or contracts (e.g., API request/response shapes) should be kept consistent between frontend and backend.
