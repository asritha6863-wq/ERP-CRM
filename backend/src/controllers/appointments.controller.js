import * as svc from '../services/appointment.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list   = asyncHandler(async (req, res) => res.json(await svc.listAppointments(req.user, req.query)));
export const create = asyncHandler(async (req, res) => res.status(201).json(await svc.createAppointment(req.user, req.body)));
export const update = asyncHandler(async (req, res) => res.json(await svc.updateAppointment(req.user, req.params.id, req.body)));
