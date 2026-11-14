import { useNavigate } from 'react-router-dom';
import { LogOut, Building2, GitBranch, Bell, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useGlobalFilter } from '../../context/GlobalFilterContext.jsx';

export default function Topbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { companies, branches, companyId, branchId, setCompanyId, setBranchId } = useGlobalFilter();

  const handleLogout = () => { logout(); navigate('/login'); };

  const roleLabel = { ADMIN: 'Administrator', MANAGER: 'Branch Manager', SALES: 'Sales Executive' };

  return (
    <header className="no-print bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between gap-4 shrink-0 z-10"
      style={{ boxShadow: '0 1px 0 0 #f3f4f6' }}>

      {/* Left — global selectors */}
      <div className="flex items-center gap-3">
        {user?.role === 'ADMIN' && (
          <>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              <select value={companyId} onChange={(e) => setCompanyId(e.target.value)}
                className="bg-transparent text-xs text-gray-700 focus:outline-none cursor-pointer">
                <option value="">All Companies</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <GitBranch className="w-3.5 h-3.5 text-gray-400" />
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)}
                className="bg-transparent text-xs text-gray-700 focus:outline-none cursor-pointer">
                <option value="">All Branches</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </>
        )}
        {user?.role === 'MANAGER' && user.branch?.name && (
          <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-xl px-3 py-2">
            <GitBranch className="w-3.5 h-3.5 text-brand-500" />
            <span className="text-xs font-medium text-brand-600">{user.branch.name}</span>
          </div>
        )}
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 ml-auto">
        {/* Notification bell */}
        <button className="relative w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors">
          <Bell className="w-4 h-4 text-gray-500" />
        </button>

        {/* User avatar + info */}
        <div className="flex items-center gap-2.5 pl-3 border-l border-gray-100">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #f72f6e, #c40f56)' }}>
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-xs font-semibold text-gray-900 leading-none">{user?.name}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{roleLabel[user?.role] || user?.role}</p>
          </div>
          <button onClick={handleLogout}
            className="ml-1 p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
