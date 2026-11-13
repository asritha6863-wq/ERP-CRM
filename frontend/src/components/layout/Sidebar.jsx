import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck, KanbanSquare, Settings,
  Gem, TrendingUp, BarChart2, FileText, Activity,
  MapPin, Calendar, ChevronDown, ChevronRight, Store, BookUser,
  Settings2, Brain, MessageSquare, PieChart, Heart,
  Bell, Megaphone, PartyPopper,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useTabs } from '../../context/TabContext.jsx';

const ALL_ROLES = ['ADMIN', 'MANAGER', 'SALES'];

const NAV = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: LayoutDashboard,
    roles: ALL_ROLES,
  },
  {
    id: 'sales-pipeline',
    label: 'Sales Pipeline',
    icon: TrendingUp,
    roles: ALL_ROLES,
    children: [
      { id: 'leads',         label: 'Leads',          path: '/leads',         icon: Users        },
      { id: 'instore-leads', label: 'Instore Leads',  path: '/instore-leads', icon: Store        },
      { id: 'pipeline',      label: 'Deals Pipeline', path: '/pipeline',      icon: KanbanSquare },
      { id: 'contacts',      label: 'Contacts',       path: '/contacts',      icon: BookUser     },
    ],
  },
  {
    id: 'masters',
    label: 'Masters',
    icon: Settings,
    roles: ['ADMIN'],
    children: [
      { id: 'stage-master',    label: 'Stage Master',       path: '/masters/stage',        icon: Settings2 },
      { id: 'area-master',     label: 'Area Master',        path: '/masters/areas',        icon: MapPin    },
      { id: 'location-master', label: 'Location Master',    path: '/masters/locations',    icon: MapPin    },
      { id: 'lead-source',     label: 'Lead Source Master', path: '/masters/lead-sources', icon: Settings2 },
      { id: 'channel',         label: 'Channel Master',     path: '/masters/channels',     icon: Settings2 },
      { id: 'lead-status',     label: 'Lead Status Master', path: '/masters/lead-statuses',icon: Settings2 },
    ],
  },
  {
    id: 'customer-management',
    label: 'Customer Management',
    icon: UserCheck,
    roles: ALL_ROLES,
    children: [
      { id: 'customers',             label: 'Customers',              path: '/customers',              icon: UserCheck   },
      { id: 'customer-intelligence', label: 'Customer Intelligence',  path: '/customer-intelligence',  icon: Brain       },
      { id: 'interaction-logs',      label: 'Interaction Logs',       path: '/interaction-logs',       icon: MessageSquare },
      { id: 'customer-segmentation', label: 'Customer Segmentation',  path: '/customer-segmentation',  icon: PieChart    },
      { id: 'marriage-purchase',     label: 'Marriage Purchase',      path: '/marriage-purchase',      icon: Heart       },
    ],
  },
  {
    id: 'engagement',
    label: 'Engagement',
    icon: TrendingUp,
    roles: ALL_ROLES,
    children: [
      { id: 'remainder-center',  label: 'Remainder Center',   path: '/engagement/reminders',  icon: Bell        },
      { id: 'campaign-manager',  label: 'Campaign Manager',   path: '/engagement/campaigns',  icon: Megaphone   },
      { id: 'celebration',       label: 'Celebration',        path: '/engagement/celebration', icon: PartyPopper },
    ],
  },
  { id: 'analytics',    label: 'Analytics',    path: '/analytics',    icon: BarChart2,  roles: ALL_ROLES },
  { id: 'reports',      label: 'Reports',      path: '/reports',      icon: FileText,   roles: ALL_ROLES },
  { id: 'activity',     label: 'Activity',     path: '/activity',     icon: Activity,   roles: ALL_ROLES },
  { id: 'visits',       label: 'Visits',       path: '/visits',       icon: MapPin,     roles: ALL_ROLES },
  { id: 'appointments', label: 'Appointments', path: '/appointments', icon: Calendar,   roles: ALL_ROLES },
];

const SALES_PIPELINE_PATHS = ['/leads', '/instore-leads', '/pipeline', '/contacts'];

export default function Sidebar() {
  const { user }    = useAuth();
  const { openTab } = useTabs();
  const navigate    = useNavigate();
  const location    = useLocation();

  const isInSalesPipeline = SALES_PIPELINE_PATHS.some((p) => location.pathname.startsWith(p));
  const isInCustomerMgmt  = ['/customers', '/customer-intelligence', '/interaction-logs', '/customer-segmentation', '/marriage-purchase'].some((p) => location.pathname.startsWith(p));
  const isInEngagement    = location.pathname.startsWith('/engagement');

  const [openGroups, setOpenGroups] = useState(() => ({
    'sales-pipeline':      isInSalesPipeline,
    'masters':             location.pathname.startsWith('/masters'),
    'customer-management': isInCustomerMgmt,
    'engagement':          isInEngagement,
  }));

  const toggleGroup = (id) => setOpenGroups((s) => ({ ...s, [id]: !s[id] }));

  const handleNav = (item) => {
    openTab({ id: item.id, label: item.label, path: item.path });
    navigate(item.path);
  };

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const visible = NAV.filter((item) => item.roles?.includes(user?.role));

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 h-screen sticky top-0 shadow-sm">

      {/* Logo */}
      <div className="px-5 py-4 flex items-center gap-2 border-b border-gray-100">
        <div className="bg-gray-900 rounded-xl p-2 shrink-0">
          <Gem className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-sm text-gray-900">Jewellery CRM</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {visible.map((item) => {

          // ── Group with children ──────────────────────
          if (item.children) {
            const isOpen       = !!openGroups[item.id];
            const anyActive    = item.children.some((c) => isActive(c.path));

            return (
              <div key={item.id}>
                {/* Group header */}
                <button
                  onClick={() => toggleGroup(item.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-gray-600 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <item.icon className="w-3.5 h-3.5" />
                    {item.label}
                  </span>
                  {isOpen
                    ? <ChevronDown className="w-3.5 h-3.5" />
                    : <ChevronRight className="w-3.5 h-3.5" />
                  }
                </button>

                {/* Children */}
                {isOpen && (
                  <div className="mb-1">
                    {item.children.map((child) => {
                      const active = isActive(child.path);
                      return (
                        <button
                          key={child.id}
                          onClick={() => handleNav(child)}
                          className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-all relative ${
                            active
                              ? 'bg-pink-50 text-pink-600 font-medium border-l-[3px] border-pink-500 pl-[13px]'
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 border-l-[3px] border-transparent pl-[13px]'
                          }`}
                        >
                          <child.icon className={`w-4 h-4 shrink-0 ${active ? 'text-pink-500' : 'text-gray-400'}`} />
                          {child.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // ── Top-level item ───────────────────────────
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => handleNav(item)}
              className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-all relative ${
                active
                  ? 'bg-pink-50 text-pink-600 font-medium border-l-[3px] border-pink-500 pl-[13px]'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 border-l-[3px] border-transparent pl-[13px]'
              }`}
            >
              <item.icon className={`w-4 h-4 shrink-0 ${active ? 'text-pink-500' : 'text-gray-400'}`} />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
