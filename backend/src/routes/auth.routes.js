import { Router } from 'express';
import { login, getMe } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

// POST /api/auth/login — public, no auth required
router.post('/login', login);

// GET /api/auth/me — requires authentication
router.get('/me', authenticate, getMe);

export default router;
