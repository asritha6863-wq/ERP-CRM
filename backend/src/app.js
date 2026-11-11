import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import dotenv from 'dotenv';

import authRoutes      from './routes/auth.routes.js';
import mastersRoutes   from './routes/masters.routes.js';
import usersRoutes     from './routes/users.routes.js';
import leadsRoutes     from './routes/leads.routes.js';
import customersRoutes from './routes/customers.routes.js';
import dealsRoutes     from './routes/deals.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Jewellery CRM API is running' });
});

// Routes
app.use('/api/auth',      authRoutes);
app.use('/api/masters',   mastersRoutes);
app.use('/api/users',     usersRoutes);
app.use('/api/leads',     leadsRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/deals',     dealsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Centralized error handler
app.use(errorHandler);

export default app;
