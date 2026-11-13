import { Router }       from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { list, complete, attempt } from '../controllers/feedbackRequests.controller.js';

const router = Router();
router.use(authenticate);

router.get('/',              list);
router.post('/:id/complete', complete);
router.post('/:id/attempt',  attempt);

export default router;
