import { useState, useRef } from 'react';
import ModalForm  from '../../components/ui/ModalForm.jsx';
import Button     from '../../components/ui/Button.jsx';
import { Upload, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import api from '../../services/api.js';

const CRM_FIELDS = [
  { key: 'firstName',  label: 'First Name *' },
  { key: 'lastName',   label: 'Last Name *' },
  { key: 'phone',      label: 'Phone' },
  { key: 'email',      label: 'Email' },
  { key: 'source',     label: 'Lead Source' },
  { key: 'branch',     label: 'Branch' },
  { key: 'assignedTo', label: 'Assigned To' },
];

export default function ImportModal({ open, onClose, onDone }) {
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
        for (const { key } of CRM_FIELDS) {
          const found = hdrs.find((h) =>
            h.toLowerCase().replace(/[\s_-]/g, '').includes(key.toLowerCase().replace(/[\s_-]/g, ''))
          );
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
      const res = await api.post('/leads/import', fd, {
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

  const title = { upload: 'Import Leads', map: 'Map Columns', result: 'Import Result' }[step];

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
            className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
          >
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Click to upload or drag and drop</p>
            <p className="text-xs text-gray-400 mt-1">.xlsx or .csv — up to 20 MB (5,000+ rows supported)</p>
          </div>
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
          {CRM_FIELDS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-4">
              <span className="w-36 text-sm font-medium text-gray-700 shrink-0">{label}</span>
              <select
                value={mapping[key] || ''}
                onChange={(e) => setMapping((m) => ({ ...m, [key]: e.target.value }))}
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
