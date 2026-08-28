"use client";

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Calendar, FileText, FolderLock, Heart, Home, Zap } from "lucide-react";

const activityItems = [
  {
    icon: Heart,
    label: "Saved homes",
    description: "Homes you liked",
    path: "/user/dashboard/saved",
  },
  {
    icon: FileText,
    label: "Applications",
    description: "Requests you sent",
    path: "/user/dashboard/applications",
  },
  {
    icon: FolderLock,
    label: "Virtual Storage",
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
    description: "Active cases",
    path: "/user/dashboard/fast-track",
  },
  {
    icon: Calendar,
    label: "Viewings",
    description: "Visits and replies",
    path: "/user/dashboard/viewings",
  },
  {
    icon: Home,
    label: "My homes",
    description: "Rented or bought",
    path: "/user/dashboard/contracts",
  },
];

const UserActivitySubnav = () => {
  const { pathname } = useLocation();

  return (
    <section className="mb-5 min-w-0 border-0 bg-transparent p-0 shadow-none sm:mb-8 sm:rounded-[28px] sm:border sm:border-gray-200/80 sm:bg-white/90 sm:p-3 sm:shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] sm:backdrop-blur dark:sm:border-gray-700 dark:sm:bg-gray-900/80">
      <div className="flex flex-col gap-1 px-1 pb-2 sm:px-3 sm:pb-3">
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

      <div className="-mx-1 flex snap-x snap-mandatory gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-3 xl:grid-cols-6">
        {activityItems.map((item) => {
          const Icon = item.icon;
          const active = item.activePaths
            ? item.activePaths.some((candidate) => pathname.startsWith(candidate))
            : pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`group flex min-h-14 min-w-[132px] snap-start items-center gap-2 rounded-2xl border px-3 py-2 text-left transition-all duration-200 sm:min-h-[68px] sm:min-w-0 sm:gap-3 sm:px-4 sm:py-3 ${
                active
                  ? "border-orange-200 bg-orange-50 text-orange-700 shadow-[0_18px_40px_-28px_rgba(249,115,22,0.75)] dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-200"
                  : "border-transparent bg-gray-50 text-gray-600 hover:border-orange-100 hover:bg-white hover:text-gray-950 dark:bg-gray-800/70 dark:text-gray-400 dark:hover:border-gray-700 dark:hover:bg-gray-800 dark:hover:text-white"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-colors sm:h-10 sm:w-10 ${
                  active
                    ? "bg-orange-500 text-white"
                    : "bg-white text-gray-400 group-hover:text-orange-500 dark:bg-gray-900 dark:text-gray-500"
                }`}
              >
                <Icon size={18} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">
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
      </div>
    </section>
  );
};

export default UserActivitySubnav;
