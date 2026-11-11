import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

export default function useDeals() {
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [filters, setFilters] = useState({ ownerId: '', branchId: '', dateFrom: '', dateTo: '' });

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { ...filters };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const res = await api.get('/deals', { params });
      setColumns(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load pipeline');
    } finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleFilter = (key, val) => setFilters((f) => ({ ...f, [key]: val }));
  const clearFilters = () => setFilters({ ownerId: '', branchId: '', dateFrom: '', dateTo: '' });

  const createDeal  = async (body) => { const r = await api.post('/deals', body);             fetchData(); return r.data; };
  const updateDeal  = async (id, b) => { const r = await api.put(`/deals/${id}`, b);          fetchData(); return r.data; };
  const moveStage   = async (id, b) => { const r = await api.patch(`/deals/${id}/stage`, b);  fetchData(); return r.data; };
  const deleteDeal  = async (id)    => { await api.delete(`/deals/${id}`);                    fetchData(); };

  return {
    columns, loading, error,
    filters, setFilter: handleFilter, clearFilters,
    refetch: fetchData,
    createDeal, updateDeal, moveStage, deleteDeal,
  };
}
