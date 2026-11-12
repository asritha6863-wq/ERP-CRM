import { Router }      from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { list, getOne, create, update, remove, getLeads, getDeals } from '../controllers/contacts.controller.js';

const router = Router();
router.use(authenticate);

router.get('/',                list);
router.get('/:id',             getOne);
router.post('/',               create);
router.put('/:id',             update);
router.delete('/:id',          remove);
router.get('/:id/leads',       getLeads);
router.get('/:id/deals',       getDeals);

export default router;
