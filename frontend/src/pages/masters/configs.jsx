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
  title: 'CRM Stage Master',
  badge: 'PIPELINE CONFIGURATION',
  subtitle: 'Configure pipeline stages, stage ordering and visual identifiers',
  addLabel: '+ Add Stage',
  totalLabel: 'TOTAL STAGES',
  singular: 'Stage',
  hasIsActive: true,
  hasCode: true,
  hasOrder: false,
  icon: null, // set in route
  columns: [
    { key: 'name',  header: 'Stage Name', bold: true },
    { key: 'color', header: 'Color Identifier' },
  ],
  fields: [
    { key: 'name',  label: 'Stage Name', required: true },
    { key: 'order', label: 'Order', type: 'number', defaultValue: 0 },
    { key: 'color', label: 'Color Identifier', type: 'color', defaultValue: '#ec4899', placeholder: 'e.g. PINK-500' },
  ],
};

export const AREA_MASTER_CONFIG = {
  entity: 'areas',
  title: 'CRM Area Master',
  badge: 'TERRITORY MANAGEMENT',
  subtitle: 'Configure customer areas, postal codes, and branch associations',
  addLabel: '+ Add Area',
  totalLabel: 'TOTAL AREAS',
  singular: 'Area',
  hasIsActive: true,
  hasCode: true,
  searchPlaceholder: 'Search areas, pincode, locations…',
  columns: [
    { key: 'name',      header: 'Area Name',  bold: true },
    {
      key: 'branch',
      header: 'Branch',
      render: (_, row) => row.branch
        ? <span className="text-sm text-gray-700">{row.branch.name}</span>
        : <span className="text-gray-300 text-sm">—</span>,
    },
    { key: 'pincode',   header: 'Pincode',    render: (v) => v || <span className="text-gray-300">—</span> },
    {
      key: 'locations',
      header: 'Locations',
      render: (v) => v
        ? <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium uppercase">{v}</span>
        : <span className="text-gray-400 text-xs italic">No locations</span>,
    },
  ],
  fields: [
    { key: 'name',      label: 'Area Name',   required: true },
    { key: 'branchId',  label: 'Branch',      type: 'branch' },
    { key: 'pincode',   label: 'Pincode',     placeholder: 'e.g. 673027' },
    { key: 'locations', label: 'Locations',   placeholder: 'e.g. KONDOTTY' },
  ],
};

export const LOCATION_MASTER_CONFIG = {
  entity: 'locations',
  title: 'CRM Location Master',
  badge: 'REGIONAL HUBS',
  subtitle: 'Configure customer locations and geographical groupings',
  addLabel: '+ Add Location',
  totalLabel: 'TOTAL LOCATIONS',
  singular: 'Location',
  hasIsActive: true,
  hasCode: true,
  searchPlaceholder: 'Search locations…',
  columns: [
    { key: 'name', header: 'Location Name', bold: true },
  ],
  fields: [
    { key: 'name', label: 'Location Name', required: true },
  ],
};

export const LEAD_SOURCE_MASTER_CONFIG = {
  entity: 'lead-sources',
  title: 'Lead Source Master',
  badge: 'LEAD ORIGINS',
  subtitle: 'Configure customer acquisition lead sources (Walk-in, Website, Instagram, Facebook, etc.)',
  addLabel: '+ Add Source',
  totalLabel: 'TOTAL SOURCES',
  singular: 'Lead Source',
  hasIsActive: true,
  hasCode: true,
  columns: [
    { key: 'name', header: 'Source Description', bold: true },
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

export const CHANNEL_MASTER_CONFIG = {
  entity: 'channels',
  title: 'CRM Channel Master',
  badge: 'ATTRIBUTION',
  subtitle: 'Configure attribution channels for leads and marketing segmentation',
  addLabel: '+ Add Channel',
  totalLabel: 'TOTAL CHANNELS',
  singular: 'Channel',
  hasIsActive: true,
  hasCode: true,
  columns: [
    { key: 'name', header: 'Channel Name', bold: true },
  ],
  fields: [
    { key: 'name', label: 'Channel Name', required: true },
  ],
};

export const LEAD_STATUS_MASTER_CONFIG = {
  entity: 'lead-statuses',
  title: 'CRM Status Master',
  badge: 'PIPELINE STATUSES',
  subtitle: 'Configure lead pipeline statuses and color indicators',
  addLabel: '+ Add Status',
  totalLabel: 'TOTAL STATUSES',
  singular: 'Status',
  hasIsActive: true,
  hasCode: true,
  columns: [
    { key: 'name',  header: 'Status Name', bold: true },
    { key: 'color', header: 'Color' },
  ],
  fields: [
    { key: 'name',  label: 'Status Name', required: true },
    { key: 'color', label: 'Color', type: 'color', defaultValue: '#6b7280', placeholder: 'e.g. EMERALD-500' },
  ],
};
