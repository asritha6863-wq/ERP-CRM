import * as dealService from '../services/deal.service.js';
import { asyncHandler }  from '../utils/asyncHandler.js';

export const kanban    = asyncHandler(async (req, res) => res.json(await dealService.getKanban(req.user, req.query)));
export const list      = asyncHandler(async (req, res) => res.json(await dealService.listDeals(req.user, req.query)));
export const getOne    = asyncHandler(async (req, res) => {
  const d = await dealService.getDeal(req.user, req.params.id);
  if (!d) return res.status(404).json({ error: 'Deal not found' });
  res.json(d);
});
export const create    = asyncHandler(async (req, res) => res.status(201).json(await dealService.createDeal(req.user, req.body)));
export const update    = asyncHandler(async (req, res) => res.json(await dealService.updateDeal(req.user, req.params.id, req.body)));
export const moveStage = asyncHandler(async (req, res) => res.json(await dealService.moveStage(req.user, req.params.id, req.body)));
export const remove    = asyncHandler(async (req, res) => { await dealService.deleteDeal(req.user, req.params.id); res.status(204).end(); });
