import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';
import { useGlobalFilter } from '../context/GlobalFilterContext.jsx';

export default function useContacts() {
  const { globalParams } = useGlobalFilter();

  const [data, setData]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [pages, setPages]     = useState(1);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [filters, setFilters] = useState({
    typeId: '', branchId: '', assignedToId: '', isDuplicate: '', requiresReview: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = { page, limit, search, ...filters, ...globalParams };
      Object.keys(params).forEach((k) => !params[k] && delete params[k]);
      const res = await api.get('/contacts', { params });
      setData(res.data.data);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load contacts');
    } finally { setLoading(false); }
  }, [page, search, filters, globalParams]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [globalParams]);

  const handleSearch = (val) => { setSearch(val); setPage(1); };
  const handleFilter = (key, val) => { setFilters((f) => ({ ...f, [key]: val })); setPage(1); };
  const clearFilters = () => {
    setFilters({ typeId: '', branchId: '', assignedToId: '', isDuplicate: '', requiresReview: '' });
    setPage(1);
  };

  const createContact = async (body) => { const r = await api.post('/contacts', body);              fetchData(); return r.data; };
  const updateContact = async (id, b) => { const r = await api.put(`/contacts/${id}`, b);           fetchData(); return r.data; };
  const deleteContact = async (id)    => { await api.delete(`/contacts/${id}`);                     fetchData(); };

  return {
    data, total, pages, page, setPage, search, setSearch: handleSearch,
    filters, setFilter: handleFilter, clearFilters,
    loading, error, limit, refetch: fetchData,
    createContact, updateContact, deleteContact,
  };
}
