import * as campaignService from '../services/campaign.service.js';
import { asyncHandler }      from '../utils/asyncHandler.js';

export const list   = asyncHandler(async (req, res) => res.json(await campaignService.listCampaigns(req.query)));
export const create = asyncHandler(async (req, res) => res.status(201).json(await campaignService.createCampaign(req.user, req.body)));
