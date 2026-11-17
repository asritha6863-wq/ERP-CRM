import { Router } from 'express';
import multer from 'multer';
import { importMasterFile } from '../controllers/import.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  listMaster,
  getMaster,
  createMaster,
  updateMaster,
  toggleMaster,
} from '../controllers/masters.controller.js';

const router = Router();
// ADMIN, or staff explicitly granted a Masters item in their access list
const MASTER_IDS = ['stage-master', 'area-master', 'location-master', 'lead-source', 'channel', 'lead-status'];
const masterAccess = (req, res, next) => {
  const p = req.user?.permissions;
  if (req.user?.role === 'ADMIN' || (Array.isArray(p) && p.some((i) => MASTER_IDS.includes(i)))) return next();
  return res.status(403).json({ error: 'Insufficient permissions' });
};
router.use(authenticate, masterAccess);

// Generic master CRUD — entity param selects the model
// Supported: branches, lead-sources, lead-statuses, pipeline-stages, lost-reasons, customer-categories
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 20 * 1024 * 1024 } });
router.post('/:entity/import', upload.single('file'), importMasterFile);
router.get('/:entity', listMaster);
router.get('/:entity/:id',   getMaster);
router.post('/:entity',      createMaster);
router.put('/:entity/:id',   updateMaster);
router.patch('/:entity/:id/toggle', toggleMaster);

export default router;

