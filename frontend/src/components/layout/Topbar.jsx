import { useNavigate } from 'react-router-dom';
import { LogOut, Building2, GitBranch } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useGlobalFilter } from '../../context/GlobalFilterContext.jsx';

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { companies, branches, companyId, branchId, setCompanyId, setBranchId } = useGlobalFilter();

  const handleLogout = () => { logout(); navigate('/login'); };

  const roleLabel = { ADMIN: 'Admin', MANAGER: 'Manager', SALES: 'Sales Staff' };

  const canSelectCompany = user?.role === 'ADMIN';
  const canSelectBranch  = user?.role === 'ADMIN';

  return (
    <header className="print:hidden bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {/* Company selector — ADMIN only */}
        {canSelectCompany && (
          <div className="flex items-center gap-1.5 text-sm">
            <Building2 className="w-4 h-4 text-gray-400" />
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Companies</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Branch selector — ADMIN only (MANAGER sees locked label) */}
        {canSelectBranch && (
          <div className="flex items-center gap-1.5 text-sm">
            <GitBranch className="w-4 h-4 text-gray-400" />
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-700 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">All Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* MANAGER: show locked branch label */}
        {user?.role === 'MANAGER' && user.branch?.name && (
          <div className="flex items-center gap-1.5 text-sm text-gray-500">
            <GitBranch className="w-4 h-4" />
            <span>{user.branch.name}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4 ml-auto">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">{user?.name}</p>
          <p className="text-xs text-gray-500">{roleLabel[user?.role] || user?.role}</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </header>
  );
}
