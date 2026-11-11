import * as customerService from '../services/customer.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const list    = asyncHandler(async (req, res) => res.json(await customerService.listCustomers(req.user, req.query)));
export const getOne  = asyncHandler(async (req, res) => {
  const c = await customerService.getCustomer(req.user, req.params.id);
  if (!c) return res.status(404).json({ error: 'Customer not found' });
  res.json(c);
});
export const create  = asyncHandler(async (req, res) => res.status(201).json(await customerService.createCustomer(req.user, req.body)));
export const update  = asyncHandler(async (req, res) => res.json(await customerService.updateCustomer(req.user, req.params.id, req.body)));
export const remove  = asyncHandler(async (req, res) => { await customerService.deleteCustomer(req.user, req.params.id); res.status(204).end(); });
