import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

// Wraps the browser Geolocation API as a promise
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('GPS is not supported on this device'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(new Error(err.message || 'Could not get your location. Please allow location access.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0, ...options },
    );
  });
}

// Reverse geocode lat/lng to a readable address using OpenStreetMap (free, no key)
export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`);
    const data = await res.json();
    return data?.display_name || null;
  } catch {
    return null;
  }
}

// BDE's own visit flow: check-in / check-out + background location pings
export function useBdeVisit() {
  const [active, setActive]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const refresh = useCallback(async () => {
    try {
      const r = await api.get('/bde-field/visits/active');
      setActive(r.data || null);
    } catch (err) { setError(err.response?.data?.error || 'Could not load visit status'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const checkIn = async (body) => {
    const r = await api.post('/bde-field/visits/check-in', body);
    setActive(r.data);
    return r.data;
  };

  const checkOut = async (body) => {
    const r = await api.put(`/bde-field/visits/${active.id}/check-out`, body);
    setActive(null);
    return r.data;
  };

  const cancel = async () => {
    await api.put(`/bde-field/visits/${active.id}/cancel`);
    setActive(null);
  };

  return { active, loading, error, refresh, checkIn, checkOut, cancel };
}

// Sends a GPS ping every `intervalMs` while `enabled` is true — powers the admin live map
export function useLocationPings(enabled, intervalMs = 180000) {
  useEffect(() => {
    if (!enabled) return undefined;
    const send = async () => {
      try {
        const { lat, lng, accuracy } = await getCurrentPosition();
        await api.post('/bde-field/location/ping', { lat, lng, accuracy });
      } catch { /* ignore GPS errors in the background */ }
    };
    send();
    const id = setInterval(send, intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs]);
}

// Admin/Manager: list of all BDE staff with their last known location
export function useBdeLiveLocations(pollMs = 30000) {
  const [data, setData]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetchData = useCallback(async () => {
    try {
      const r = await api.get('/bde-field/location/live');
      setData(r.data || []);
    } catch (err) { setError(err.response?.data?.error || 'Could not load staff locations'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, pollMs);
    return () => clearInterval(id);
  }, [fetchData, pollMs]);

  return { data, loading, error, refetch: fetchData };
}

export function useBdeVisits(filters = {}) {
  const [data, setData]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { ...filters };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const r = await api.get('/bde-field/visits', { params });
      setData(r.data.data || []);
      setTotal(r.data.total || 0);
    } catch (err) { setError(err.response?.data?.error || 'Could not load visits'); }
    finally { setLoading(false); }
  }, [JSON.stringify(filters)]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { data, total, loading, error, refetch: fetchData };
}
