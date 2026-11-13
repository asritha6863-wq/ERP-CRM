import * as reminderService from '../services/reminder.service.js';
import { asyncHandler }      from '../utils/asyncHandler.js';

export const list      = asyncHandler(async (req, res) => res.json(await reminderService.listReminders(req.user, req.query)));
export const create    = asyncHandler(async (req, res) => res.status(201).json(await reminderService.createReminder(req.user, req.body)));
export const setStatus = asyncHandler(async (req, res) => res.json(await reminderService.setReminderStatus(req.user, req.params.id, req.body.status)));
