"use client";

import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FolderKanban,
  LayoutDashboard,
  MessageSquare,
  Search,
} from "lucide-react";
import { useMessages } from "../../contexts/MessagesContext";

const UnreadCountBadge = ({ count }: { count: number }) => {
  if (count === 0) return null;

  return (
    <span className="ml-1.5 flex h-5 min-w-[18px] items-center justify-center rounded-full bg-orange-500 px-1.5 text-xs font-semibold text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
};

interface HorizontalNavigationProps {
  useSubdomain?: boolean;
}

const HorizontalNavigation = ({
  useSubdomain = false,
}: HorizontalNavigationProps) => {
  void useSubdomain;

  const pathname = useLocation().pathname;
  const navigate = useNavigate();
  const { totalUnreadCount } = useMessages();
  const [pressedItem, setPressedItem] = useState<string | null>(null);
  const dashboardResetPath = "/user/dashboard?reset=1";

  const navItems = [
    {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: "/user/dashboard",
      exact: true,
    },
    {
      icon: Search,
      label: "Find",
      path: "/user/dashboard/discover",
      activePaths: ["/user/dashboard/discover", "/user/search"],
    },
    {
      icon: MessageSquare,
      label: "Messages",
      path: "/user/dashboard/messages",
      showBadge: true,
      badgeCount: totalUnreadCount,
    },
    {
      icon: FolderKanban,
      label: "My Activity",
      path: "/user/dashboard/saved",
      activePaths: [
        "/user/dashboard/saved",
        "/user/dashboard/applications",
        "/user/dashboard/virtual-storage",
        "/user/dashboard/docs",
        "/user/dashboard/viewings",
        "/user/dashboard/contracts",
        "/user/saved",
        "/user/applications",
        "/user/virtual-storage",
        "/user/docs",
      ],
    },
  ];

  const isActive = (item: (typeof navItems)[number]) => {
    if (item.exact) {
      return pathname === item.path;
    }

    if (item.activePaths?.some((candidate) => pathname.startsWith(candidate))) {
      return true;
    }

    return pathname.startsWith(item.path);
  };

  const handleNavClick = (path: string) => {
    setPressedItem(path);
    window.setTimeout(() => setPressedItem(null), 180);
  };

  const handleDashboardClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    handleNavClick("/user/dashboard");
    navigate(dashboardResetPath);
  };

  return (
    <nav
      className="sticky top-16 z-20 border-b border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="px-4 lg:px-6">
        <div className="hidden items-center justify-center gap-1 overflow-x-auto py-2 md:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            const commonClass = `
              relative inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold
              transition-all duration-200 ease-out whitespace-nowrap focus:outline-none
              focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1
              ${
                active
                  ? "bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-950 dark:text-gray-400 dark:hover:bg-gray-800/60 dark:hover:text-gray-100"
              }
              ${pressedItem === item.path ? "scale-95" : "scale-100"}
            `;

            if (item.exact) {
              return (
                <Link
                  key={item.path}
                  to={dashboardResetPath}
                  onClick={handleDashboardClick}
                  className={commonClass}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon
                    size={18}
                    className={
                      active
                        ? "text-orange-500 dark:text-orange-400"
                        : "text-gray-400 dark:text-gray-500"
                    }
                  />
                  <span>{item.label}</span>
                </Link>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => handleNavClick(item.path)}
                className={commonClass}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  size={18}
                  className={
                    active
                      ? "text-orange-500 dark:text-orange-400"
                      : "text-gray-400 dark:text-gray-500"
                  }
                />
                <span>{item.label}</span>
                {item.showBadge && (item.badgeCount || 0) > 0 && (
                  <UnreadCountBadge count={item.badgeCount || 0} />
                )}
              </Link>
            );
          })}
        </div>

        <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 py-3 scrollbar-hide md:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            const commonClass = `
              relative inline-flex flex-shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold
              transition-all duration-200 ease-out focus:outline-none focus-visible:ring-2
              focus-visible:ring-orange-500 focus-visible:ring-offset-2
              ${
                active
                  ? "bg-orange-500 text-white shadow-sm"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              }
              ${pressedItem === item.path ? "scale-95" : "scale-100"}
            `;

            const content = (
              <>
                <Icon size={16} className="flex-shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
                {item.showBadge && (item.badgeCount || 0) > 0 && (
                  <UnreadCountBadge count={item.badgeCount || 0} />
                )}
              </>
            );

            if (item.exact) {
              return (
                <Link
                  key={item.path}
                  to={dashboardResetPath}
                  onClick={handleDashboardClick}
                  className={commonClass}
                  aria-current={active ? "page" : undefined}
                >
                  {content}
                </Link>
              );
            }

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => handleNavClick(item.path)}
                className={commonClass}
                aria-current={active ? "page" : undefined}
              >
                {content}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default HorizontalNavigation;
