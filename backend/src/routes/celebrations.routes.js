import { Router }       from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { list }         from '../controllers/celebrations.controller.js';

const router = Router();
router.use(authenticate);

router.get('/', list);

export default router;
