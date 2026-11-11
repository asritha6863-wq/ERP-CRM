import { Routes, Route, Navigate } from 'react-router-dom';
import Login        from '../pages/Login.jsx';
import Dashboard    from '../pages/Dashboard.jsx';
import ComingSoon   from '../pages/ComingSoon.jsx';
import AppLayout    from '../layouts/AppLayout.jsx';
import ProtectedRoute, { RoleGuard } from './ProtectedRoute.jsx';

// Masters
import MasterCrudScreen from '../pages/masters/MasterCrudScreen.jsx';
import UsersScreen      from '../pages/masters/UsersScreen.jsx';
import {
  BRANCHES_CONFIG,
  LEAD_SOURCES_CONFIG,
  LEAD_STATUSES_CONFIG,
  PIPELINE_STAGES_CONFIG,
  LOST_REASONS_CONFIG,
  CUSTOMER_CATEGORIES_CONFIG,
} from '../pages/masters/configs.jsx';

// Leads & Customers
import LeadsPage       from '../pages/leads/LeadsPage.jsx';
import LeadDetailPage  from '../pages/leads/LeadDetailPage.jsx';
import CustomersPage   from '../pages/customers/CustomersPage.jsx';

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
          <Route path="/dashboard"    element={<Dashboard />} />
          <Route path="/leads"        element={<LeadsPage />} />
          <Route path="/leads/:id"    element={<LeadDetailPage />} />
          <Route path="/customers"    element={<CustomersPage />} />
          <Route path="/pipeline"     element={<PipelinePage />} />
          <Route path="/engagement"   element={<ComingSoon name="Engagement" />} />
          <Route path="/analytics"    element={<ComingSoon name="Analytics" />} />
          <Route path="/reports"      element={<ComingSoon name="Reports" />} />
          <Route path="/activity"     element={<ComingSoon name="Activity" />} />
          <Route path="/visits"       element={<ComingSoon name="Visits" />} />
          <Route path="/appointments" element={<ComingSoon name="Appointments" />} />

          {/* Masters — Admin only */}
          <Route path="/masters/branches"            element={<RoleGuard roles={['ADMIN']}><MasterCrudScreen config={BRANCHES_CONFIG} /></RoleGuard>} />
          <Route path="/masters/lead-sources"        element={<RoleGuard roles={['ADMIN']}><MasterCrudScreen config={LEAD_SOURCES_CONFIG} /></RoleGuard>} />
          <Route path="/masters/lead-statuses"       element={<RoleGuard roles={['ADMIN']}><MasterCrudScreen config={LEAD_STATUSES_CONFIG} /></RoleGuard>} />
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
