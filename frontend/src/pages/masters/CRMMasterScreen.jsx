/**
 * CRMMasterScreen — reusable master list screen matching the CRM design system.
 *
 * config shape:
 * {
 *   entity:      string           — API entity key
 *   title:       string           — e.g. "CRM Stage Master"
 *   badge:       string           — pill text e.g. "PIPELINE CONFIGURATION"
 *   subtitle:    string           — description line
 *   addLabel:    string           — button text e.g. "Add Stage"
 *   totalLabel:  string           — counter label e.g. "TOTAL STAGES"
 *   searchPlaceholder: string
 *   icon:        ReactNode        — icon component
 *   columns:     Column[]         — { key, header, render? }
 *   fields:      Field[]          — { key, label, type, required, defaultValue, options?, placeholder? }
 *   hasIsActive: boolean
 *   hasColor:    boolean          — show color dot column
 *   hasCode:     boolean          — show #id as code column
 * }
 */

import { useState } from 'react';
import { Plus, Search, Pencil, ToggleLeft, ToggleRight, Maximize2, Check } from 'lucide-react';
import useMaster from '../../hooks/useMaster.js';
import Pagination from '../../components/ui/Pagination.jsx';

// Map tailwind-name colours to hex for dot display
const COLOR_MAP = {
  'PINK-500':    '#ec4899',
  'BLUE-500':    '#3b82f6',
  'AMBER-500':   '#f59e0b',
  'YELLOW-500':  '#eab308',
  'ORANGE-500':  '#f97316',
  'GREEN-500':   '#22c55e',
  'EMERALD-500': '#10b981',
  'RED-500':     '#ef4444',
  'VIOLET-500':  '#8b5cf6',
  'SLATE-500':   '#64748b',
  'GRAY-500':    '#6b7280',
};

function colorDot(val) {
  if (!val) return '#6b7280';
  if (val.startsWith('#')) return val;
  return COLOR_MAP[val.toUpperCase()] || val;
}

export default function CRMMasterScreen({ config }) {
  const {
    data, total, pages, page, setPage,
    search, setSearch,
    loading, error,
    create, update, toggle, limit,
  } = useMaster(config.entity);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState({});
  const [saving, setSaving]       = useState(false);
  const [formError, setFormError] = useState('');

  const openCreate = () => {
    const defaults = Object.fromEntries(
      (config.fields || []).map((f) => [f.key, f.defaultValue ?? ''])
    );
    setForm(defaults);
    setEditing(null);
    setFormError('');
    setModalOpen(true);
  };

  const openEdit = (row) => {
    const vals = Object.fromEntries(
      (config.fields || []).map((f) => [f.key, row[f.key] ?? f.defaultValue ?? ''])
    );
    setForm(vals);
    setEditing(row);
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setFormError(''); setSaving(true);
    try {
      if (editing) await update(editing.id, form);
      else         await create(form);
      setModalOpen(false);
    } catch (err) {
      setFormError(err.response?.data?.error || 'Save failed');
    } finally { setSaving(false); }
  };

  const Icon = config.icon;

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ───────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-10 h-10 rounded-xl bg-gray-900 flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-gray-900">{config.title}</h1>
              {config.badge && (
                <span className="text-xs font-semibold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded-md tracking-wide uppercase">
                  {config.badge}
                </span>
              )}
            </div>
            {config.subtitle && (
              <p className="text-xs text-gray-400 mt-0.5">{config.subtitle}</p>
            )}
          </div>
        </div>

        {/* Right — search + counter + actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {config.searchPlaceholder && (
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={config.searchPlaceholder}
                className="pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 w-52 bg-white"
              />
            </div>
          )}

          {/* Counter box */}
          <div className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 bg-white">
            <div>
              <p className="text-xs text-gray-400 leading-none">{config.totalLabel || 'TOTAL'}</p>
              <p className="text-lg font-bold text-gray-900 leading-tight">{total}</p>
            </div>
            <Check className="w-4 h-4 text-gray-300" />
          </div>

          <button className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-400">
            <Maximize2 className="w-4 h-4" />
          </button>

          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            {config.addLabel || 'Add'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3 border border-red-200">{error}</div>}

      {/* ── Table ────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {config.hasCode !== false && (
                <th className={TH}>CODE</th>
              )}
              {config.hasOrder && (
                <th className={TH}>ORDER</th>
              )}
              {(config.columns || []).map((col) => (
                <th key={col.key} className={TH}>{col.header}</th>
              ))}
              {config.hasIsActive && <th className={TH}>STATUS</th>}
              <th className={`${TH} text-right`}>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={99} className="text-center py-16 text-gray-400 text-sm">Loading…</td></tr>
            )}
            {!loading && data.length === 0 && (
              <tr><td colSpan={99} className="text-center py-16 text-gray-400 text-sm">No records found</td></tr>
            )}
            {!loading && data.map((row, idx) => (
              <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">

                {/* Code */}
                {config.hasCode !== false && (
                  <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                    #{row.order ?? (idx + 1)}
                  </td>
                )}

                {/* Order */}
                {config.hasOrder && (
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">#{row.order ?? idx}</td>
                )}

                {/* Dynamic columns */}
                {(config.columns || []).map((col) => (
                  <td key={col.key} className="px-4 py-3">
                    {col.render
                      ? col.render(row[col.key], row)
                      : col.key === 'color'
                        ? (
                          <div className="flex items-center gap-2">
                            <span
                              className="w-3 h-3 rounded-full shrink-0"
                              style={{ background: colorDot(row[col.key]) }}
                            />
                            <span className="text-xs text-gray-500 uppercase">{row[col.key] || '—'}</span>
                          </div>
                        )
                        : (
                          <span className={col.bold ? 'font-semibold text-gray-900' : 'text-gray-700'}>
                            {row[col.key] || <span className="text-gray-300">—</span>}
                          </span>
                        )
                    }
                  </td>
                ))}

                {/* Status badge */}
                {config.hasIsActive && (
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggle(row.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
                        row.isActive
                          ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'
                      }`}
                    >
                      {row.isActive ? <Check className="w-3 h-3" /> : null}
                      {row.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </button>
                  </td>
                )}

                {/* Actions */}
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openEdit(row)}
                    className="p-1.5 rounded-lg hover:bg-pink-50 text-gray-400 hover:text-pink-500 transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} pages={pages} total={total} limit={limit} onPage={setPage} />

      {/* ── Modal ────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editing ? `Edit ${config.singular || 'Item'}` : `Add ${config.singular || 'Item'}`}
                </h2>
                {config.badge && (
                  <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">{config.badge}</p>
                )}
              </div>
              <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                ✕
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-4">
              {formError && (
                <div className="bg-red-50 text-red-600 text-sm rounded-lg px-3 py-2 border border-red-200">{formError}</div>
              )}

              {(config.fields || []).map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {field.label}{field.required && <span className="text-pink-500 ml-0.5">*</span>}
                  </label>

                  {field.type === 'color' ? (
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={form[field.key] || '#ec4899'}
                        onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                        className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={form[field.key] || ''}
                        onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                        className={INPUT}
                        placeholder="e.g. #ec4899 or PINK-500"
                      />
                    </div>
                  ) : field.type === 'select' ? (
                    <select
                      value={form[field.key] ?? field.defaultValue ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                      className={INPUT}
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
                      placeholder={field.placeholder || ''}
                      className={INPUT}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Modal footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setModalOpen(false)}
                className="px-5 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 rounded-lg bg-pink-500 hover:bg-pink-600 text-white text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {saving ? 'Saving…' : editing ? 'Save Changes' : `Create ${config.singular || 'Item'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const TH = 'text-left text-xs font-semibold text-gray-500 tracking-wide px-4 py-3 uppercase';
const INPUT = 'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-400 focus:bg-white transition-colors';
