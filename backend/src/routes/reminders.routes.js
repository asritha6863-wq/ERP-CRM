import { Router }       from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { list, create, setStatus } from '../controllers/reminders.controller.js';

const router = Router();
router.use(authenticate);

router.get('/',             list);
router.post('/',            create);
router.patch('/:id/status', setStatus);

export default router;
