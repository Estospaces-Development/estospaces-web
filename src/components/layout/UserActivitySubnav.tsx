"use client";

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Calendar, FileText, FolderLock, Heart, Home, Zap } from "lucide-react";

const activityItems = [
  {
    icon: Heart,
    label: "Saved homes",
    mobileLabel: "Saved",
    description: "Homes you liked",
    path: "/user/dashboard/saved",
  },
  {
    icon: FileText,
    label: "Applications",
    mobileLabel: "Applications",
    description: "Requests you sent",
    path: "/user/dashboard/applications",
  },
  {
    icon: FolderLock,
    label: "Virtual Storage",
    mobileLabel: "Documents",
    description: "Document vault",
    path: "/user/dashboard/virtual-storage",
    activePaths: [
      "/user/dashboard/virtual-storage",
      "/user/dashboard/docs",
      "/user/docs",
    ],
  },
  {
    icon: Zap,
    label: "Fast Track",
    mobileLabel: "Fast Track",
    description: "Active cases",
    path: "/user/dashboard/fast-track",
  },
  {
    icon: Calendar,
    label: "Viewings",
    mobileLabel: "Viewings",
    description: "Visits and replies",
    path: "/user/dashboard/viewings",
  },
  {
    icon: Home,
    label: "My homes",
    mobileLabel: "My homes",
    description: "Rented or bought",
    path: "/user/dashboard/contracts",
  },
];

const UserActivitySubnav = () => {
  const { pathname } = useLocation();

  return (
    <section className="mb-4 min-w-0 border-0 bg-transparent p-0 shadow-none sm:mb-8 sm:rounded-[28px] sm:border sm:border-gray-200/80 sm:bg-white/90 sm:p-3 sm:shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] sm:backdrop-blur dark:sm:border-gray-700 dark:sm:bg-gray-900/80">
      <div className="hidden flex-col gap-1 px-1 pb-2 sm:flex sm:px-3 sm:pb-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-orange-500">
          My Activity
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-950 dark:text-white sm:text-xl">
              Everything you are tracking
            </h2>
            <p className="mt-1 hidden text-sm text-gray-500 dark:text-gray-400 sm:block">
              Saved homes, applications, fast track, viewings, and your homes in one simple place.
            </p>
          </div>
        </div>
      </div>

      <nav
        aria-label="My activity sections"
        className="grid grid-cols-3 gap-1.5 rounded-2xl border border-gray-200/80 bg-white p-1.5 shadow-sm sm:grid-cols-2 sm:gap-2 sm:rounded-none sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none lg:grid-cols-3 xl:grid-cols-6 dark:border-gray-700 dark:bg-gray-900 dark:sm:bg-transparent"
      >
        {activityItems.map((item) => {
          const Icon = item.icon;
          const active = item.activePaths
            ? item.activePaths.some((candidate) => pathname.startsWith(candidate))
            : pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.mobileLabel === item.label ? item.label : `${item.mobileLabel} (${item.label})`}
              className={`group flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl border px-1 py-1.5 text-center transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 sm:min-h-[68px] sm:flex-row sm:justify-start sm:gap-3 sm:rounded-2xl sm:px-4 sm:py-3 sm:text-left dark:focus-visible:ring-offset-gray-900 ${
                active
                  ? "border-orange-200 bg-orange-50 text-orange-700 shadow-[0_18px_40px_-28px_rgba(249,115,22,0.75)] dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200"
                  : "border-transparent bg-gray-50 text-gray-600 hover:border-orange-100 hover:bg-white hover:text-gray-950 dark:bg-gray-800/70 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-colors sm:h-10 sm:w-10 sm:rounded-xl ${
                  active
                    ? "bg-orange-500 text-white"
                    : "bg-white text-gray-400 group-hover:text-orange-500 dark:bg-gray-900 dark:text-gray-500"
                }`}
              >
                <Icon className="h-4 w-4 sm:h-[18px] sm:w-[18px]" />
              </span>
              <span className="w-full min-w-0 sm:w-auto">
                <span className="block truncate text-[11px] font-semibold leading-4 sm:hidden">
                  {item.mobileLabel}
                </span>
                <span className="hidden truncate text-sm font-bold sm:block">
                  {item.label}
                </span>
                <span
                  className={`mt-0.5 hidden truncate text-xs sm:block ${
                    active
                      ? "text-orange-800 dark:text-orange-100"
                      : "text-gray-500 dark:text-gray-500"
                  }`}
                >
                  {item.description}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>
    </section>
  );
};

export default UserActivitySubnav;
