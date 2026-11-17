// Menu catalogue used for per-user access. Ids match Sidebar item ids.
// Masters need an explicit grant (ADMIN has all). User Management stays ADMIN-only.
export const ACCESS_MENU = [
  { id: 'customers', label: 'Customers', path: '/customers' },
  { id: 'sales-pipeline', label: 'Sales Pipeline', children: [
    { id: 'leads', label: 'Leads', path: '/leads' },
    { id: 'instore-leads', label: 'Instore Leads', path: '/instore-leads' },
    { id: 'pipeline', label: 'Deals Pipeline', path: '/pipeline' },
    { id: 'contacts', label: 'Contacts', path: '/contacts' },
  ] },
  { id: 'customer-management', label: 'Customer Management', children: [
    { id: 'customer-intelligence', label: 'Customer Intelligence', path: '/customer-intelligence' },
    { id: 'interaction-logs', label: 'Interaction Logs', path: '/interaction-logs' },
    { id: 'customer-segmentation', label: 'Customer Segmentation', path: '/customer-segmentation' },
    { id: 'marriage-purchase', label: 'Marriage Purchase', path: '/marriage-purchase' },
  ] },
  { id: 'engagement', label: 'Engagement', children: [
    { id: 'remainder-center', label: 'Remainder Center', path: '/engagement/reminders' },
    { id: 'campaign-manager', label: 'Campaign Manager', path: '/engagement/campaigns' },
    { id: 'celebration', label: 'Celebration', path: '/engagement/celebration' },
  ] },
  { id: 'performance-analytics', label: 'Performance Analytics', children: [
    { id: 'sales-performance', label: 'Sales Performance', path: '/analytics/sales' },
    { id: 'location-wise-sales', label: 'Location Wise Sales', path: '/analytics/location' },
    { id: 'crm-analytics', label: 'CRM Analytics', path: '/analytics/crm' },
  ] },
  { id: 'reports', label: 'Reports', children: [
    { id: 'lead-report', label: 'Lead Report', path: '/reports/leads' },
    { id: 'instore-lead-report', label: 'Instore Lead Report', path: '/reports/instore-leads' },
    { id: 'bde-wise-report', label: 'BDE Wise Report', path: '/reports/bde' },
    { id: 'customer-feedback-report', label: 'Customer Feedback Report', path: '/reports/customer-feedback' },
    { id: 'incentive-report', label: 'Incentive Report', path: '/reports/incentive' },
  ] },
  { id: 'activity', label: 'Activity', children: [
    { id: 'customer-feed', label: 'Customer Feed', path: '/activity/feed' },
    { id: 'tasks', label: 'Tasks', path: '/activity/tasks' },
  ] },
  { id: 'visits', label: 'Visits', children: [
    { id: 'visit-management', label: 'Visit Management', path: '/visits/management' },
    { id: 'visit-report', label: 'Visit Report', path: '/visits/report' },
  ] },
  { id: 'appointments', label: 'Appointments', children: [
    { id: 'appointment-desk', label: 'Appointment Desk', path: '/appointments/desk' },
  ] },
  { id: 'masters', label: 'Masters', children: [
    { id: 'stage-master', label: 'Stage Master', path: '/masters/stage' },
    { id: 'area-master', label: 'Area Master', path: '/masters/areas' },
    { id: 'location-master', label: 'Location Master', path: '/masters/locations' },
    { id: 'lead-source', label: 'Lead Source Master', path: '/masters/lead-sources' },
    { id: 'channel', label: 'Channel Master', path: '/masters/channels' },
    { id: 'lead-status', label: 'Lead Status Master', path: '/masters/lead-statuses' },
  ] },
];

// Flat list of every grantable id (leaf ids + standalone items)
export const ALL_ACCESS_IDS = ACCESS_MENU.flatMap((m) => (m.children ? m.children.map((c) => c.id) : [m.id]));
const LEAVES = ACCESS_MENU.flatMap((m) => (m.children ? m.children : [m]));

// ADMIN: everything. Others: permissions array if set, otherwise everything (role default).
export const MASTER_IDS = ['stage-master', 'area-master', 'location-master', 'lead-source', 'channel', 'lead-status'];

export function canAccessId(user, id) {
  if (!user) return false;
  if (user.role === 'ADMIN' || id === 'dashboard') return true;
  if (!Array.isArray(user.permissions)) return !MASTER_IDS.includes(id);
  return user.permissions.includes(id);
}

export function canAccessPath(user, pathname) {
  const leaf = LEAVES.find((l) => pathname === l.path || pathname.startsWith(l.path + '/'));
  if (leaf) return canAccessId(user, leaf.id);
  return !(pathname.startsWith('/masters') && user?.role !== 'ADMIN');
}

export function firstAllowedPath(user) {
  const leaf = LEAVES.find((l) => canAccessId(user, l.id));
  return leaf ? leaf.path : '/dashboard';
}
