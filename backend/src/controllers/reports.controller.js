import * as leadReport from '../services/leadReport.service.js';
import { asyncHandler }   from '../utils/asyncHandler.js';

export const summary   = asyncHandler(async (req, res) => res.json(await leadReport.leadSummary(req.user, req.query)));
export const rows      = asyncHandler(async (req, res) => res.json(await leadReport.leadRows(req.user, req.query)));
export const customers = asyncHandler(async (req, res) => res.json(await leadReport.customerInsights(req.user, req.query)));
export const exportCsv = asyncHandler(async (req, res) => leadReport.streamLeadCsv(req.user, req.query, res));
