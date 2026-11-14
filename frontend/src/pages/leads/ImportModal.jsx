import { useState, useRef } from 'react';
import ModalForm  from '../../components/ui/ModalForm.jsx';
import Button     from '../../components/ui/Button.jsx';
import { Upload, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import api from '../../services/api.js';
import { downloadTemplate } from '../../utils/excel.js';

export const LEAD_FIELDS = [
  { key: 'name',       label: 'Full Name',  aliases: ['customername', 'fullname', 'name', 'customer'] },
  { key: 'firstName',  label: 'First Name', aliases: ['firstname', 'fname'] },
  { key: 'lastName',   label: 'Last Name',  aliases: ['lastname', 'lname', 'surname'] },
  { key: 'phone',      label: 'Phone *',    aliases: ['phone', 'mobile', 'mobileno', 'contact', 'contactno', 'phoneno'] },
  { key: 'altPhone',   label: 'Alt Phone',  aliases: ['altphone', 'alternate', 'whatsapp', 'phone2'] },
  { key: 'email',      label: 'Email',      aliases: ['email', 'emailid'] },
  { key: 'source',     label: 'Lead Source', aliases: ['source', 'leadsource'] },
  { key: 'channel',    label: 'Channel (INSTORE/OUTDOOR)', aliases: ['channel'] },
  { key: 'branch',     label: 'Branch',     aliases: ['branch', 'store', 'showroom'] },
  { key: 'assignedTo', label: 'Assigned To', aliases: ['assignedto', 'staff', 'salesman', 'bde', 'executive'] },
  { key: 'area',       label: 'Area',       aliases: ['area', 'location', 'city'] },
  { key: 'stage',      label: 'Stage',      aliases: ['stage'] },
  { key: 'status',     label: 'Status',     aliases: ['status', 'leadstatus'] },
  { key: 'priority',   label: 'Priority',   aliases: ['priority'] },
  { key: 'dueDate',    label: 'Follow-up Date', aliases: ['duedate', 'followup', 'followupdate', 'nextfollowup'] },
  { key: 'marriageDate', label: 'Marriage Date', aliases: ['marriagedate', 'weddingdate'] },
  { key: 'notes',      label: 'Notes',      aliases: ['notes', 'remarks', 'remark', 'comment'] },
];

export const CONTACT_FIELDS = [
  { key: 'name',       label: 'Full Name',  aliases: ['customername', 'fullname', 'name', 'customer'] },
  { key: 'firstName',  label: 'First Name', aliases: ['firstname', 'fname'] },
  { key: 'lastName',   label: 'Last Name',  aliases: ['lastname', 'lname', 'surname'] },
  { key: 'phone',      label: 'Phone *',    aliases: ['phone', 'mobile', 'mobileno', 'contact', 'contactno', 'phoneno'] },
  { key: 'email',      label: 'Email',      aliases: ['email', 'emailid'] },
  { key: 'type',       label: 'Customer Type', aliases: ['type', 'customertype', 'category'] },
  { key: 'branch',     label: 'Branch',     aliases: ['branch', 'store', 'showroom'] },
  { key: 'assignedTo', label: 'Assigned To', aliases: ['assignedto', 'staff', 'salesman', 'executive'] },
  { key: 'city',       label: 'City',       aliases: ['city', 'town'] },
  { key: 'state',      label: 'State',      aliases: ['state'] },
  { key: 'pincode',    label: 'Pincode',    aliases: ['pincode', 'pin', 'zip', 'postalcode'] },
  { key: 'dateOfBirth', label: 'Date of Birth', aliases: ['dob', 'dateofbirth', 'birthdate', 'birthday'] },
  { key: 'anniversaryDate', label: 'Anniversary Date', aliases: ['anniversary', 'anniversarydate', 'marriagedate'] },
];

export const AREA_FIELDS = [
  { key: 'name',      label: 'Area Name *', aliases: ['area', 'areaname', 'name'] },
  { key: 'branch',    label: 'Branch',      aliases: ['branch', 'branchname'] },
  { key: 'pincode',   label: 'Pincode',     aliases: ['pincode', 'pin', 'zip'] },
  { key: 'locations', label: 'Locations (comma separated)', aliases: ['locations', 'location'] },
];

export const NAME_FIELDS = [{ key: 'name', label: 'Name *', aliases: ['name'] }];
export default function ImportModal({ open, onClose, onDone, title: titleProp = 'Import Leads', endpoint = '/leads/import', fields = LEAD_FIELDS, templateName = 'leads_template' }) {
  const [step, setStep]       = useState('upload'); // upload | map | result
  const [file, setFile]       = useState(null);
  const [headers, setHeaders] = useState([]);
  const [mapping, setMapping] = useState({});
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');
  const fileRef = useRef();

  const reset = () => { setStep('upload'); setFile(null); setHeaders([]); setMapping({}); setResult(null); setError(''); };

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setError('');

    // Parse headers client-side using FileReader + xlsx (lazy import)
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const { read, utils } = await import('xlsx');
        const wb = read(ev.target.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = utils.sheet_to_json(ws, { header: 1 });
        const hdrs = (rows[0] || []).map(String);
        setHeaders(hdrs);

        // Auto-map: match header names to CRM fields (fuzzy)
        const auto = {};
        for (const { key, aliases = [] } of fields) {
          const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
          const found = hdrs.find((h) => norm(h) === norm(key) || aliases.includes(norm(h)));
          if (found) auto[key] = found;
        }
        setMapping(auto);
        setStep('map');
      } catch { setError('Could not parse file. Please use .xlsx or .csv format.'); }
    };
    reader.readAsArrayBuffer(f);
  };

  const handleImport = async () => {
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('mapping', JSON.stringify(mapping));
      const res = await api.post(endpoint, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000, // 2 min for large files
      });
      setResult(res.data);
      setStep('result');
      onDone?.();
    } catch (err) {
      setError(err.response?.data?.error || 'Import failed');
    } finally { setLoading(false); }
  };

  const downloadErrors = () => {
    if (!result?.errorFileBase64) return;
    const link = document.createElement('a');
    link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${result.errorFileBase64}`;
    link.download = 'import_errors.xlsx';
    link.click();
  };

  const title = { upload: titleProp, map: 'Map Columns', result: 'Import Result' }[step];

  return (
    <ModalForm open={open} onClose={() => { reset(); onClose(); }} title={title} size="lg"
      footer={
        step === 'upload' ? null :
        step === 'map'    ? <><Button variant="secondary" onClick={() => setStep('upload')}>Back</Button><Button loading={loading} onClick={handleImport}>Import</Button></> :
                            <Button onClick={() => { reset(); onClose(); }}>Close</Button>
      }
    >
      {/* ── Step 1: Upload ── */}
      {step === 'upload' && (
        <div>
          <div
            onClick={() => fileRef.current.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-pink-400 hover:bg-pink-50 transition-colors"
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
            <p className="text-xs text-gray-400 mt-1">.xlsx or .csv — up to 20 MB (5,000+ rows supported)</p>
          </div>
          <button type="button" onClick={() => downloadTemplate(fields, templateName)} className="mt-3 text-sm text-pink-600 hover:underline inline-flex items-center gap-1"><Download className="w-4 h-4" /> Download blank template (.xlsx)</button>
          <input ref={fileRef} type="file" accept=".xlsx,.csv" className="hidden" onChange={handleFile} />
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        </div>
      )}

      {/* ── Step 2: Column Mapping ── */}
      {step === 'map' && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500 mb-3">
            File: <strong>{file?.name}</strong>. Map each CRM field to a column in your file.
          </p>
          {fields.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-4">
              <span className="w-36 text-sm font-medium text-gray-700 shrink-0">{label}</span>
              <select
                value={mapping[key] || ''}
                onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400"
              >
                <option value="">— Skip —</option>
                {headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          ))}
          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>
      )}

      {/* ── Step 3: Result ── */}
      {step === 'result' && result && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <StatBox icon={CheckCircle2} color="text-emerald-600 bg-emerald-50" label="Imported" value={result.imported} />
            <StatBox icon={AlertCircle}  color="text-amber-600 bg-amber-50"     label="Skipped"  value={result.skipped}  />
            <StatBox icon={AlertCircle}  color="text-red-600 bg-red-50"         label="Errors"   value={result.errors?.length || 0} />
          </div>
          {result.errors?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Row errors (first 10 shown)</p>
                <Button size="sm" variant="secondary" icon={Download} onClick={downloadErrors}>Download error file</Button>
              </div>
              <div className="rounded-lg border border-red-200 bg-red-50 divide-y divide-red-100 max-h-48 overflow-y-auto text-xs">
                {result.errors.slice(0, 10).map((e, i) => (
                  <div key={i} className="px-3 py-2 flex gap-3">
                    <span className="font-medium text-red-700">Row {e.row}</span>
                    <span className="text-red-600">{e.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ModalForm>
  );
}

function StatBox({ icon: Icon, color, label, value }) {
  return (
    <div className={`rounded-xl p-4 flex flex-col items-center gap-1 ${color}`}>
      <Icon className="w-6 h-6" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm">{label}</p>
    </div>
  );
}


