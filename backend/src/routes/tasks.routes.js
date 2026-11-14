import { Router }       from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { list, create, update, remove } from '../controllers/tasks.controller.js';

const router = Router();
router.use(authenticate);

router.get('/',     list);
router.post('/',    create);
router.put('/:id',  update);
router.delete('/:id', remove);

export default router;
