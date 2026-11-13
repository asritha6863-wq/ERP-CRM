import * as hub from '../services/customerHub.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list    = asyncHandler(async (req, res) => res.json(await hub.listCustomers(req.user, req.query)));
export const profile = asyncHandler(async (req, res) => res.json(await hub.getCustomerProfile(req.user, req.params.id)));
export const visit   = asyncHandler(async (req, res) => res.status(201).json(await hub.logVisit(req.user, req.params.id, req.body)));
