import { Router }  from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { list, getOne, create, update, remove } from '../controllers/customers.controller.js';

const router = Router();
router.use(authenticate);

router.get('/',      list);
router.get('/:id',   getOne);
router.post('/',     create);
router.put('/:id',   update);
router.delete('/:id', remove);

export default router;
