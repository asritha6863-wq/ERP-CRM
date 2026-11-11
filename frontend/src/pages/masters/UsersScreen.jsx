import { useState, useEffect } from 'react';
import { Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import useUsers from '../../hooks/useUsers.js';
import DataTable from '../../components/ui/DataTable.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import FilterBar from '../../components/ui/FilterBar.jsx';
import Button from '../../components/ui/Button.jsx';
import ModalForm from '../../components/ui/ModalForm.jsx';
import Badge from '../../components/ui/Badge.jsx';
import api from '../../services/api.js';

const ROLES = ['ADMIN', 'MANAGER', 'SALES'];
const ROLE_COLORS = {
  ADMIN:   'bg-purple-100 text-purple-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  SALES:   'bg-teal-100 text-teal-700',
};

const EMPTY_FORM = { name: '', email: '', password: '', role: 'SALES', branchId: '' };

export default function UsersScreen() {
  const {
    data, total, pages, page, setPage,
    search, setSearch,
    loading, error,
    create, update, toggle, limit,
  } = useUsers();

  const [branches, setBranches]   = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  // Load branches for the branch dropdown
  useEffect(() => {
    api.get('/masters/branches', { params: { limit: 100 } })
      .then((r) => setBranches(r.data.data || []))
      .catch(() => {});
  }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setEditing(null);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (user) => {
    setForm({ name: user.name, email: user.email, password: '', role: user.role, branchId: user.branchId || '' });
    setEditing(user);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError('');
    setSaving(true);
    try {
      const payload = { ...form };
      if (editing && !payload.password) delete payload.password; // Don't update password if blank
      if (editing) {
        await update(editing.id, payload);
      } else {
        await create(payload);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const columns = [
    { key: 'name',  header: 'Name',   sortable: true },
    { key: 'email', header: 'Email',  sortable: true },
    {
      key: 'role',
      header: 'Role',
      render: (val) => <Badge label={val} color={ROLE_COLORS[val]} />,
    },
    {
      key: 'branch',
      header: 'Branch',
      render: (_, row) => row.branch?.name || <span className="text-gray-400">—</span>,
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (val) => (
        <Badge
          label={val ? 'Active' : 'Inactive'}
          color={val ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}
        />
      ),
    },
    {
      key: '_actions',
      header: '',
      className: 'w-24',
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => openEdit(row)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-indigo-600" title="Edit">
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={() => toggle(row.id)}
            className={`p-1.5 rounded hover:bg-gray-100 ${row.isActive ? 'text-emerald-600' : 'text-gray-400'}`}
            title={row.isActive ? 'Deactivate' : 'Activate'}
          >
            {row.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Users</h1>
        <Button icon={Plus} onClick={openCreate}>Add User</Button>
      </div>

      <FilterBar search={search} onSearch={setSearch} placeholder="Search users…" />

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>
      )}

      <DataTable columns={columns} data={data} loading={loading} emptyMessage="No users found" />
      <Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} />

      <ModalForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit User' : 'Add User'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleSave}>{editing ? 'Save changes' : 'Create User'}</Button>
          </>
        }
      >
        {formError && (
          <div className="mb-4 bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{formError}</div>
        )}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
            <input value={form.name} onChange={set('name')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Full name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
            <input type="email" value={form.email} onChange={set('email')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="user@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password {editing && <span className="text-gray-400 font-normal">(leave blank to keep existing)</span>}
              {!editing && <span className="text-red-500 ml-0.5">*</span>}
            </label>
            <input type="password" value={form.password} onChange={set('password')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role <span className="text-red-500">*</span></label>
            <select value={form.role} onChange={set('role')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
            <select value={form.branchId} onChange={set('branchId')} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="">— None —</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
      </ModalForm>
    </div>
  );
}
