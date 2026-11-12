import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  KanbanSquare,
  Settings,
  Building2,
  Radio,
  Tag,
  GitBranch,
  AlertCircle,
  FolderTree,
  UserCog,
  Gem,
  TrendingUp,
  BarChart2,
  FileText,
  Activity,
  MapPin,
  Calendar,
  ChevronDown,
  ChevronRight,
  Store,
  BookUser,
  Briefcase,
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
    icon: KanbanSquare,
    roles: ALL_ROLES,
    children: [
      { id: 'leads',         label: 'Leads',           path: '/leads',         icon: Users       },
      { id: 'instore-leads', label: 'Instore Leads',   path: '/instore-leads', icon: Store       },
      { id: 'pipeline',      label: 'Deals Pipeline',  path: '/pipeline',      icon: KanbanSquare },
      { id: 'contacts',      label: 'Contacts',        path: '/contacts',      icon: BookUser    },
    ],
  },
  { id: 'customers',    label: 'Customers',    path: '/customers',    icon: UserCheck, roles: ALL_ROLES },
  { id: 'engagement',   label: 'Engagement',   path: '/engagement',   icon: TrendingUp, roles: ALL_ROLES },
  { id: 'analytics',    label: 'Analytics',    path: '/analytics',    icon: BarChart2,  roles: ALL_ROLES },
  { id: 'reports',      label: 'Reports',      path: '/reports',      icon: FileText,   roles: ALL_ROLES },
  { id: 'activity',     label: 'Activity',     path: '/activity',     icon: Activity,   roles: ALL_ROLES },
  { id: 'visits',       label: 'Visits',       path: '/visits',       icon: MapPin,     roles: ALL_ROLES },
  { id: 'appointments', label: 'Appointments', path: '/appointments', icon: Calendar,   roles: ALL_ROLES },
  {
    id: 'masters',
    label: 'Masters',
    icon: Settings,
    roles: ['ADMIN'],
    children: [
      { id: 'companies',           label: 'Companies',           path: '/masters/companies',           icon: Briefcase   },
      { id: 'branches',            label: 'Branches',            path: '/masters/branches',            icon: Building2   },
      { id: 'contact-types',       label: 'Contact Types',       path: '/masters/contact-types',       icon: BookUser    },
      { id: 'lead-sources',        label: 'Lead Sources',        path: '/masters/lead-sources',        icon: Radio       },
      { id: 'lead-statuses',       label: 'Lead Statuses',       path: '/masters/lead-statuses',       icon: Tag         },
      { id: 'pipeline-stages',     label: 'Pipeline Stages',     path: '/masters/pipeline-stages',     icon: GitBranch   },
      { id: 'lost-reasons',        label: 'Lost Reasons',        path: '/masters/lost-reasons',        icon: AlertCircle },
      { id: 'customer-categories', label: 'Customer Categories', path: '/masters/customer-categories', icon: FolderTree  },
      { id: 'users',               label: 'Users',               path: '/masters/users',               icon: UserCog     },
    ],
  },
];

const SALES_PIPELINE_PATHS = ['/leads', '/instore-leads', '/pipeline', '/contacts'];

export default function Sidebar() {
  const { user }    = useAuth();
  const { openTab } = useTabs();
  const navigate    = useNavigate();
  const location    = useLocation();

  const isInSalesPipeline = SALES_PIPELINE_PATHS.some((p) => location.pathname.startsWith(p));

  const [openGroups, setOpenGroups] = useState(() => {
    const init = { masters: location.pathname.startsWith('/masters') };
    init['sales-pipeline'] = isInSalesPipeline;
    return init;
  });

  const toggleGroup = (id) => setOpenGroups((s) => ({ ...s, [id]: !s[id] }));

  const handleNav = (item) => {
    openTab({ id: item.id, label: item.label, path: item.path });
    navigate(item.path);
  };

  const isActive = (path) => location.pathname === path;

  const visible = NAV.filter((item) => item.roles.includes(user?.role));

  return (
    <aside className="w-60 bg-gray-900 text-gray-300 flex flex-col shrink-0 h-screen sticky top-0">
      {/* Logo */}
      <div className="px-5 py-4 flex items-center gap-2 text-white border-b border-gray-800">
        <div className="bg-indigo-600 rounded-lg p-1.5">
          <Gem className="w-5 h-5 text-white" />
        </div>
        <span className="font-semibold text-sm">Jewellery CRM</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
        {visible.map((item) => {
          if (item.children) {
            const isOpen = !!openGroups[item.id];
            const anyChildActive = item.children.some((c) => isActive(c.path));

            return (
              <div key={item.id}>
                <button
                  onClick={() => toggleGroup(item.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    anyChildActive
                      ? 'text-white bg-gray-800'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </span>
                  {isOpen
                    ? <ChevronDown className="w-3.5 h-3.5" />
                    : <ChevronRight className="w-3.5 h-3.5" />
                  }
                </button>

                {isOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l-2 border-gray-800 pl-2">
                    {item.children.map((child) => (
                      <button
                        key={child.id}
                        onClick={() => handleNav(child)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          isActive(child.path)
                            ? 'bg-indigo-600 text-white font-medium'
                            : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                        }`}
                      >
                        <child.icon className="w-3.5 h-3.5" />
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => handleNav(item)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive(item.path)
                  ? 'bg-indigo-600 text-white font-medium'
                  : 'hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
