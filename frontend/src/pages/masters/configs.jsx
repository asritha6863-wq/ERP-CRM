// Configuration objects that drive MasterCrudScreen for each master entity

export const BRANCHES_CONFIG = {
  entity: 'branches',
  title: 'Branches',
  singular: 'Branch',
  hasIsActive: false,
  columns: [
    { key: 'name',    header: 'Name',    sortable: true },
    { key: 'address', header: 'Address', render: (v) => v || '—' },
    { key: 'phone',   header: 'Phone',   render: (v) => v || '—' },
  ],
  fields: [
    { key: 'name',    label: 'Branch Name', required: true },
    { key: 'address', label: 'Address' },
    { key: 'phone',   label: 'Phone' },
  ],
};

export const LEAD_SOURCES_CONFIG = {
  entity: 'lead-sources',
  title: 'Lead Sources',
  singular: 'Lead Source',
  hasIsActive: true,
  columns: [
    { key: 'name', header: 'Name', sortable: true },
  ],
  fields: [
    { key: 'name', label: 'Source Name', required: true },
  ],
};

export const LEAD_STATUSES_CONFIG = {
  entity: 'lead-statuses',
  title: 'Lead Statuses',
  singular: 'Lead Status',
  hasIsActive: true,
  columns: [
    { key: 'name',  header: 'Name',  sortable: true },
    {
      key: 'color',
      header: 'Color',
      render: (val) => (
        <div className="flex items-center gap-2">
          <span style={{ background: val }} className="w-4 h-4 rounded-full inline-block border border-gray-200" />
          <span className="text-gray-500 text-xs">{val}</span>
        </div>
      ),
    },
  ],
  fields: [
    { key: 'name',  label: 'Status Name', required: true },
    { key: 'color', label: 'Colour',       type: 'color', defaultValue: '#6b7280' },
  ],
};

export const PIPELINE_STAGES_CONFIG = {
  entity: 'pipeline-stages',
  title: 'Pipeline Stages',
  singular: 'Pipeline Stage',
  hasIsActive: true,
  columns: [
    { key: 'name',  header: 'Stage Name', sortable: true },
    { key: 'order', header: 'Order',      sortable: true },
  ],
  fields: [
    { key: 'name',  label: 'Stage Name', required: true },
    { key: 'order', label: 'Order',       type: 'number', defaultValue: 0 },
  ],
};

export const LOST_REASONS_CONFIG = {
  entity: 'lost-reasons',
  title: 'Lost Reasons',
  singular: 'Lost Reason',
  hasIsActive: true,
  columns: [
    { key: 'name', header: 'Reason', sortable: true },
  ],
  fields: [
    { key: 'name', label: 'Reason', required: true },
  ],
};

export const CUSTOMER_CATEGORIES_CONFIG = {
  entity: 'customer-categories',
  title: 'Customer Categories',
  singular: 'Customer Category',
  hasIsActive: true,
  columns: [
    { key: 'name', header: 'Category Name', sortable: true },
  ],
  fields: [
    { key: 'name', label: 'Category Name', required: true },
  ],
};
