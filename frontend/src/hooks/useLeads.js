import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

export default function useLeads(initialQuery = {}) {
  const [data, setData]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [pages, setPages]     = useState(1);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [filters, setFilters] = useState({ statusId: '', sourceId: '', branchId: '', assignedToId: '', dateFrom: '', dateTo: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { page, limit, search, ...filters };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const res = await api.get('/leads', { params });
      setData(res.data.data);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load leads');
    } finally { setLoading(false); }
  }, [page, search, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = (val) => { setSearch(val); setPage(1); };
  const handleFilter = (key, val) => { setFilters((f) => ({ ...f, [key]: val })); setPage(1); };
  const clearFilters = () => { setFilters({ statusId: '', sourceId: '', branchId: '', assignedToId: '', dateFrom: '', dateTo: '' }); setPage(1); };

  const createLead   = async (body) => { const r = await api.post('/leads', body);         fetchData(); return r.data; };
  const updateLead   = async (id, body) => { const r = await api.put(`/leads/${id}`, body); fetchData(); return r.data; };
  const bulkAssign   = async (body) => { const r = await api.post('/leads/bulk-assign', body); fetchData(); return r.data; };
  const convertLead  = async (id) => { const r = await api.post(`/leads/${id}/convert`); fetchData(); return r.data; };

  return {
    data, total, pages, page, setPage, search, setSearch: handleSearch,
    filters, setFilter: handleFilter, clearFilters,
    loading, error, limit, refetch: fetchData,
    createLead, updateLead, bulkAssign, convertLead,
  };
}
