"use client";

import {
  Building2,
  LayoutDashboard,
  Menu,
  ShieldCheck,
  Users,
  Zap,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

type MobileWorkspaceRole = 'manager' | 'admin';

interface RoleMobileNavigationProps {
  role: MobileWorkspaceRole;
  onOpenMore: () => void;
}

const roleItems = {
  manager: [
    { icon: LayoutDashboard, label: 'Home', mobileLabel: 'Home', path: '/manager/dashboard', exact: true },
    { icon: Zap, label: 'Fast Track', mobileLabel: 'Fast Track', path: '/manager/fast-track' },
    { icon: Building2, label: 'Properties', mobileLabel: 'Listings', path: '/manager/dashboard/properties' },
    { icon: Users, label: 'Leads', mobileLabel: 'Leads', path: '/manager/leads', activePaths: ['/manager/clients'] },
  ],
  admin: [
    { icon: LayoutDashboard, label: 'Home', mobileLabel: 'Home', path: '/admin/dashboard', exact: true },
    { icon: Users, label: 'Users', mobileLabel: 'Users', path: '/admin/users', activePaths: ['/admin/user-management'] },
    { icon: ShieldCheck, label: 'Verify', mobileLabel: 'Verify', path: '/admin/verifications' },
    { icon: Building2, label: 'Properties', mobileLabel: 'Listings', path: '/admin/properties' },
  ],
} satisfies Record<MobileWorkspaceRole, Array<{
  icon: typeof LayoutDashboard;
  label: string;
  mobileLabel: string;
  path: string;
  exact?: boolean;
  activePaths?: string[];
}>>;

const RoleMobileNavigation = ({ role, onOpenMore }: RoleMobileNavigationProps) => {
  const { pathname } = useLocation();
  const items = roleItems[role];
  const matchesPath = (path: string, exact?: boolean) => (
    exact ? pathname === path : pathname === path || pathname.startsWith(`${path}/`)
  );
  const isActive = (item: (typeof items)[number]) => (
    matchesPath(item.path, item.exact)
    || item.activePaths?.some((path) => matchesPath(path))
    || false
  );
  const primaryRouteActive = items.some(isActive);

  return (
    <nav
      aria-label={`${role === 'admin' ? 'Admin' : 'Manager'} mobile navigation`}
      className="workspace-chrome mobile-role-navigation fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/96 px-1.5 pt-1 shadow-[0_-10px_28px_rgba(15,23,42,0.10)] backdrop-blur-xl dark:border-gray-800 dark:bg-gray-950/96 lg:hidden"
      data-mobile-role-navigation={role}
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-1 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const Icon = item.icon;
          const active = isActive(item);

          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.mobileLabel === item.label ? item.label : `${item.mobileLabel} (${item.label})`}
              aria-current={active ? 'page' : undefined}
              className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${
                active
                  ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/12 dark:text-orange-300'
                  : 'text-gray-500 active:bg-gray-100 dark:text-gray-400 dark:active:bg-gray-800'
              }`}
            >
              <Icon aria-hidden="true" className="h-5 w-5" strokeWidth={active ? 2.4 : 2} />
              <span className="max-w-full whitespace-nowrap">{item.mobileLabel}</span>
              {active ? <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-orange-500" /> : null}
            </Link>
          );
        })}

        <button
          type="button"
          onClick={onOpenMore}
          aria-label={`Open all ${role} navigation`}
          className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[11px] font-semibold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 ${
            primaryRouteActive
              ? 'text-gray-500 active:bg-gray-100 dark:text-gray-400 dark:active:bg-gray-800'
              : 'bg-orange-50 text-orange-700 dark:bg-orange-500/12 dark:text-orange-300'
          }`}
        >
          <Menu aria-hidden="true" className="h-5 w-5" />
          <span>More</span>
          {!primaryRouteActive ? <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-orange-500" /> : null}
        </button>
      </div>
    </nav>
  );
};

export default RoleMobileNavigation;
