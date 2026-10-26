import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  FileText, 
  Building, 
  Layers, 
  AlertTriangle, 
  BarChart3,
  ShieldCheck,
  UploadCloud,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export default function Sidebar({ 
  overlapCount = 0, 
  alertCount = 0, 
  collapsed, 
  setCollapsed 
}) {
  const { user } = useAuth();

  const navItems = [
    { 
      name: 'Dashboard', 
      path: '/', 
      icon: LayoutDashboard,
      badge: null
    },
    { 
      name: 'All Cases', 
      path: '/cases', 
      icon: FileText,
      badge: null
    },
    { 
      name: 'Institutions', 
      path: '/institutions', 
      icon: Building,
      badge: null
    },
    { 
      name: 'Overlaps', 
      path: '/overlaps', 
      icon: Layers,
      badge: overlapCount > 0 ? overlapCount : null,
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
    },
    { 
      name: 'Alerts', 
      path: '/alerts', 
      icon: AlertTriangle,
      badge: alertCount > 0 ? alertCount : null,
      badgeColor: 'bg-red-500/20 text-red-300 border border-red-400/40'
    },
    { 
      name: 'Reports', 
      path: '/reports', 
      icon: BarChart3,
      badge: null
    }
  ];

  if (user && ['Senior Management', 'Regulation Bureau'].includes(user.role)) {
    navItems.push({
      name: 'Import Data',
      path: '/import',
      icon: UploadCloud,
      badge: null
    });
  }

  if (user && user.role === 'Senior Management') {
    navItems.push({
      name: 'Audit Trail',
      path: '/audit',
      icon: ShieldCheck,
      badge: 'Admin',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
    });
  }

  return (
    <aside 
      className={`${
        collapsed ? 'w-16' : 'w-60'
      } bg-primary-gradient-sidebar text-white flex flex-col justify-between shrink-0 transition-all duration-200 border-r border-slate-800/40 min-h-[calc(100vh-64px)] select-none`}
    >
      <div className="p-3">
        {/* Navigation Label */}
        {!collapsed && (
          <div className="text-3xs font-bold text-white/40 uppercase tracking-widest px-3 py-2 mb-1">
            Navigation
          </div>
        )}

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                title={collapsed ? item.name : undefined}
                className={({ isActive }) =>
                  `flex items-center ${
                    collapsed ? 'justify-center px-2 py-3' : 'justify-between px-3 py-2.5'
                  } text-xs font-medium rounded-lg transition-smooth relative group ${
                    isActive
                      ? 'bg-white/12 text-white font-semibold shadow-xs'
                      : 'text-white/70 hover:text-white hover:bg-white/8'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Saffron Left Active Bar */}
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b from-amber-400 to-amber-500 rounded-r" />
                    )}

                    <div className="flex items-center space-x-3">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-white/70 group-hover:text-white'}`} />
                      {!collapsed && <span>{item.name}</span>}
                    </div>

                    {!collapsed && item.badge && (
                      <span className={`text-3xs px-2 py-0.5 rounded-full font-mono font-bold ${item.badgeColor || 'bg-white/10 text-white'}`}>
                        {item.badge}
                      </span>
                    )}

                    {/* Collapsed Tooltip */}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-md shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                        {item.name}
                        {item.badge && ` (${item.badge})`}
                      </div>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer Collapse Toggle */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`w-full flex items-center ${collapsed ? 'justify-center' : 'justify-between px-3'} py-2 text-xs text-white/60 hover:text-white hover:bg-white/8 rounded-lg transition-smooth`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {!collapsed && <span className="font-medium text-2xs uppercase tracking-wider text-white/40">Collapse Menu</span>}
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
}
