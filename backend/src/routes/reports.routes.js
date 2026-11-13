import { Router }       from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { summary, rows, customers, exportCsv, incentive } from '../controllers/reports.controller.js';

const router = Router();
router.use(authenticate);

router.get('/leads',           rows);
router.get('/leads/summary',   summary);
router.get('/leads/customers', customers);
router.get('/leads/export',    exportCsv);
router.get('/incentive',       incentive);

export default router;
