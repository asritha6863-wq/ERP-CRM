import { useState } from 'react';
import { Plus, Pencil, ToggleLeft, ToggleRight } from 'lucide-react';
import useMaster from '../../hooks/useMaster.js';
import DataTable from '../../components/ui/DataTable.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import FilterBar from '../../components/ui/FilterBar.jsx';
import Button from '../../components/ui/Button.jsx';
import ModalForm from '../../components/ui/ModalForm.jsx';
import Badge from '../../components/ui/Badge.jsx';

// Config shape:
// {
//   entity: string,         // API entity key
//   title: string,          // Page heading
//   singular: string,       // e.g. "Branch"
//   columns: Column[],      // DataTable column definitions (excluding the Actions column)
//   fields: FormField[],    // Form fields for create/edit
//   hasIsActive: boolean,   // Show activate/deactivate
// }
//
// FormField: { key, label, type ('text'|'color'|'number'), required, defaultValue }

export default function MasterCrudScreen({ config }) {
  const {
    data, total, pages, page, setPage,
    search, setSearch,
    loading, error,
    create, update, toggle, limit,
  } = useMaster(config.entity);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null); // null = new
  const [form, setForm]           = useState({});
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  const openCreate = () => {
    const defaults = Object.fromEntries(config.fields.map((f) => [f.key, f.defaultValue ?? '']));
    setForm(defaults);
    setEditing(null);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (row) => {
    const vals = Object.fromEntries(config.fields.map((f) => [f.key, row[f.key] ?? f.defaultValue ?? '']));
    setForm(vals);
    setEditing(row);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError('');
    setSaving(true);
    try {
      if (editing) {
        await update(editing.id, form);
      } else {
        await create(form);
      }
      setModalOpen(false);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (row) => {
    try { await toggle(row.id); } catch {}
  };

  // Build columns: config columns + optional isActive + actions
  const columns = [
    ...config.columns,
    ...(config.hasIsActive
      ? [{
          key: 'isActive',
          header: 'Status',
          render: (val) => (
            <Badge
              label={val ? 'Active' : 'Inactive'}
              color={val ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}
            />
          ),
        }]
      : []),
    {
      key: '_actions',
      header: '',
      render: (_, row) => (
        <div className="flex items-center gap-1 justify-end">
          <button
            onClick={() => openEdit(row)}
            className="p-1.5 rounded hover:bg-gray-100 text-gray-500 hover:text-indigo-600"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
          {config.hasIsActive && (
            <button
              onClick={() => handleToggle(row)}
              className={`p-1.5 rounded hover:bg-gray-100 ${row.isActive ? 'text-emerald-600' : 'text-gray-400'}`}
              title={row.isActive ? 'Deactivate' : 'Activate'}
            >
              {row.isActive
                ? <ToggleRight className="w-4 h-4" />
                : <ToggleLeft className="w-4 h-4" />
              }
            </button>
          )}
        </div>
      ),
      className: 'w-20',
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">{config.title}</h1>
        <Button icon={Plus} onClick={openCreate}>
          Add {config.singular}
        </Button>
      </div>

      {/* Filter */}
      <FilterBar
        search={search}
        onSearch={setSearch}
        placeholder={`Search ${config.title.toLowerCase()}…`}
      />

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">
          {error}
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={data}
        loading={loading}
        emptyMessage={`No ${config.title.toLowerCase()} found`}
      />

      {/* Pagination */}
      <Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} />

      {/* Modal */}
      <ModalForm
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${config.singular}` : `Add ${config.singular}`}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button loading={saving} onClick={handleSave}>
              {editing ? 'Save changes' : `Create ${config.singular}`}
            </Button>
          </>
        }
      >
        {formError && (
          <div className="mb-4 bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">
            {formError}
          </div>
        )}
        <div className="space-y-4">
          {config.fields.map((field) => (
            <div key={field.key}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {field.label}
                {field.required && <span className="text-red-500 ml-0.5">*</span>}
              </label>
              {field.type === 'color' ? (
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form[field.key] || '#6b7280'}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={form[field.key] || ''}
                    onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="#6b7280"
                  />
                </div>
              ) : field.type === 'select' ? (
                <select
                  value={form[field.key] ?? field.defaultValue ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {(field.options || []).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type || 'text'}
                  value={form[field.key] ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                  required={field.required}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder={field.placeholder || ''}
                />
              )}
            </div>
          ))}
        </div>
      </ModalForm>
    </div>
  );
}
