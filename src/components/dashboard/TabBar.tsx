"use client";

import React from 'react';
import { LayoutDashboard, Building2, Users, FileText, BarChart3 } from 'lucide-react';

interface TabBarProps {
    activeTab: string;
    onTabChange: (tab: string) => void;
}

const TabBar = ({ activeTab, onTabChange }: TabBarProps) => {
    const tabs = [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard },
        { id: 'properties', label: 'Properties', icon: Building2 },
        { id: 'leads', label: 'Leads', icon: Users },
        { id: 'application', label: 'Application', icon: FileText },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    ];

    return (
        <div className="mb-8 hidden overflow-x-auto pb-1 scrollbars-none sm:block">
            <div className="inline-flex min-w-max rounded-xl border border-gray-100/50 bg-gray-100/80 p-1 shadow-inner backdrop-blur-sm dark:border-gray-800/50 dark:bg-gray-900/50 sm:rounded-2xl sm:p-1.5">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`relative flex min-h-11 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-300 ease-out outline-none focus-visible:ring-2 focus-visible:ring-orange-500 sm:gap-2.5 sm:rounded-xl sm:px-5 sm:py-2.5 sm:text-sm ${isActive
                                ? 'bg-white dark:bg-gray-800 text-orange-600 dark:text-orange-500 shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5'
                                }`}
                        >
                            <Icon className={`w-4 h-4 transition-transform duration-300 ${isActive ? 'scale-110' : ''}`} strokeWidth={isActive ? 2.5 : 2} />
                            <span>{tab.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default TabBar;
