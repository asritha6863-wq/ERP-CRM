import xlsx from 'xlsx';
import { asyncHandler } from '../utils/asyncHandler.js';
import { importLeads, importContacts, importMaster, isImportableMaster } from '../services/import.service.js';

function handler(run) {
  return asyncHandler(async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    let mapping = {};
    try { mapping = JSON.parse(req.body.mapping || '{}'); }
    catch { return res.status(400).json({ error: 'Invalid mapping JSON' }); }

    const wb = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const rows = xlsx.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
    if (!rows.length) return res.status(400).json({ error: 'File is empty' });

    const result = await run(req, rows, mapping, res);
    if (!result) return;
    if (result.errors.length > 0) {
      const wbErr = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(wbErr, xlsx.utils.json_to_sheet(result.errors), 'Errors');
      result.errorFileBase64 = xlsx.write(wbErr, { type: 'base64', bookType: 'xlsx' });
    }
    res.json(result);
  });
}

export const importLeadsFile = handler((req, rows, mapping) => importLeads(req.user, rows, mapping));
export const importContactsFile = handler((req, rows, mapping) => importContacts(req.user, rows, mapping));
export const importMasterFile = handler((req, rows, mapping, res) => {
  if (!isImportableMaster(req.params.entity)) { res.status(400).json({ error: 'Import not supported for this master' }); return null; }
  return importMaster(req.params.entity, rows, mapping);
});
