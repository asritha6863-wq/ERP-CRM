import * as svc from '../services/feedbackRequest.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list     = asyncHandler(async (req, res) => res.json(await svc.listRequests(req.user, req.query)));
export const complete = asyncHandler(async (req, res) => res.json(await svc.completeRequest(req.user, req.params.id, req.body)));
export const attempt  = asyncHandler(async (req, res) => res.json(await svc.logAttempt(req.user, req.params.id, req.body)));
