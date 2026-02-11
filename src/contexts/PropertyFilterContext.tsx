"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface PropertyFilterContextType {
    activeTab: string;
    setActiveTab: (tab: string, shouldNavigate?: boolean) => void;
    getApiType: () => string;
}

const PropertyFilterContext = createContext<PropertyFilterContextType | undefined>(undefined);

export const PropertyFilterProvider = ({ children }: { children: React.ReactNode }) => {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();

    // Get initial tab from URL or default to 'all'
    const getInitialTab = useCallback(() => {
        if (pathname === '/user/dashboard/discover') {
            const type = searchParams.get('type');
            if (type === 'buy' || type === 'sale') return 'buy';
            if (type === 'rent') return 'rent';
        }
        return 'all';
    }, [pathname, searchParams]);

    const [activeTab, setActiveTabState] = useState(getInitialTab);

    // Update tab state only - navigation is handled separately by the caller
    const setActiveTab = useCallback((tab: string, shouldNavigate = false) => {
        setActiveTabState(tab);

        // Only navigate if explicitly requested
        if (shouldNavigate) {
            if (pathname === '/user/dashboard/discover') {
                // If already on discover page, just update the URL
                const params = new URLSearchParams(searchParams.toString());
                if (tab === 'all') {
                    params.delete('type');
                } else if (tab === 'buy') {
                    params.set('type', 'buy');
                } else if (tab === 'rent') {
                    params.set('type', 'rent');
                }
                router.replace(`/user/dashboard/discover?${params.toString()}`);
            } else {
                // Navigate to discover page with the filter
                if (tab === 'all') {
                    router.push('/user/dashboard/discover');
                } else {
                    router.push(`/user/dashboard/discover?type=${tab}`);
                }
            }
        }
    }, [pathname, router, searchParams]);

    // Sync with URL when location changes
    useEffect(() => {
        const newTab = getInitialTab();
        if (newTab !== activeTab) {
            setActiveTabState(newTab);
        }
    }, [pathname, searchParams, getInitialTab, activeTab]);

    return (
        <PropertyFilterContext.Provider
            value={{
                activeTab,
                setActiveTab,
                // Helper to get API type parameter
                getApiType: () => {
                    if (activeTab === 'buy') return 'buy';
                    if (activeTab === 'rent') return 'rent';
                    return 'all';
                },
            }}
        >
            {children}
        </PropertyFilterContext.Provider>
    );
};

export const usePropertyFilter = () => {
    const context = useContext(PropertyFilterContext);
    if (!context) {
        throw new Error('usePropertyFilter must be used within PropertyFilterProvider');
    }
    return context;
};
