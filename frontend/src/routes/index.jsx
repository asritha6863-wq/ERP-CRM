import { Routes, Route, Navigate } from 'react-router-dom';
import Login        from '../pages/Login.jsx';
import Dashboard    from '../pages/Dashboard.jsx';
import ComingSoon   from '../pages/ComingSoon.jsx';
import AppLayout    from '../layouts/AppLayout.jsx';
import ProtectedRoute, { RoleGuard } from './ProtectedRoute.jsx';

// Masters
import MasterCrudScreen from '../pages/masters/MasterCrudScreen.jsx';
import CRMMasterScreen  from '../pages/masters/CRMMasterScreen.jsx';
import UsersScreen      from '../pages/masters/UsersScreen.jsx';
import {
  BRANCHES_CONFIG,
  PIPELINE_STAGES_CONFIG,
  LOST_REASONS_CONFIG,
  CUSTOMER_CATEGORIES_CONFIG,
  CONTACT_TYPES_CONFIG,
  COMPANIES_CONFIG,
  STAGE_MASTER_CONFIG,
  AREA_MASTER_CONFIG,
  LOCATION_MASTER_CONFIG,
  CHANNEL_MASTER_CONFIG,
  LEAD_STATUS_MASTER_CONFIG,
  LEAD_SOURCE_MASTER_CONFIG,
} from '../pages/masters/configs.jsx';

// Leads & Customers & Contacts
import LeadsPage        from '../pages/leads/LeadsPage.jsx';
import InstoreLeadsPage from '../pages/leads/InstoreLeadsPage.jsx';
import LeadDetailPage   from '../pages/leads/LeadDetailPage.jsx';
import CustomersPage    from '../pages/customers/CustomersPage.jsx';
import ContactsPage     from '../pages/contacts/ContactsPage.jsx';

// Pipeline
import PipelinePage from '../pages/pipeline/PipelinePage.jsx';

// Engagement
import ReminderCenterPage from '../pages/engagement/ReminderCenterPage.jsx';
import CampaignManagerPage from '../pages/engagement/CampaignManagerPage.jsx';
import CelebrationHubPage from '../pages/engagement/CelebrationHubPage.jsx';

// Analytics
import SalesPerformancePage from '../pages/analytics/SalesPerformancePage.jsx';
import LocationSalesPage    from '../pages/analytics/LocationSalesPage.jsx';
import CrmAnalyticsPage     from '../pages/analytics/CrmAnalyticsPage.jsx';

// Reports
import LeadReportPage       from '../pages/reports/LeadReportPage.jsx';
import InstoreLeadReportPage from '../pages/reports/InstoreLeadReportPage.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>

          {/* Main modules */}
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/contacts"      element={<ContactsPage />} />
          <Route path="/leads"         element={<LeadsPage />} />
          <Route path="/instore-leads" element={<InstoreLeadsPage />} />
          <Route path="/leads/:id"     element={<LeadDetailPage />} />
          <Route path="/customers"             element={<CustomersPage />} />
          <Route path="/customer-intelligence" element={<ComingSoon name="Customer Intelligence" />} />
          <Route path="/interaction-logs"      element={<ComingSoon name="Interaction Logs" />} />
          <Route path="/customer-segmentation" element={<ComingSoon name="Customer Segmentation" />} />
          <Route path="/marriage-purchase"     element={<ComingSoon name="Marriage Purchase" />} />
          <Route path="/pipeline"      element={<PipelinePage />} />
          <Route path="/engagement"              element={<ComingSoon name="Engagement" />} />
          <Route path="/engagement/reminders"   element={<ReminderCenterPage />} />
          <Route path="/engagement/campaigns"   element={<CampaignManagerPage />} />
          <Route path="/engagement/celebration" element={<CelebrationHubPage />} />
          <Route path="/analytics"          element={<ComingSoon name="Analytics" />} />
          <Route path="/analytics/sales"    element={<SalesPerformancePage />} />
          <Route path="/analytics/location" element={<LocationSalesPage />} />
          <Route path="/analytics/crm"      element={<CrmAnalyticsPage />} />
          <Route path="/reports"                      element={<ComingSoon name="Reports" />} />
          <Route path="/reports/leads"               element={<LeadReportPage />} />
          <Route path="/reports/instore-leads"       element={<InstoreLeadReportPage />} />
          <Route path="/reports/bde"                 element={<ComingSoon name="BDE Wise Report" />} />
          <Route path="/reports/customer-feedback"   element={<ComingSoon name="Customer Feedback Report" />} />
          <Route path="/reports/incentive"           element={<ComingSoon name="Incentive Report" />} />
          <Route path="/activity"        element={<ComingSoon name="Activity" />} />
          <Route path="/activity/feed"   element={<ComingSoon name="Customer Feed" />} />
          <Route path="/activity/tasks"  element={<ComingSoon name="Tasks" />} />
          <Route path="/visits"                   element={<ComingSoon name="Visits" />} />
          <Route path="/visits/management"        element={<ComingSoon name="Visit Management" />} />
          <Route path="/visits/report"            element={<ComingSoon name="Visit Report" />} />
          <Route path="/appointments"             element={<ComingSoon name="Appointments" />} />
          <Route path="/appointments/desk"        element={<ComingSoon name="Appointment Desk" />} />

          {/* Masters — Admin only */}
          <Route path="/masters/companies"           element={<RoleGuard roles={['ADMIN']}><MasterCrudScreen config={COMPANIES_CONFIG} /></RoleGuard>} />
          <Route path="/masters/branches"            element={<RoleGuard roles={['ADMIN']}><MasterCrudScreen config={BRANCHES_CONFIG} /></RoleGuard>} />
          <Route path="/masters/contact-types"       element={<RoleGuard roles={['ADMIN']}><MasterCrudScreen config={CONTACT_TYPES_CONFIG} /></RoleGuard>} />
          <Route path="/masters/stage"               element={<RoleGuard roles={['ADMIN']}><CRMMasterScreen config={STAGE_MASTER_CONFIG} /></RoleGuard>} />
          <Route path="/masters/areas"               element={<RoleGuard roles={['ADMIN']}><CRMMasterScreen config={AREA_MASTER_CONFIG} /></RoleGuard>} />
          <Route path="/masters/locations"           element={<RoleGuard roles={['ADMIN']}><CRMMasterScreen config={LOCATION_MASTER_CONFIG} /></RoleGuard>} />
          <Route path="/masters/lead-sources"        element={<RoleGuard roles={['ADMIN']}><CRMMasterScreen config={LEAD_SOURCE_MASTER_CONFIG} /></RoleGuard>} />
          <Route path="/masters/channels"            element={<RoleGuard roles={['ADMIN']}><CRMMasterScreen config={CHANNEL_MASTER_CONFIG} /></RoleGuard>} />
          <Route path="/masters/lead-statuses"       element={<RoleGuard roles={['ADMIN']}><CRMMasterScreen config={LEAD_STATUS_MASTER_CONFIG} /></RoleGuard>} />
          <Route path="/masters/pipeline-stages"     element={<RoleGuard roles={['ADMIN']}><MasterCrudScreen config={PIPELINE_STAGES_CONFIG} /></RoleGuard>} />
          <Route path="/masters/lost-reasons"        element={<RoleGuard roles={['ADMIN']}><MasterCrudScreen config={LOST_REASONS_CONFIG} /></RoleGuard>} />
          <Route path="/masters/customer-categories" element={<RoleGuard roles={['ADMIN']}><MasterCrudScreen config={CUSTOMER_CATEGORIES_CONFIG} /></RoleGuard>} />
          <Route path="/masters/users"               element={<RoleGuard roles={['ADMIN']}><UsersScreen /></RoleGuard>} />
        </Route>
      </Route>

      {/* Fallbacks */}
      <Route path="/"  element={<Navigate to="/dashboard" replace />} />
      <Route path="*"  element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
