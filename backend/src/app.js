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
import contactsRoutes  from './routes/contacts.routes.js';
import remindersRoutes from './routes/reminders.routes.js';
import campaignsRoutes from './routes/campaigns.routes.js';
import celebrationsRoutes from './routes/celebrations.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import feedbackRoutes from './routes/feedback.routes.js';
import customerHubRoutes from './routes/customerHub.routes.js';
import feedbackRequestsRoutes from './routes/feedbackRequests.routes.js';
import tasksRoutes from './routes/tasks.routes.js';
import visitManagementRoutes from './routes/visitManagement.routes.js';
import appointmentsRoutes    from './routes/appointments.routes.js';
import interactionLogsRoutes from './routes/interactionLogs.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
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
app.use('/api/contacts',  contactsRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api/celebrations', celebrationsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/customer-hub', customerHubRoutes);
app.use('/api/feedback-requests', feedbackRequestsRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/visits', visitManagementRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/interaction-logs', interactionLogsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Centralized error handler
app.use(errorHandler);

export default app;
