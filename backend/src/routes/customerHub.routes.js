import { Router }       from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { list, profile, visit } from '../controllers/customerHub.controller.js';

const router = Router();
router.use(authenticate);

router.get('/',            list);
router.get('/:id',         profile);
router.post('/:id/visits', visit);

export default router;
