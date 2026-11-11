# Tech Stack

## Frontend

- **React** — UI library
- **Vite** — Build tool and dev server
- **Tailwind CSS** — Styling
- **React Router** — Client-side routing
- **Recharts** — Charts and data visualization
- **lucide-react** — Icon library

## Backend

- **Node.js** — Runtime
- **Express** — Web framework
- **Prisma** — ORM and database schema management

## Database

- **PostgreSQL** — Relational database

## Authentication

- **JWT** — JSON Web Tokens for stateless authentication
- **Role-based access control** — Roles: Admin, Manager, Sales Staff

## Deployment

- **Frontend** — Vercel
- **Backend** — Render
- **Database** — Render (managed PostgreSQL)

## Configuration

- All secrets (database URLs, JWT secrets, API keys) must be stored in environment variables.
- Never hardcode secrets or credentials in source files.
- Use `.env` files for local development (and ensure `.env` is gitignored).
