import { Router }       from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { list, create, update } from '../controllers/visitManagement.controller.js';

const router = Router();
router.use(authenticate);

router.get('/',     list);
router.post('/',    create);
router.put('/:id',  update);

export default router;
