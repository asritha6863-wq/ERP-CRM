import { createContext, useState, useEffect, useContext, useCallback } from 'react';
import api from '../services/api.js';
import { useAuth } from './AuthContext.jsx';

const GlobalFilterContext = createContext(null);

export function GlobalFilterProvider({ children }) {
  const { user } = useAuth();

  const [companies, setCompanies]   = useState([]);
  const [branches, setBranches]     = useState([]);
  const [companyId, setCompanyId]   = useState('');
  const [branchId, setBranchId]     = useState('');

  // Load companies (ADMIN only)
  useEffect(() => {
    if (user?.role === 'ADMIN') {
      api.get('/masters/companies').then((r) => setCompanies(r.data.data || [])).catch(() => {});
    }
  }, [user]);

  // Load branches when companyId changes (ADMIN/MANAGER)
  const loadBranches = useCallback(async (cId) => {
    if (!cId) { setBranches([]); return; }
    try {
      const r = await api.get('/masters/branches');
      const all = r.data.data || [];
      setBranches(all.filter((b) => !cId || b.companyId === cId || !b.companyId));
    } catch {}
  }, []);

  useEffect(() => {
    if (user?.role !== 'SALES') {
      loadBranches(companyId);
    }
    // MANAGER is always locked to their own branch
    if (user?.role === 'MANAGER') {
      setBranchId(user.branchId || '');
    }
  }, [companyId, user, loadBranches]);

  const handleCompanyChange = (id) => {
    setCompanyId(id);
    setBranchId(''); // reset branch when company changes
  };

  const handleBranchChange = (id) => {
    if (user?.role !== 'MANAGER' && user?.role !== 'SALES') {
      setBranchId(id);
    }
  };

  // Build the query params to append to every API request
  const globalParams = {};
  if (companyId) globalParams.companyId = companyId;
  if (branchId)  globalParams.branchId  = branchId;

  return (
    <GlobalFilterContext.Provider value={{
      companies,
      branches,
      companyId,
      branchId,
      setCompanyId: handleCompanyChange,
      setBranchId:  handleBranchChange,
      globalParams,
    }}>
      {children}
    </GlobalFilterContext.Provider>
  );
}

export function useGlobalFilter() {
  const ctx = useContext(GlobalFilterContext);
  if (!ctx) throw new Error('useGlobalFilter must be used within GlobalFilterProvider');
  return ctx;
}
