import { asyncHandler } from '../utils/asyncHandler.js';
import * as svc from '../services/bdeField.service.js';

export const checkIn            = asyncHandler(async (req, res) => res.status(201).json(await svc.checkIn(req.user, req.body)));
export const checkOut           = asyncHandler(async (req, res) => res.json(await svc.checkOut(req.user, req.params.id, req.body)));
export const cancelVisit        = asyncHandler(async (req, res) => res.json(await svc.cancelVisit(req.user, req.params.id)));
export const listVisits         = asyncHandler(async (req, res) => res.json(await svc.listVisits(req.user, req.query)));
export const getActiveVisit     = asyncHandler(async (req, res) => res.json(await svc.getActiveVisit(req.user)));
export const pingLocation       = asyncHandler(async (req, res) => res.status(201).json(await svc.pingLocation(req.user, req.body)));
export const listLiveLocations  = asyncHandler(async (req, res) => res.json(await svc.listLiveLocations(req.user, req.query)));
export const getLocationHistory = asyncHandler(async (req, res) => res.json(await svc.getLocationHistory(req.user, req.params.staffId, req.query)));
