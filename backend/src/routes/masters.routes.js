import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/role.middleware.js';
import {
  listMaster,
  getMaster,
  createMaster,
  updateMaster,
  toggleMaster,
} from '../controllers/masters.controller.js';

const router = Router();
router.use(authenticate, requireRole('ADMIN'));

// Generic master CRUD — entity param selects the model
// Supported: branches, lead-sources, lead-statuses, pipeline-stages, lost-reasons, customer-categories
router.get('/:entity',       listMaster);
router.get('/:entity/:id',   getMaster);
router.post('/:entity',      createMaster);
router.put('/:entity/:id',   updateMaster);
router.patch('/:entity/:id/toggle', toggleMaster);

export default router;
