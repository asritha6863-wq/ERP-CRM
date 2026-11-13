import { Router }       from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { list, create } from '../controllers/feedback.controller.js';

const router = Router();
router.use(authenticate);

router.get('/',  list);
router.post('/', create);

export default router;
