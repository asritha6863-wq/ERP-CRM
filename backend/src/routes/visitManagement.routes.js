import { Router }       from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { list, create, update, summary, exportCsv } from '../controllers/visitManagement.controller.js';

const router = Router();
router.use(authenticate);

router.get('/',         list);
router.get('/summary',  summary);
router.get('/export',   exportCsv);
router.post('/',        create);
router.put('/:id',      update);

export default router;
