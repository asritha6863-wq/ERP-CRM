import * as contactService from '../services/contact.service.js';
import { asyncHandler }     from '../utils/asyncHandler.js';

export const list = asyncHandler(async (req, res) =>
  res.json(await contactService.listContacts(req.user, req.query))
);

export const getOne = asyncHandler(async (req, res) => {
  const c = await contactService.getContact(req.user, req.params.id);
  if (!c) return res.status(404).json({ error: 'Contact not found' });
  res.json(c);
});

export const create = asyncHandler(async (req, res) =>
  res.status(201).json(await contactService.createContact(req.user, req.body))
);

export const update = asyncHandler(async (req, res) =>
  res.json(await contactService.updateContact(req.user, req.params.id, req.body))
);

export const remove = asyncHandler(async (req, res) => {
  await contactService.softDeleteContact(req.user, req.params.id);
  res.status(204).end();
});

export const getLeads = asyncHandler(async (req, res) =>
  res.json(await contactService.getContactLeads(req.user, req.params.id, req.query))
);

export const getDeals = asyncHandler(async (req, res) =>
  res.json(await contactService.getContactDeals(req.user, req.params.id, req.query))
);
