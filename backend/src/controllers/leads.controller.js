import * as leadService from '../services/lead.service.js';
import { importLeads }  from '../services/import.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import xlsx from 'xlsx';

export const list    = asyncHandler(async (req, res) => res.json(await leadService.listLeads(req.user, req.query)));
export const getOne  = asyncHandler(async (req, res) => {
  const lead = await leadService.getLead(req.user, req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json(lead);
});
export const create  = asyncHandler(async (req, res) => res.status(201).json(await leadService.createLead(req.user, req.body)));
export const update  = asyncHandler(async (req, res) => res.json(await leadService.updateLead(req.user, req.params.id, req.body)));
export const bulkAssign = asyncHandler(async (req, res) => res.json(await leadService.bulkAssign(req.user, req.body)));
export const convert = asyncHandler(async (req, res) => res.status(201).json(await leadService.convertLead(req.user, req.params.id)));
export const win     = asyncHandler(async (req, res) => res.status(201).json(await leadService.winLead(req.user, req.params.id, req.body)));
export const lose    = asyncHandler(async (req, res) => res.json(await leadService.loseLead(req.user, req.params.id, req.body)));

export const getActivities  = asyncHandler(async (req, res) => {
  const lead = await leadService.getLead(req.user, req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json(lead.activities);
});
export const postActivity = asyncHandler(async (req, res) =>
  res.status(201).json(await leadService.addActivity(req.user, req.params.id, req.body))
);

// POST /api/leads/import — multipart: file + mapping JSON
export const importFile = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  let mapping = {};
  try {
    mapping = JSON.parse(req.body.mapping || '{}');
  } catch {
    return res.status(400).json({ error: 'Invalid mapping JSON' });
  }

  // Parse file (xlsx handles both .xlsx and .csv)
  const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
  const sheet    = workbook.Sheets[workbook.SheetNames[0]];
  const rows     = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  if (!rows.length) return res.status(400).json({ error: 'File is empty' });

  const result = await importLeads(req.user, rows, mapping);

  // Build downloadable error file if there are errors
  if (result.errors.length > 0) {
    const errSheet = xlsx.utils.json_to_sheet(result.errors);
    const errWb    = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(errWb, errSheet, 'Errors');
    result.errorFileBase64 = xlsx.write(errWb, { type: 'base64', bookType: 'xlsx' });
  }

  res.json(result);
});
