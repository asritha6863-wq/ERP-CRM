import { useEffect, useRef, useState } from 'react';
import { MapPin, Clock, RefreshCw, User, Phone, List, Map as MapIcon, Crosshair, X } from 'lucide-react';
import { useBdeLiveLocations } from '../../hooks/useBdeField.js';
import { loadLeaflet } from '../../utils/loadLeaflet.js';

const timeAgo = (iso) => {
  if (!iso) return 'Never seen';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return new Date(iso).toLocaleDateString('en-GB');
};

const isStale = (iso) => !iso || (Date.now() - new Date(iso).getTime()) > 15 * 60000; // > 15 min = stale

export default function BdeLiveMapPage() {
  const { data, loading, error, refetch } = useBdeLiveLocations(30000);
  const [view, setView] = useState('map'); // 'map' | 'list'
  const [selectedId, setSelectedId] = useState(''); // '' = show everyone
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const markersRef = useRef({});

  const selected = data.find((d) => d.user.id === selectedId) || null;

  const focusOn = (id) => {
    setSelectedId(id);
    setView('map');
  };

  // Initialize map once
  useEffect(() => {
    if (view !== 'map') return;
    let cancelled = false;
    loadLeaflet().then((L) => {
      if (cancelled || !mapRef.current || mapObj.current) return;
      mapObj.current = L.map(mapRef.current).setView([10.8505, 76.2711], 11); // Kerala default
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(mapObj.current);
    });
    return () => { cancelled = true; };
  }, [view]);

  // Update markers whenever data or the selected employee changes
  useEffect(() => {
    if (view !== 'map' || !mapObj.current) return;
    loadLeaflet().then((L) => {
      const all = data.filter((d) => d.lat !== null && d.lng !== null);
      // When one employee is selected, only plot that pin — keeps the map uncluttered
      const withLocation = selectedId ? all.filter((d) => d.user.id === selectedId) : all;
      const shownIds = new Set(withLocation.map((d) => d.user.id));

      // Remove markers that are no longer shown (either gone, or filtered out by selection)
      Object.keys(markersRef.current).forEach((id) => {
        if (!shownIds.has(id)) {
          mapObj.current.removeLayer(markersRef.current[id]);
          delete markersRef.current[id];
        }
      });

      withLocation.forEach((d) => {
        const stale = isStale(d.lastSeenAt);
        const color = stale ? '#9ca3af' : d.activeVisit ? '#10b981' : '#f72f6e';
        const size = selectedId === d.user.id ? 20 : 14;
        const icon = L.divIcon({
          className: '',
          html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.45)"></div>`,
          iconSize: [size, size],
        });

        if (markersRef.current[d.user.id]) {
          markersRef.current[d.user.id].setLatLng([d.lat, d.lng]);
          markersRef.current[d.user.id].setIcon(icon);
        } else {
          const marker = L.marker([d.lat, d.lng], { icon }).addTo(mapObj.current);
          markersRef.current[d.user.id] = marker;
        }
        markersRef.current[d.user.id].bindPopup(
          `<strong>${d.user.name}</strong><br/>${d.activeVisit ? 'On a visit now' : 'Not on a visit'}<br/><span style="color:#888">${timeAgo(d.lastSeenAt)}</span>`
        );
      });

      if (selectedId && withLocation.length === 1) {
        // Zoom in close on the selected employee every time their location updates
        mapObj.current.setView([withLocation[0].lat, withLocation[0].lng], 16);
        markersRef.current[selectedId]?.openPopup();
      } else if (!selectedId && all.length && !mapObj.current._fitted) {
        const bounds = L.latLngBounds(all.map((d) => [d.lat, d.lng]));
        mapObj.current.fitBounds(bounds, { padding: [40, 40] });
        mapObj.current._fitted = true;
      }
    });
  }, [data, view, selectedId]);

  const onDuty = data.filter((d) => d.activeVisit).length;
  const seenToday = data.filter((d) => d.lastSeenAt && !isStale(d.lastSeenAt)).length;

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">BDE Live Location</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track field marketing staff location and active visits</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={selectedId}
            onChange={(e) => focusOn(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 bg-white min-w-[180px]"
          >
            <option value="">Select employee…</option>
            {data.map((d) => (
              <option key={d.user.id} value={d.user.id}>
                {d.user.name}{d.activeVisit ? ' • on a visit' : d.lat === null ? ' • no location yet' : ''}
              </option>
            ))}
          </select>
          {selectedId && (
            <button
              onClick={() => { setSelectedId(''); if (mapObj.current) mapObj.current._fitted = false; }}
              className="flex items-center gap-1 px-2.5 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm text-gray-500"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            <button onClick={() => setView('map')} className={`px-3 py-2 text-sm flex items-center gap-1.5 ${view === 'map' ? 'bg-pink-500 text-white' : 'bg-white text-gray-600'}`}>
              <MapIcon className="w-4 h-4" /> Map
            </button>
            <button onClick={() => setView('list')} className={`px-3 py-2 text-sm flex items-center gap-1.5 ${view === 'list' ? 'bg-pink-500 text-white' : 'bg-white text-gray-600'}`}>
              <List className="w-4 h-4" /> List
            </button>
          </div>
          <button onClick={refetch} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm text-gray-600">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>
      </div>

      {/* Selected employee summary card */}
      {selected && (
        <div className="bg-white rounded-xl border border-pink-200 p-4 flex items-center gap-4">
          <div className="w-11 h-11 rounded-full bg-pink-100 text-pink-600 font-bold flex items-center justify-center shrink-0 text-base">
            {selected.user.name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900">{selected.user.name}</p>
            <p className="text-xs text-gray-400">{selected.user.branch?.name || 'No branch'}</p>
          </div>
          <div className="text-right">
            {selected.lat === null ? (
              <p className="text-xs text-gray-400">No location shared yet</p>
            ) : (
              <>
                <p className="text-xs text-gray-500">{selected.lat.toFixed(5)}, {selected.lng.toFixed(5)}</p>
                <p className="text-[11px] text-gray-400 mt-0.5 flex items-center justify-end gap-1"><Clock className="w-3 h-3" /> {timeAgo(selected.lastSeenAt)}</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* KPI strip */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10px] font-semibold text-gray-400 tracking-widest">TOTAL BDE</p>
          <p className="text-2xl font-bold text-gray-900 font-mono">{data.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-4">
          <p className="text-[10px] font-semibold text-emerald-500 tracking-widest">ON A VISIT NOW</p>
          <p className="text-2xl font-bold text-emerald-600 font-mono">{onDuty}</p>
        </div>
        <div className="bg-white rounded-xl border border-pink-200 p-4">
          <p className="text-[10px] font-semibold text-pink-500 tracking-widest">ONLINE (LAST 15 MIN)</p>
          <p className="text-2xl font-bold text-pink-600 font-mono">{seenToday}</p>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}

      {view === 'map' ? (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div ref={mapRef} style={{ height: '520px', width: '100%' }} />
          <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-100 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> On a visit</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-pink-500 inline-block" /> Online, no active visit</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" /> Offline (&gt;15 min)</span>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {loading && <p className="text-center text-gray-400 py-10">Loading…</p>}
          {!loading && data.length === 0 && <p className="text-center text-gray-400 py-10">No BDE staff found</p>}
          {!loading && data.map((d) => {
            const stale = isStale(d.lastSeenAt);
            return (
              <div key={d.user.id} className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-full bg-pink-100 text-pink-600 font-bold flex items-center justify-center shrink-0">
                  {d.user.name[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{d.user.name}</p>
                  <p className="text-xs text-gray-400">{d.user.branch?.name || 'No branch'}</p>
                </div>
                <div className="text-right">
                  {d.activeVisit ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> On a visit
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 border ${stale ? 'text-gray-400 bg-gray-50 border-gray-200' : 'text-pink-600 bg-pink-50 border-pink-200'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${stale ? 'bg-gray-400' : 'bg-pink-500'}`} /> {stale ? 'Offline' : 'Online'}
                    </span>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1 flex items-center justify-end gap-1"><Clock className="w-3 h-3" /> {timeAgo(d.lastSeenAt)}</p>
                </div>
                <button
                  onClick={() => focusOn(d.user.id)}
                  disabled={d.lat === null}
                  title={d.lat === null ? 'No location shared yet' : 'Show on map'}
                  className="p-2 rounded-lg border border-gray-200 text-pink-500 hover:bg-pink-50 disabled:opacity-40 disabled:hover:bg-white shrink-0"
                >
                  <Crosshair className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
