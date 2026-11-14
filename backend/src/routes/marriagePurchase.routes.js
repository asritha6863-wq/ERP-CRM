import { Router }       from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import * as svc from '../services/marriagePurchase.service.js';

const router = Router();
router.use(authenticate);

router.get('/',                   asyncHandler(async (req, res) => res.json(await svc.listMarriagePurchases(req.user, req.query))));
router.post('/:id/assign',        asyncHandler(async (req, res) => res.json(await svc.assignAttendee(req.user, req.params.id, req.body))));

export default router;
