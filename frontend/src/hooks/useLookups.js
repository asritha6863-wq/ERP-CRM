// Loads all master dropdown data (sources, statuses, branches, categories, staff) in one shot
import { useState, useEffect } from 'react';
import api from '../services/api.js';

export default function useLookups() {
  const [lookups, setLookups] = useState({ sources: [], statuses: [], branches: [], categories: [], staff: [], stages: [], lostReasons: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const L = 100;
    Promise.allSettled([
      api.get('/masters/lead-sources',        { params: { limit: L } }),
      api.get('/masters/lead-statuses',        { params: { limit: L } }),
      api.get('/masters/branches',             { params: { limit: L } }),
      api.get('/masters/customer-categories',  { params: { limit: L } }),
      api.get('/users',                        { params: { limit: L } }),
      api.get('/masters/pipeline-stages',      { params: { limit: L } }),
      api.get('/masters/lost-reasons',         { params: { limit: L } }),
    ]).then(([src, stat, br, cat, usr, stg, lr]) => {
      setLookups({
        sources:     src.value?.data?.data     || [],
        statuses:    stat.value?.data?.data    || [],
        branches:    br.value?.data?.data      || [],
        categories:  cat.value?.data?.data     || [],
        staff:       usr.value?.data?.data     || [],
        stages:      stg.value?.data?.data     || [],
        lostReasons: lr.value?.data?.data      || [],
      });
      setLoading(false);
    });
  }, []);

  return { lookups, loading };
}
