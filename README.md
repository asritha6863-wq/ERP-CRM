# Jewellery Retail CRM

A CRM web application for a jewellery retail company with multiple branches.

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS + React Router + Recharts + lucide-react
- **Backend**: Node.js + Express + Prisma
- **Database**: PostgreSQL
- **Auth**: JWT with role-based access control (Admin, Manager, Sales)

## Project Structure

```
/
├── frontend/    # React + Vite frontend
├── backend/     # Node.js + Express + Prisma backend
```

## Setup

### Backend
```bash
cd backend
cp .env.example .env   # Configure DATABASE_URL and JWT_SECRET
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

### Frontend
```bash
cd frontend
cp .env.example .env   # Configure VITE_API_URL
npm install
npm run dev
```

## Default Admin Login

- Email: `admin@jewellerycrm.com`
- Password: `admin123`
