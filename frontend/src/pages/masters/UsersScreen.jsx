import { useState, useEffect } from 'react';
import { Plus, Pencil, ToggleLeft, ToggleRight, Eye, EyeOff, ShieldCheck, Users, Settings2, User } from 'lucide-react';
import useUsers from '../../hooks/useUsers.js';
import Pagination from '../../components/ui/Pagination.jsx';
import Button from '../../components/ui/Button.jsx';
import api from '../../services/api.js';
import { ACCESS_MENU, ALL_ACCESS_IDS, MASTER_IDS } from '../../utils/accessMenu.js';

const ROLE_META = {
  ADMIN:   { label: 'Admin',   desc: 'Full access to everything including Masters and User Management', color: 'bg-purple-100 text-purple-700 border-purple-200', icon: ShieldCheck },
  MANAGER: { label: 'Manager', desc: 'Access to leads, reports and team management. No Masters.', color: 'bg-blue-100 text-blue-700 border-blue-200',   icon: Users },
  SALES:   { label: 'Sales',   desc: 'Basic access to leads and tasks only.',                          color: 'bg-teal-100 text-teal-700 border-teal-200',     icon: User },
};

const IN = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white transition';
const LB = 'block text-xs font-semibold text-gray-600 mb-1.5';

const EMPTY = { name: '', email: '', password: '', role: 'SALES', branchId: '', dateOfBirth: '', customAccess: false, permissions: [] };

// ── small helpers ──────────────────────────────────────────────────────────────
function RolePicker({ value, onChange }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {Object.entries(ROLE_META).map(([key, m]) => {
        const Icon = m.icon;
        const active = value === key;
        return (
          <button key={key} type="button" onClick={() => onChange(key)}
            className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 px-2 text-center transition-all ${active ? m.color + ' border-current' : 'border-gray-200 text-gray-500 hover:border-gray-300 bg-white'}`}>
            <Icon className="w-5 h-5" />
            <span className="text-xs font-bold">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function PermissionPicker({ permissions, onChange }) {
  const togglePerm = (ids) => {
    const all = ids.every((i) => permissions.includes(i));
    const rest = permissions.filter((p) => !ids.includes(p));
    onChange(all ? rest : [...rest, ...ids]);
  };
  const count = permissions.length;
  const total = ALL_ACCESS_IDS.length;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between bg-gray-50 border-b border-gray-200 px-3 py-2">
        <span className="text-xs font-semibold text-gray-700">{count} / {total} sections selected</span>
        <div className="flex gap-3 text-xs">
          <button type="button" className="text-pink-600 font-medium hover:underline"
            onClick={() => onChange([...ALL_ACCESS_IDS])}>All</button>
          <button type="button" className="text-gray-400 hover:underline"
            onClick={() => onChange([])}>None</button>
        </div>
      </div>

      {/* Sections */}
      <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
        {ACCESS_MENU.map((sec) => {
          const ids = sec.children ? sec.children.map((c) => c.id) : [sec.id];
          const n   = ids.filter((i) => permissions.includes(i)).length;
          const isMasterSec = sec.id === 'masters';

          return (
            <div key={sec.id} className="px-3 py-2.5">
              {/* Section header */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox"
                  className="accent-pink-500 w-4 h-4"
                  checked={n === ids.length}
                  ref={(el) => { if (el) el.indeterminate = n > 0 && n < ids.length; }}
                  onChange={() => togglePerm(ids)} />
                <span className="text-sm font-semibold text-gray-800">{sec.label}</span>
                {isMasterSec && (
                  <span className="ml-auto text-[10px] bg-amber-50 text-amber-600 border border-amber-200 rounded px-1.5 py-0.5 font-medium">
                    Read-only masters data
                  </span>
                )}
              </label>

              {/* Sub-items */}
              {sec.children && (
                <div className="mt-2 ml-6 grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {sec.children.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer select-none">
                      <input type="checkbox"
                        className="accent-pink-500 w-3.5 h-3.5"
                        checked={permissions.includes(c.id)}
                        onChange={() => togglePerm([c.id])} />
                      <span className="text-xs text-gray-600">{c.label}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────────
export default function UsersScreen() {
  const { data, total, pages, page, setPage, search, setSearch, loading, error, create, update, toggle, limit } = useUsers();
  const [branches, setBranches] = useState([]);
  const [drawer, setDrawer]     = useState(null); // null | { mode: 'create'|'edit', user? }
  const [form, setForm]         = useState(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState('');
  const [showPw, setShowPw]     = useState(false);

  useEffect(() => {
    api.get('/masters/branches', { params: { limit: 100 } }).then((r) => setBranches(r.data.data || [])).catch(() => {});
  }, []);

  const openCreate = () => { setForm(EMPTY); setFormError(''); setShowPw(false); setDrawer({ mode: 'create' }); };
  const openEdit   = (u)  => {
    setForm({ name: u.name, email: u.email, password: '', role: u.role, branchId: u.branchId || '',
      dateOfBirth: u.dateOfBirth ? u.dateOfBirth.slice(0, 10) : '',
      customAccess: Array.isArray(u.permissions),
      permissions:  Array.isArray(u.permissions) ? u.permissions : [] });
    setFormError(''); setShowPw(false); setDrawer({ mode: 'edit', user: u });
  };
  const closeDrawer = () => setDrawer(null);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: typeof v === 'string' ? v : v.target?.value ?? v }));

  const handleSave = async () => {
    setFormError(''); setSaving(true);
    try {
      const { customAccess, ...payload } = form;
      payload.permissions = customAccess && payload.role !== 'ADMIN' ? form.permissions : null;
      if (drawer.mode === 'edit' && !payload.password) delete payload.password;
      drawer.mode === 'edit' ? await update(drawer.user.id, payload) : await create(payload);
      closeDrawer();
    } catch (err) { setFormError(err.response?.data?.error || 'Save failed'); }
    finally { setSaving(false); }
  };

  const roleMeta = ROLE_META[form.role];

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create staff accounts and control what each person can access.</p>
        </div>
        <Button icon={Plus} onClick={openCreate}>Add User</Button>
      </div>

      {/* Search */}
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name or email…"
        className="w-full max-w-sm rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400" />

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}

      {/* User cards */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-32 rounded-2xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : data.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-sm">No users found</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.map((u) => {
            const rm = ROLE_META[u.role] || ROLE_META.SALES;
            const Icon = rm.icon;
            const permsCount = Array.isArray(u.permissions) ? u.permissions.length : null;
            return (
              <div key={u.id} className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">

                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold text-sm ${rm.color}`}>
                      {u.name[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{u.name}</p>
                      <p className="text-xs text-gray-400 truncate">{u.email}</p>
                    </div>
                  </div>
                  <span className={`shrink-0 flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border ${rm.color}`}>
                    <Icon className="w-3 h-3" /> {rm.label}
                  </span>
                </div>

                {/* Info row */}
                <div className="flex flex-wrap gap-2 text-xs text-gray-500">
                  {u.branch?.name && (
                    <span className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-md px-2 py-0.5">
                      <Settings2 className="w-3 h-3" /> {u.branch.name}
                    </span>
                  )}
                  {permsCount !== null ? (
                    <span className="flex items-center gap-1 bg-pink-50 border border-pink-200 text-pink-600 rounded-md px-2 py-0.5">
                      {permsCount} sections
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-md px-2 py-0.5">
                      Full access
                    </span>
                  )}
                  <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 border ${u.isActive ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}>
                    {u.isActive ? '● Active' : '○ Inactive'}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-auto pt-1 border-t border-gray-100">
                  <button onClick={() => openEdit(u)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 border border-gray-200 transition">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={() => toggle(u.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border transition ${u.isActive ? 'text-red-500 border-red-200 hover:bg-red-50' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}`}>
                    {u.isActive ? <><ToggleRight className="w-3.5 h-3.5" /> Deactivate</> : <><ToggleLeft className="w-3.5 h-3.5" /> Activate</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} />

      {/* ── Side drawer ── */}
      {drawer && (
        <div className="fixed inset-0 z-50 flex justify-end" aria-modal="true">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={closeDrawer} />

          {/* panel */}
          <div className="relative w-full max-w-lg bg-white h-full overflow-y-auto shadow-2xl flex flex-col">

            {/* Drawer header */}
            <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">{drawer.mode === 'edit' ? 'Edit User' : 'New User'}</h2>
                <p className="text-xs text-gray-400 mt-0.5">{drawer.mode === 'edit' ? drawer.user.name : 'Fill in the details below'}</p>
              </div>
              <button onClick={closeDrawer} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">✕</button>
            </div>

            <div className="flex-1 px-6 py-5 space-y-6">
              {formError && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{formError}</div>}

              {/* ── Step 1: Basic info ── */}
              <section>
                <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3">1 · Basic Info</p>
                <div className="space-y-3">
                  <div>
                    <label className={LB}>Full Name <span className="text-red-500">*</span></label>
                    <input value={form.name} onChange={set('name')} className={IN} placeholder="e.g. Riya Sharma" />
                  </div>
                  <div>
                    <label className={LB}>Email Address <span className="text-red-500">*</span></label>
                    <input type="email" value={form.email} onChange={set('email')} className={IN} placeholder="riya@yourstore.com" />
                  </div>
                  <div>
                    <label className={LB}>
                      Password {drawer.mode === 'edit' ? <span className="font-normal text-gray-400">(leave blank to keep)</span> : <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative">
                      <input type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')} className={IN + ' pr-10'} placeholder="Min 6 characters" />
                      <button type="button" onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={LB}>Branch</label>
                      <select value={form.branchId} onChange={set('branchId')} className={IN}>
                        <option value="">— None —</option>
                        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={LB}>Date of Birth</label>
                      <input type="date" value={form.dateOfBirth} onChange={set('dateOfBirth')} className={IN} />
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Step 2: Role ── */}
              <section>
                <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-3">2 · Role</p>
                <RolePicker value={form.role} onChange={(r) => setForm((f) => ({ ...f, role: r }))} />
                <div className={`mt-2 rounded-lg px-3 py-2 text-xs border ${roleMeta.color}`}>
                  <strong>{roleMeta.label}:</strong> {roleMeta.desc}
                </div>
              </section>

              {/* ── Step 3: Access control (non-admin only) ── */}
              {form.role !== 'ADMIN' && (
                <section>
                  <p className="text-xs font-bold tracking-widest text-gray-400 uppercase mb-1">3 · Module Access</p>
                  <p className="text-xs text-gray-500 mb-3">
                    By default the user sees everything their role allows. Toggle below to choose specific modules.
                  </p>

                  {/* Toggle */}
                  <label className="flex items-center justify-between gap-3 cursor-pointer p-3 rounded-xl border border-gray-200 hover:bg-gray-50 mb-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Restrict to specific modules</p>
                      <p className="text-xs text-gray-400">{form.customAccess ? 'Custom access — only the ticked modules below are visible.' : 'Full access — all role-allowed modules are visible.'}</p>
                    </div>
                    <div onClick={() => setForm((f) => ({
                      ...f,
                      customAccess: !f.customAccess,
                      permissions: !f.customAccess && !f.permissions.length
                        ? ALL_ACCESS_IDS.filter((i) => !MASTER_IDS.includes(i))
                        : f.permissions,
                    }))}
                      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.customAccess ? 'bg-pink-500' : 'bg-gray-200'}`}>
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.customAccess ? 'translate-x-5' : ''}`} />
                    </div>
                  </label>

                  {form.customAccess && <PermissionPicker permissions={form.permissions} onChange={(p) => setForm((f) => ({ ...f, permissions: p }))} />}
                </section>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex justify-end gap-3">
              <button onClick={closeDrawer} className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="px-7 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold disabled:opacity-60 transition">
                {saving ? 'Saving…' : drawer.mode === 'edit' ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
