import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

export default function useCustomers() {
  const [data, setData]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [pages, setPages]     = useState(1);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [filters, setFilters] = useState({ categoryId: '', branchId: '', assignedToId: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { page, limit, search, ...filters };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const res = await api.get('/customers', { params });
      setData(res.data.data);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load customers');
    } finally { setLoading(false); }
  }, [page, search, filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSearch = (val) => { setSearch(val); setPage(1); };
  const handleFilter = (key, val) => { setFilters((f) => ({ ...f, [key]: val })); setPage(1); };
  const clearFilters = () => { setFilters({ categoryId: '', branchId: '', assignedToId: '' }); setPage(1); };

  const createCustomer = async (body) => { const r = await api.post('/customers', body);          fetchData(); return r.data; };
  const updateCustomer = async (id, b) => { const r = await api.put(`/customers/${id}`, b);        fetchData(); return r.data; };
  const deleteCustomer = async (id)    => { await api.delete(`/customers/${id}`);                  fetchData(); };

  return {
    data, total, pages, page, setPage, search, setSearch: handleSearch,
    filters, setFilter: handleFilter, clearFilters,
    loading, error, limit, refetch: fetchData,
    createCustomer, updateCustomer, deleteCustomer,
  };
}
