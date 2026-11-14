import { Router }       from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as svc from '../services/interactionLog.service.js';

const router = Router();
router.use(authenticate);

router.get('/',  asyncHandler(async (req, res) => res.json(await svc.listLogs(req.user, req.query))));
router.post('/', asyncHandler(async (req, res) => res.status(201).json(await svc.createLog(req.user, req.body))));

export default router;
