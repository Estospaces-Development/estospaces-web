"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';

interface PropertyFilterContextType {
    activeTab: string;
    setActiveTab: (tab: string, shouldNavigate?: boolean) => void;
    getApiType: () => string;
}

const PropertyFilterContext = createContext<PropertyFilterContextType | undefined>(undefined);

export const PropertyFilterProvider = ({ children }: { children: React.ReactNode }) => {
    const pathname = useLocation().pathname;
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const searchParamSnapshot = searchParams.toString();

    // Get initial tab from URL or default to 'all'
    const getInitialTab = useCallback(() => {
        if (pathname === '/user/dashboard/discover') {
            const currentSearchParams = new URLSearchParams(searchParamSnapshot);
            const type = currentSearchParams.get('type') || currentSearchParams.get('tab');
            if (type === 'buy' || type === 'sale') return 'buy';
            if (type === 'rent') return 'rent';
        }
        return 'all';
    }, [pathname, searchParamSnapshot]);

    const [activeTab, setActiveTabState] = useState(getInitialTab);

    // Update tab state only - navigation is handled separately by the caller
    const setActiveTab = useCallback((tab: string, shouldNavigate = false) => {
        setActiveTabState(tab);

        // Only navigate if explicitly requested
        if (shouldNavigate) {
            if (pathname === '/user/dashboard/discover') {
                // If already on discover page, just update the URL
                const params = new URLSearchParams(searchParamSnapshot);
                if (tab === 'all') {
                    params.delete('type');
                } else if (tab === 'buy') {
                    params.set('type', 'buy');
                } else if (tab === 'rent') {
                    params.set('type', 'rent');
                }
                navigate(`/user/dashboard/discover?${params.toString()}`);
            } else {
                // Navigate to discover page with the filter
                if (tab === 'all') {
                    navigate('/user/dashboard/discover');
                } else {
                    navigate(`/user/dashboard/discover?type=${tab}`);
                }
            }
        }
    }, [navigate, pathname, searchParamSnapshot]);

    // Sync with URL when location changes
    useEffect(() => {
        setActiveTabState(getInitialTab());
    }, [getInitialTab]);

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

