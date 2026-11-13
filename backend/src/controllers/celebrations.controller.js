import * as celebrationService from '../services/celebration.service.js';
import { asyncHandler }          from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) =>
  res.json(await celebrationService.listCelebrations(req.user, req.query))
);
