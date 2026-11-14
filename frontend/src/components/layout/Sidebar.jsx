import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck, KanbanSquare, TrendingUp,
  BarChart3, FileText, Activity, MapPin, Calendar, Settings2,
  ChevronDown, ChevronRight, Store, BookUser, MessageSquare,
  CheckSquare, Heart, CircleDot, Bell, Megaphone, Gift,
  BarChart2, Clock, Brain, PieChart, Briefcase,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTabs } from '../../context/TabContext.jsx';
import NishkaLogo from '../NishkaLogo.jsx';

const ALL = ['ADMIN', 'MANAGER', 'SALES'];

const NAV = [
  { id: 'dashboard', label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ALL },
  { id: 'customers', label: 'Customers',  path: '/customers',  icon: UserCheck,       roles: ALL },

  {
    id: 'sales-pipeline', label: 'Sales Pipeline', icon: TrendingUp, roles: ALL,
    children: [
      { id: 'leads',         label: 'Leads',          path: '/leads',         icon: Users        },
      { id: 'instore-leads', label: 'Instore Leads',  path: '/instore-leads', icon: Store        },
      { id: 'pipeline',      label: 'Deals Pipeline', path: '/pipeline',      icon: KanbanSquare },
      { id: 'contacts',      label: 'Contacts',       path: '/contacts',      icon: BookUser     },
    ],
  },

  {
    id: 'masters', label: 'Masters', icon: Settings2, roles: ['ADMIN'],
    children: [
      { id: 'stage-master',    label: 'Stage Master',       path: '/masters/stage',        icon: Settings2 },
      { id: 'area-master',     label: 'Area Master',        path: '/masters/areas',        icon: MapPin    },
      { id: 'location-master', label: 'Location Master',    path: '/masters/locations',    icon: MapPin    },
      { id: 'lead-source',     label: 'Lead Source Master', path: '/masters/lead-sources', icon: Settings2 },
      { id: 'channel',         label: 'Channel Master',     path: '/masters/channels',     icon: Settings2 },
      { id: 'lead-status',     label: 'Lead Status Master', path: '/masters/lead-statuses',icon: Settings2 },
      { id: 'users',           label: 'User Management',    path: '/masters/users',        icon: UserCheck },
    ],
  },

  {
    id: 'customer-management', label: 'Customer Management', icon: Brain, roles: ALL,
    children: [
      { id: 'customer-intelligence', label: 'Customer Intelligence', path: '/customer-intelligence', icon: Brain      },
      { id: 'interaction-logs',      label: 'Interaction Logs',      path: '/interaction-logs',      icon: MessageSquare },
      { id: 'customer-segmentation', label: 'Customer Segmentation', path: '/customer-segmentation', icon: CircleDot  },
      { id: 'marriage-purchase',     label: 'Marriage Purchase',     path: '/marriage-purchase',     icon: Heart      },
    ],
  },

  {
    id: 'engagement', label: 'Engagement', icon: Bell, roles: ALL,
    children: [
      { id: 'remainder-center',  label: 'Remainder Center',  path: '/engagement/reminders',   icon: Bell      },
      { id: 'campaign-manager',  label: 'Campaign Manager',  path: '/engagement/campaigns',   icon: Megaphone },
      { id: 'celebration',       label: 'Celebration',       path: '/engagement/celebration', icon: Gift      },
    ],
  },

  {
    id: 'performance-analytics', label: 'Performance Analytics', icon: BarChart3, roles: ALL,
    children: [
      { id: 'sales-performance',   label: 'Sales Performance',   path: '/analytics/sales',    icon: TrendingUp },
      { id: 'location-wise-sales', label: 'Location Wise Sales', path: '/analytics/location', icon: MapPin     },
      { id: 'crm-analytics',       label: 'CRM Analytics',       path: '/analytics/crm',      icon: BarChart3  },
    ],
  },

  {
    id: 'reports', label: 'Reports', icon: FileText, roles: ALL,
    children: [
      { id: 'lead-report',              label: 'Lead Report',              path: '/reports/leads',            icon: FileText },
      { id: 'instore-lead-report',      label: 'Instore Lead Report',      path: '/reports/instore-leads',    icon: FileText },
      { id: 'bde-wise-report',          label: 'BDE Wise Report',          path: '/reports/bde',              icon: FileText },
      { id: 'customer-feedback-report', label: 'Customer Feedback Report', path: '/reports/customer-feedback',icon: FileText },
      { id: 'incentive-report',         label: 'Incentive Report',         path: '/reports/incentive',        icon: FileText },
    ],
  },

  {
    id: 'activity', label: 'Activity', icon: Activity, roles: ALL,
    children: [
      { id: 'customer-feed', label: 'Customer Feed', path: '/activity/feed',  icon: MessageSquare },
      { id: 'tasks',         label: 'Tasks',         path: '/activity/tasks', icon: CheckSquare   },
    ],
  },

  {
    id: 'visits', label: 'Visits', icon: MapPin, roles: ALL,
    children: [
      { id: 'visit-management', label: 'Visit Management', path: '/visits/management', icon: MapPin   },
      { id: 'visit-report',     label: 'Visit Report',     path: '/visits/report',     icon: FileText },
    ],
  },

  {
    id: 'appointments', label: 'Appointments', icon: Calendar, roles: ALL,
    children: [
      { id: 'appointment-desk', label: 'Appointment Desk', path: '/appointments/desk', icon: Calendar },
    ],
  },
];

const SALES_PATHS   = ['/leads', '/instore-leads', '/pipeline', '/contacts'];
const CUSTOMER_PATHS= ['/customer-intelligence', '/interaction-logs', '/customer-segmentation', '/marriage-purchase'];
const ENGAGE_PATHS  = ['/engagement'];
const ANALYTICS_PATHS = ['/analytics'];
const REPORT_PATHS  = ['/reports'];
const ACTIVITY_PATHS= ['/activity'];
const VISIT_PATHS   = ['/visits'];
const APPT_PATHS    = ['/appointments'];
const MASTER_PATHS  = ['/masters'];

function getInitOpen(pathname) {
  return {
    'sales-pipeline':        SALES_PATHS.some((p) => pathname.startsWith(p)),
    'masters':               MASTER_PATHS.some((p) => pathname.startsWith(p)),
    'customer-management':   CUSTOMER_PATHS.some((p) => pathname.startsWith(p)),
    'engagement':            ENGAGE_PATHS.some((p) => pathname.startsWith(p)),
    'performance-analytics': ANALYTICS_PATHS.some((p) => pathname.startsWith(p)),
    'reports':               REPORT_PATHS.some((p) => pathname.startsWith(p)),
    'activity':              ACTIVITY_PATHS.some((p) => pathname.startsWith(p)),
    'visits':                VISIT_PATHS.some((p) => pathname.startsWith(p)),
    'appointments':          APPT_PATHS.some((p) => pathname.startsWith(p)),
  };
}

export default function Sidebar() {
  const { user }    = useAuth();
  const { openTab } = useTabs();
  const navigate    = useNavigate();
  const location    = useLocation();
  const [open, setOpen] = useState(() => getInitOpen(location.pathname));

  const toggle = (id) => setOpen((s) => ({ ...s, [id]: !s[id] }));

  const handleNav = (item) => {
    openTab({ id: item.id, label: item.label, path: item.path });
    navigate(item.path);
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const visible = NAV.filter((item) => item.roles?.includes(user?.role));

  return (
    <aside className="no-print w-64 flex flex-col shrink-0 h-screen sticky top-0 overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0f0f1a 0%, #161625 100%)', borderRight: '1px solid rgba(255,255,255,0.05)' }}>

      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <NishkaLogo white />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {visible.map((item) => {

          if (item.children) {
            const isOpen    = !!open[item.id];
            const anyActive = item.children.some((c) => isActive(c.path));

            return (
              <div key={item.id}>
                <button
                  onClick={() => toggle(item.id)}
                  className="w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-sm transition-all duration-150"
                  style={{
                    color: anyActive ? '#f72f6e' : '#9ca3af',
                    background: anyActive ? 'rgba(247,47,110,0.08)' : 'transparent',
                  }}
                >
                  <span className="flex items-center gap-2.5">
                    <item.icon className="w-4 h-4 shrink-0" />
                    <span className="font-medium text-xs tracking-wide">{item.label}</span>
                  </span>
                  {isOpen
                    ? <ChevronDown className="w-3.5 h-3.5 opacity-60" />
                    : <ChevronRight className="w-3.5 h-3.5 opacity-40" />}
                </button>

                {isOpen && (
                  <div className="ml-3 mt-0.5 space-y-0.5 border-l pl-3" style={{ borderColor: 'rgba(247,47,110,0.2)' }}>
                    {item.children.map((child) => {
                      const active = isActive(child.path);
                      return (
                        <button
                          key={child.id}
                          onClick={() => handleNav(child)}
                          className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-150"
                          style={{
                            color:      active ? '#f72f6e' : '#9ca3af',
                            background: active ? 'rgba(247,47,110,0.12)' : 'transparent',
                          }}
                          onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = '#d1d5db'; }}
                          onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = '#9ca3af'; }}
                        >
                          <child.icon className="w-3.5 h-3.5 shrink-0" />
                          {child.label}
                          {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item)}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150"
              style={{
                color:      active ? '#f72f6e' : '#9ca3af',
                background: active ? 'rgba(247,47,110,0.12)' : 'transparent',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = '#d1d5db'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = '#9ca3af'; }}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />}
            </button>
          );
        })}
      </nav>

      {/* User info */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
            style={{ background: 'linear-gradient(135deg, #f72f6e, #c40f56)' }}>
            {user?.name?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{user?.name}</p>
            <p className="text-[10px] truncate" style={{ color: '#6b7280' }}>{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
