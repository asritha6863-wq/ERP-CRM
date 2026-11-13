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
  LEAD_SOURCES_CONFIG,
  LEAD_STATUSES_CONFIG,
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
          <Route path="/engagement/reminders"   element={<ComingSoon name="Remainder Center" />} />
          <Route path="/engagement/campaigns"   element={<ComingSoon name="Campaign Manager" />} />
          <Route path="/engagement/celebration" element={<ComingSoon name="Celebration" />} />
          <Route path="/analytics"          element={<ComingSoon name="Analytics" />} />
          <Route path="/analytics/sales"    element={<ComingSoon name="Sales Performance" />} />
          <Route path="/analytics/location" element={<ComingSoon name="Location Wise Sales" />} />
          <Route path="/analytics/crm"      element={<ComingSoon name="CRM Analytics" />} />
          <Route path="/reports"       element={<ComingSoon name="Reports" />} />
          <Route path="/activity"      element={<ComingSoon name="Activity" />} />
          <Route path="/visits"        element={<ComingSoon name="Visits" />} />
          <Route path="/appointments"  element={<ComingSoon name="Appointments" />} />

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
