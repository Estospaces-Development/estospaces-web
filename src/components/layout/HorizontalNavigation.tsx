"use client";

import React, { useState } from "react";
import {
  Link,
  useNavigate,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import {
  LayoutDashboard,
  MessageSquare,
  FolderKanban,
  ShoppingBag,
  Home,
} from "lucide-react";
import { useMessages } from "../../contexts/MessagesContext";
import { usePropertyFilter } from "../../contexts/PropertyFilterContext";

// Helper component for unread count badge
const UnreadCountBadge = ({ count }: { count: number }) => {
  if (count === 0) return null;

  return (
    <span className="ml-1.5 bg-orange-500 text-white text-xs font-medium rounded-full min-w-[18px] h-5 px-1.5 flex items-center justify-center">
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
  const pathname = useLocation().pathname;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const { totalUnreadCount } = useMessages();
  const { setActiveTab } = usePropertyFilter();
  const [clickedTab, setClickedTab] = useState<string | null>(null);
  const dashboardResetPath = "/user/dashboard?reset=1";

  const primaryNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", path: "/user/dashboard" },
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
      path: "/user/saved",
      activePaths: [
        "/user/saved",
        "/user/applications",
        "/user/dashboard/viewings",
        "/user/dashboard/contracts",
      ],
    },
  ];

  const getLinkPath = (path: string) => path;

  const isActive = (path: string, activePaths?: string[]) => {
    if (activePaths?.some((candidate) => pathname?.startsWith(candidate))) {
      return true;
    }
    const checkPath = getLinkPath(path);
    if (checkPath === "/dashboard") {
      // Handle dashboard specifically if stripped
      return pathname === "/dashboard";
    }
    return pathname?.startsWith(checkPath);
  };

  // Check if Buy or Rent is active based on URL
  const isBuyActive = () => {
    const path = "/user/dashboard/discover";
    if (pathname === path) {
      const type = searchParams.get("type");
      return type === "buy" || !type; // Default is buy if no type specified on discover
    }
    return false;
  };

  const isRentActive = () => {
    const path = "/user/dashboard/discover";
    if (pathname === path) {
      const type = searchParams.get("type");
      return type === "rent";
    }
    return false;
  };

  const handleBuyClickWithAnimation = (e: React.MouseEvent) => {
    e.preventDefault();
    setClickedTab("buy");
    setActiveTab("buy", true);
    setTimeout(() => setClickedTab(null), 300);
  };

  const handleRentClickWithAnimation = (e: React.MouseEvent) => {
    e.preventDefault();
    setClickedTab("rent");
    setActiveTab("rent", true);
    setTimeout(() => setClickedTab(null), 300);
  };

  const handleNavClick = (path: string) => {
    setClickedTab(path);
    setTimeout(() => setClickedTab(null), 300);
  };

  const handleDashboardClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    handleNavClick("/user/dashboard");
    navigate(dashboardResetPath);
  };

  return (
    <nav
      className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-16 z-20 shadow-sm"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="px-4 lg:px-6">
        {/* Desktop: Horizontal tabs - Centered */}
        <div className="hidden md:flex items-center justify-center gap-0.5 overflow-x-auto scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
          {/* Dashboard */}
          {primaryNavItems.slice(0, 1).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.activePaths);

            return (
              <Link
                key={item.path}
                to={dashboardResetPath}
                onClick={handleDashboardClick}
                className={`
                  relative flex items-center gap-2 px-2 py-2.5 text-sm font-medium transition-all duration-200 ease-out
                  rounded-lg
                  ${
                    active
                      ? "text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-500/10"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }
                  ${clickedTab === item.path ? "scale-95" : "scale-100"}
                  whitespace-nowrap cursor-pointer
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1
                `}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  size={18}
                  className={`flex-shrink-0 transition-colors duration-200 ${
                    active
                      ? "text-orange-500 dark:text-orange-400"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                />
                <span>{item.label}</span>
                {item.showBadge && item.badgeCount > 0 && (
                  <UnreadCountBadge count={item.badgeCount} />
                )}
              </Link>
            );
          })}

          {/* Buy and Rent Buttons - Desktop */}
          <div className="flex items-center gap-0.5 ml-1">
            <button
              onClick={handleBuyClickWithAnimation}
              className={`
                relative flex items-center gap-2 px-2 py-2.5 text-sm font-medium transition-all duration-200 ease-out
                rounded-lg
                ${
                  isBuyActive()
                    ? "text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-500/10"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                }
                ${clickedTab === "buy" ? "scale-95" : "scale-100"}
                whitespace-nowrap cursor-pointer
                focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1
              `}
              aria-label="Filter by Buy"
            >
              <ShoppingBag
                size={18}
                className={`flex-shrink-0 transition-colors duration-200 ${
                  isBuyActive()
                    ? "text-orange-500 dark:text-orange-400"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              />
              <span>Buy</span>
            </button>
            <button
              onClick={handleRentClickWithAnimation}
              className={`
                relative flex items-center gap-2 px-2 py-2.5 text-sm font-medium transition-all duration-200 ease-out
                rounded-lg
                ${
                  isRentActive()
                    ? "text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-500/10"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                }
                ${clickedTab === "rent" ? "scale-95" : "scale-100"}
                whitespace-nowrap cursor-pointer
                focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1
              `}
              aria-label="Filter by Rent"
            >
              <Home
                size={18}
                className={`flex-shrink-0 transition-colors duration-200 ${
                  isRentActive()
                    ? "text-orange-500 dark:text-orange-400"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              />
              <span>Rent</span>
            </button>
          </div>

          {/* Remaining primary items */}
          {primaryNavItems.slice(1).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.activePaths);
            const linkPath = getLinkPath(item.path);

            return (
              <Link
                key={item.path}
                to={linkPath}
                onClick={() => handleNavClick(item.path)}
                className={`
                  relative flex items-center gap-2 px-2 py-2.5 text-sm font-medium transition-all duration-200 ease-out
                  rounded-lg
                  ${
                    active
                      ? "text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-500/10"
                      : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  }
                  ${clickedTab === item.path ? "scale-95" : "scale-100"}
                  whitespace-nowrap cursor-pointer
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1
                `}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  size={18}
                  className={`flex-shrink-0 transition-colors duration-200 ${
                    active
                      ? "text-orange-500 dark:text-orange-400"
                      : "text-gray-400 dark:text-gray-500"
                  }`}
                />
                <span>{item.label}</span>
                {item.showBadge && item.badgeCount > 0 && (
                  <UnreadCountBadge count={item.badgeCount} />
                )}
              </Link>
            );
          })}
        </div>

        {/* Mobile: Scrollable pill-style buttons - Centered */}
        <div className="md:hidden flex items-center justify-center gap-2 overflow-x-auto scrollbar-hide py-3 -mx-4 px-4">
          {/* Dashboard */}
          {primaryNavItems.slice(0, 1).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.activePaths);

            return (
              <Link
                key={item.path}
                to={dashboardResetPath}
                onClick={handleDashboardClick}
                className={`
                  relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 ease-out
                  flex-shrink-0 cursor-pointer
                  ${
                    active
                      ? "bg-orange-500 dark:bg-orange-600 text-white shadow-sm"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
                  }
                  ${clickedTab === item.path ? "scale-95 transform active:scale-90" : "scale-100"}
                  focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                `}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  size={16}
                  className={`flex-shrink-0 transition-transform duration-300 ${
                    clickedTab === item.path
                      ? "rotate-12 scale-110"
                      : "rotate-0 scale-100"
                  }`}
                />
                <span className="whitespace-nowrap">{item.label}</span>
                {item.showBadge && item.badgeCount > 0 && (
                  <UnreadCountBadge count={item.badgeCount} />
                )}
              </Link>
            );
          })}

          {/* Buy and Rent Buttons - Mobile */}
          <div className="flex items-center gap-2 ml-2">
            <button
              onClick={handleBuyClickWithAnimation}
              className={`
                relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 ease-out
                flex-shrink-0 cursor-pointer
                ${
                  isBuyActive()
                    ? "bg-orange-500 dark:bg-orange-600 text-white shadow-sm active:bg-orange-600 dark:active:bg-orange-700 active:text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 active:text-gray-900 dark:active:text-gray-100"
                }
                ${clickedTab === "buy" ? "scale-95 transform active:scale-90" : "scale-100"}
                focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
              `}
              aria-label="Filter by Buy"
            >
              <ShoppingBag
                size={16}
                className={`flex-shrink-0 transition-transform duration-300 ${
                  clickedTab === "buy"
                    ? "rotate-12 scale-110"
                    : "rotate-0 scale-100"
                }`}
              />
              <span className="whitespace-nowrap">Buy</span>
            </button>
            <button
              onClick={handleRentClickWithAnimation}
              className={`
                relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 ease-out
                flex-shrink-0 cursor-pointer
                ${
                  isRentActive()
                    ? "bg-orange-500 dark:bg-orange-600 text-white shadow-sm active:bg-orange-600 dark:active:bg-orange-700 active:text-white"
                    : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 active:text-gray-900 dark:active:text-gray-100"
                }
                ${clickedTab === "rent" ? "scale-95 transform active:scale-90" : "scale-100"}
                focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
              `}
              aria-label="Filter by Rent"
            >
              <Home
                size={16}
                className={`flex-shrink-0 transition-transform duration-300 ${
                  clickedTab === "rent"
                    ? "rotate-12 scale-110"
                    : "rotate-0 scale-100"
                }`}
              />
              <span className="whitespace-nowrap">Rent</span>
            </button>
          </div>

          {/* Remaining primary items - Mobile */}
          {primaryNavItems.slice(1).map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path, item.activePaths);
            const linkPath = getLinkPath(item.path);

            return (
              <Link
                key={item.path}
                to={linkPath}
                onClick={() => handleNavClick(item.path)}
                className={`
                  relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-300 ease-out
                  flex-shrink-0 cursor-pointer
                  ${
                    active
                      ? "bg-orange-500 dark:bg-orange-600 text-white shadow-sm active:bg-orange-600 dark:active:bg-orange-700 active:text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-200 dark:active:bg-gray-600 active:text-gray-900 dark:active:text-gray-100"
                  }
                  ${clickedTab === item.path ? "scale-95 transform active:scale-90" : "scale-100"}
                  focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2
                `}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  size={16}
                  className={`flex-shrink-0 transition-transform duration-300 ${
                    clickedTab === item.path
                      ? "rotate-12 scale-110"
                      : "rotate-0 scale-100"
                  }`}
                />
                <span className="whitespace-nowrap">{item.label}</span>
                {item.showBadge && item.badgeCount > 0 && (
                  <UnreadCountBadge count={item.badgeCount} />
                )}
              </Link>
            );
          })}
        </div>

      </div>
    </nav>
  );
};

export default HorizontalNavigation;
