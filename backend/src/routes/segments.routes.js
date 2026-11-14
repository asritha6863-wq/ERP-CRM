import { Router }       from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as svc from '../services/segment.service.js';

const router = Router();
router.use(authenticate);

router.get('/',          asyncHandler(async (req, res) => res.json(await svc.listSegments(req.user))));
router.get('/stats',     asyncHandler(async (req, res) => res.json(await svc.dashboardStats(req.user))));
router.post('/evaluate', asyncHandler(async (req, res) => res.json(await svc.evaluateCriteria(req.user, req.body.criteria || {}, req.body.branchId))));
router.post('/',         asyncHandler(async (req, res) => res.status(201).json(await svc.createSegment(req.user, req.body))));
router.delete('/:id',    asyncHandler(async (req, res) => { await svc.deleteSegment(req.user, req.params.id); res.status(204).end(); }));

export default router;
