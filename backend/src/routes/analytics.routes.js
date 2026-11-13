import { Router }       from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { salesPerformance, locationSales, crmAnalytics } from '../controllers/analytics.controller.js';

const router = Router();
router.use(authenticate);

router.get('/sales-performance', salesPerformance);
router.get('/location-sales',    locationSales);
router.get('/crm',               crmAnalytics);

export default router;
