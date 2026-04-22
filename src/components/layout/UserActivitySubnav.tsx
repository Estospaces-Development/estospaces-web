"use client";

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Calendar, FileText, Heart, Home } from "lucide-react";

const activityItems = [
  { icon: Heart, label: "Saved Properties", path: "/user/saved" },
  { icon: FileText, label: "My Applications", path: "/user/applications" },
  { icon: Calendar, label: "Viewings", path: "/user/dashboard/viewings" },
  { icon: Home, label: "My Properties", path: "/user/dashboard/contracts" },
];

const UserActivitySubnav = () => {
  const { pathname } = useLocation();

  return (
    <div className="mb-8">
      <p className="mb-3 pl-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-gray-400 dark:text-gray-500">
        My Activity
      </p>
      <div className="overflow-x-auto scrollbar-hide">
        <div className="inline-flex min-w-max items-center gap-2 rounded-full border border-gray-200/80 bg-white p-1 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)] dark:border-gray-700 dark:bg-gray-800">
          {activityItems.map((item) => {
            const Icon = item.icon;
            const active = pathname.startsWith(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "bg-orange-500 text-white shadow-[0_14px_28px_-16px_rgba(249,115,22,0.85)]"
                    : "text-gray-500 hover:bg-orange-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  size={16}
                  className={active ? "text-white" : "text-gray-400 dark:text-gray-500"}
                />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default UserActivitySubnav;
