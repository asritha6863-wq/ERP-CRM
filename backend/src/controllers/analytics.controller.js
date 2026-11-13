import * as analyticsService from '../services/analytics.service.js';
import { asyncHandler }       from '../utils/asyncHandler.js';

export const salesPerformance = asyncHandler(async (req, res) =>
  res.json(await analyticsService.salesPerformance(req.user, req.query))
);
export const locationSales = asyncHandler(async (req, res) =>
  res.json(await analyticsService.locationSales(req.user, req.query))
);
