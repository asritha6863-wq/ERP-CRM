import * as feedbackService from '../services/feedback.service.js';
import { asyncHandler }       from '../utils/asyncHandler.js';

export const list   = asyncHandler(async (req, res) => res.json(await feedbackService.listFeedback(req.user, req.query)));
export const create = asyncHandler(async (req, res) => res.status(201).json(await feedbackService.createFeedback(req.user, req.body)));
