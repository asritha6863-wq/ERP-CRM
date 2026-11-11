import { useState, useEffect, useCallback } from 'react';
import api from '../services/api.js';

// Generic hook for CRUD operations on master entities
// entity: e.g. 'branches', 'lead-sources', 'lead-statuses', etc.
export default function useMaster(entity) {
  const [data, setData]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [pages, setPages]     = useState(1);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const limit = 20;

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/masters/${entity}`, {
        params: { page, limit, search },
      });
      setData(res.data.data);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [entity, page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Reset to page 1 on search change
  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };

  const create = async (body) => {
    const res = await api.post(`/masters/${entity}`, body);
    fetchData();
    return res.data;
  };

  const update = async (id, body) => {
    const res = await api.put(`/masters/${entity}/${id}`, body);
    fetchData();
    return res.data;
  };

  const toggle = async (id) => {
    const res = await api.patch(`/masters/${entity}/${id}/toggle`);
    fetchData();
    return res.data;
  };

  return {
    data, total, pages, page, setPage,
    search, setSearch: handleSearch,
    loading, error,
    create, update, toggle, refetch: fetchData,
    limit,
  };
}
