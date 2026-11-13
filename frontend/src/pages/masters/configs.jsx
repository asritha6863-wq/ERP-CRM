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

export const CONTACT_TYPES_CONFIG = {
  entity: 'contact-types',
  title: 'Contact Types',
  singular: 'Contact Type',
  hasIsActive: true,
  columns: [
    { key: 'name', header: 'Type Name', sortable: true },
  ],
  fields: [
    { key: 'name', label: 'Type Name', required: true },
  ],
};

export const COMPANIES_CONFIG = {
  entity: 'companies',
  title: 'Companies',
  singular: 'Company',
  hasIsActive: true,
  columns: [
    { key: 'name', header: 'Company Name', sortable: true },
  ],
  fields: [
    { key: 'name', label: 'Company Name', required: true },
  ],
};

export const STAGE_MASTER_CONFIG = {
  entity: 'pipeline-stages',
  title: 'Stage Master',
  singular: 'Stage',
  hasIsActive: true,
  columns: [
    { key: 'name',  header: 'Stage Name', sortable: true },
    { key: 'order', header: 'Order',      sortable: true },
  ],
  fields: [
    { key: 'name',  label: 'Stage Name', required: true },
    { key: 'order', label: 'Order', type: 'number', defaultValue: 0 },
  ],
};

export const AREA_MASTER_CONFIG = {
  entity: 'areas',
  title: 'Area Master',
  singular: 'Area',
  hasIsActive: true,
  columns: [{ key: 'name', header: 'Area Name', sortable: true }],
  fields:  [{ key: 'name', label: 'Area Name', required: true }],
};

export const LOCATION_MASTER_CONFIG = {
  entity: 'locations',
  title: 'Location Master',
  singular: 'Location',
  hasIsActive: true,
  columns: [{ key: 'name', header: 'Location Name', sortable: true }],
  fields:  [{ key: 'name', label: 'Location Name', required: true }],
};

export const CHANNEL_MASTER_CONFIG = {
  entity: 'channels',
  title: 'Channel Master',
  singular: 'Channel',
  hasIsActive: true,
  columns: [{ key: 'name', header: 'Channel Name', sortable: true }],
  fields:  [{ key: 'name', label: 'Channel Name', required: true }],
};

export const LEAD_STATUS_MASTER_CONFIG = {
  entity: 'lead-statuses',
  title: 'Lead Status Master',
  singular: 'Lead Status',
  hasIsActive: true,
  columns: [
    { key: 'name', header: 'Name', sortable: true },
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
    { key: 'color', label: 'Colour', type: 'color', defaultValue: '#6b7280' },
  ],
};

export const LEAD_SOURCE_MASTER_CONFIG = {
  entity: 'lead-sources',
  title: 'Lead Source Master',
  singular: 'Lead Source',
  hasIsActive: true,
  columns: [
    { key: 'name', header: 'Name', sortable: true },
    {
      key: 'defaultChannel',
      header: 'Default Channel',
      render: (val) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
          val === 'INSTORE' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
        }`}>
          {val === 'INSTORE' ? 'Instore' : 'Outdoor'}
        </span>
      ),
    },
  ],
  fields: [
    { key: 'name', label: 'Source Name', required: true },
    {
      key: 'defaultChannel',
      label: 'Default Channel',
      type: 'select',
      options: [
        { value: 'OUTDOOR', label: 'Outdoor' },
        { value: 'INSTORE', label: 'Instore' },
      ],
      defaultValue: 'OUTDOOR',
    },
  ],
};
