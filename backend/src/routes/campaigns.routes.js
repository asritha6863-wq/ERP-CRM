import { Router }       from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole }  from '../middleware/role.middleware.js';
import { list, create } from '../controllers/campaigns.controller.js';

const router = Router();
router.use(authenticate);

router.get('/',  list);
router.post('/', requireRole('ADMIN', 'MANAGER'), create);

export default router;
