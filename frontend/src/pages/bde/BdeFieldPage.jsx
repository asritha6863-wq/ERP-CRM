import { useState } from 'react';
import { MapPin, Navigation, LogIn, LogOut, X, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useBdeVisit, useLocationPings, getCurrentPosition, reverseGeocode } from '../../hooks/useBdeField.js';

const INPUT = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white transition';
const LB = 'block text-xs font-bold tracking-widest text-gray-500 mb-1.5';

const OUTCOMES = ['Interested', 'Not Interested', 'Follow-up Needed', 'Deal Closed', 'Customer Unavailable'];

export default function BdeFieldPage() {
  const { user } = useAuth();
  const { active, loading, error, refresh, checkIn, checkOut, cancel } = useBdeVisit();

  // Send a GPS ping in the background every 3 minutes while a visit is open
  useLocationPings(!!active, 180000);

  const [form, setForm] = useState({ customerName: '', customerPhone: '', customerAddress: '', purpose: '', notes: '' });
  const [outForm, setOutForm] = useState({ outcome: '', notes: '' });
  const [gps, setGps] = useState(null);     // { lat, lng, address }
  const [locating, setLocating] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess]   = useState('');

  const set    = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const setOut = (k) => (e) => setOutForm((f) => ({ ...f, [k]: e.target.value }));

  const fetchGps = async () => {
    setLocating(true); setFormError('');
    try {
      const { lat, lng } = await getCurrentPosition();
      const address = await reverseGeocode(lat, lng);
      setGps({ lat, lng, address });
    } catch (err) {
      setFormError(err.message || 'Could not get your location');
    } finally { setLocating(false); }
  };

  const submitCheckIn = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!gps) return setFormError('Capture your GPS location first');
    if (!form.customerName.trim() && !form.customerPhone.trim()) return setFormError('Enter the customer name or phone');
    setSaving(true);
    try {
      await checkIn({ ...form, lat: gps.lat, lng: gps.lng, address: gps.address });
      setForm({ customerName: '', customerPhone: '', customerAddress: '', purpose: '', notes: '' });
      setGps(null);
      setSuccess('Checked in! Your visit is now active.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not check in');
    } finally { setSaving(false); }
  };

  const submitCheckOut = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!outForm.outcome) return setFormError('Select the visit outcome');
    setSaving(true);
    try {
      let coords = {};
      try {
        const { lat, lng } = await getCurrentPosition();
        const address = await reverseGeocode(lat, lng);
        coords = { lat, lng, address };
      } catch { /* allow checkout even if GPS fails at checkout time */ }
      await checkOut({ ...outForm, ...coords });
      setOutForm({ outcome: '', notes: '' });
      setSuccess('Checked out! Visit completed.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Could not check out');
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400"><Loader2 className="w-5 h-5 animate-spin" /></div>;

  return (
    <div className="max-w-xl mx-auto space-y-5 p-6 pb-10">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Field Visit</h1>
        <p className="text-sm text-gray-500 mt-0.5">Check in at the customer's location, note their details, and check out when done.</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 text-sm rounded-xl px-4 py-3 border border-emerald-200">
          <CheckCircle2 className="w-4 h-4" /> {success}
        </div>
      )}
      {error && <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 border border-red-200">{error}</div>}

      {!active ? (
        /* ── CHECK-IN FORM ── */
        <form onSubmit={submitCheckIn} className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center gap-2 text-pink-500 font-bold text-sm">
            <LogIn className="w-4 h-4" /> NEW FIELD VISIT
          </div>

          {/* GPS capture */}
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            {gps ? (
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <div className="text-xs text-gray-700">
                  <p className="font-semibold text-emerald-600">Location captured</p>
                  <p className="text-gray-500 mt-0.5">{gps.address || `${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)}`}</p>
                </div>
                <button type="button" onClick={() => setGps(null)} className="ml-auto text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <button type="button" onClick={fetchGps} disabled={locating}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold disabled:opacity-60">
                {locating ? <><Loader2 className="w-4 h-4 animate-spin" /> Getting location…</> : <><Navigation className="w-4 h-4" /> Capture My Location</>}
              </button>
            )}
          </div>

          <div>
            <label className={LB}>CUSTOMER NAME</label>
            <input value={form.customerName} onChange={set('customerName')} className={INPUT} placeholder="e.g. Ramesh Kumar" />
          </div>
          <div>
            <label className={LB}>CUSTOMER PHONE</label>
            <input value={form.customerPhone} onChange={set('customerPhone')} className={INPUT} placeholder="e.g. 9876543210" />
          </div>
          <div>
            <label className={LB}>ADDRESS / SHOP NAME</label>
            <input value={form.customerAddress} onChange={set('customerAddress')} className={INPUT} placeholder="e.g. MG Road, near bus stand" />
          </div>
          <div>
            <label className={LB}>PURPOSE OF VISIT</label>
            <input value={form.purpose} onChange={set('purpose')} className={INPUT} placeholder="e.g. New lead follow-up, catalogue showing" />
          </div>
          <div>
            <label className={LB}>NOTES</label>
            <textarea rows={3} value={form.notes} onChange={set('notes')} className={INPUT} placeholder="Anything to remember about this visit…" />
          </div>

          {formError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}

          <button type="submit" disabled={saving}
            className="w-full py-3 rounded-full bg-gray-900 hover:bg-black text-white text-sm font-semibold disabled:opacity-60">
            {saving ? 'Checking in…' : 'Check In Now'}
          </button>
        </form>
      ) : (
        /* ── ACTIVE VISIT / CHECK-OUT FORM ── */
        <form onSubmit={submitCheckOut} className="bg-white rounded-2xl border border-pink-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-pink-500 font-bold text-sm">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse" /> VISIT IN PROGRESS
            </span>
            <span className="text-xs text-gray-400">
              Started {new Date(active.checkInAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 space-y-1">
            <p className="text-sm font-bold text-gray-900">{active.customerName || active.contact?.firstName || 'Field visit'}</p>
            {active.customerPhone && <p className="text-xs text-gray-500">{active.customerPhone}</p>}
            {active.checkInAddress && <p className="text-xs text-gray-400 flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 shrink-0" /> {active.checkInAddress}</p>}
          </div>

          <div>
            <label className={LB}>VISIT OUTCOME <span className="text-pink-500">*</span></label>
            <div className="grid grid-cols-2 gap-2">
              {OUTCOMES.map((o) => (
                <button type="button" key={o} onClick={() => setOutForm((f) => ({ ...f, outcome: o }))}
                  className={`text-xs font-medium rounded-lg border py-2 px-2 transition-colors ${
                    outForm.outcome === o ? 'border-pink-400 bg-pink-50 text-pink-600' : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}>
                  {o}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={LB}>NOTES</label>
            <textarea rows={3} value={outForm.notes} onChange={setOut('notes')} className={INPUT} placeholder="How did the visit go?" />
          </div>

          {formError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>}

          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="flex-1 py-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
              <LogOut className="w-4 h-4" /> {saving ? 'Checking out…' : 'Check Out'}
            </button>
            <button type="button" onClick={async () => { if (confirm('Cancel this visit?')) await cancel(); }}
              className="px-5 py-3 rounded-full border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
