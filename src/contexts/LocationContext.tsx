"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { getUserLocation, extractPostcodeFromAddress } from '../services/locationService';
import { createDashboardMapLocationGate } from '../lib/dashboardMapLocation';
import { useAuth } from './AuthContext';

interface LocationContextType {
    userLocation: any;
    searchLocation: any;
    activeLocation: any;
    loading: boolean;
    error: string | null;
    updateLocationFromSearch: (searchInput: string) => Promise<any>;
    clearSearchLocation: () => void;
}

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const resolveProfileLocation = (user?: {
    postcode?: string | null;
    address?: string | null;
} | null) => {
    if (!user) return null;
    const postcode = extractPostcodeFromAddress(user.postcode || '')
        || extractPostcodeFromAddress(user.address || '');
    return postcode ? { postcode } : null;
};

export const resolveSearchLocationCode = (searchInput: string) => (
    extractPostcodeFromAddress(searchInput)
);

export const useUserLocation = () => {
    const context = useContext(LocationContext);
    if (!context) {
        throw new Error('useUserLocation must be used within a LocationProvider');
    }
    return context;
};

export const LocationProvider = ({ children }: { children: React.ReactNode }) => {
    const [userLocation, setUserLocation] = useState<any>(null);
    const [searchLocation, setSearchLocation] = useState<any>(null);
    const [searchLocationActive, setSearchLocationActive] = useState(false);
    const searchLocationGateRef = useRef(createDashboardMapLocationGate());
    const { user } = useAuth();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const normalizedPath = location.pathname.replace(/^\/user/, '');
    const shouldAutoDetectLocation =
        normalizedPath === '/dashboard' ||
        normalizedPath === '/dashboard/' ||
        normalizedPath.startsWith('/dashboard/discover');

    // Get user profile location
    const getUserProfileLocation = useCallback(async () => {
        return resolveProfileLocation(user);
    }, [user]);

    // Detect user location on mount
    useEffect(() => {
        if (!shouldAutoDetectLocation) {
            setUserLocation(null);
            setError(null);
            setLoading(false);
            return;
        }

        const detectLocation = async () => {
            setLoading(true);
            setError(null);

            try {
                const profileLocation = await getUserProfileLocation();

                const location = await getUserLocation({
                    profileLocation,
                    useGeolocation: true,
                });

                setUserLocation(location);
            } catch (err: any) {
                setError(err.message);
                setUserLocation(null);
            } finally {
                setLoading(false);
            }
        };

        detectLocation();
    }, [getUserProfileLocation, shouldAutoDetectLocation]);

    // Update location from search
    const updateLocationFromSearch = useCallback(async (searchInput: string) => {
        const revision = searchLocationGateRef.current.begin();
        const locationCode = resolveSearchLocationCode(searchInput);
        setSearchLocationActive(true);
        setLoading(true);
        setError(null);

        if (!locationCode) {
            if (searchLocationGateRef.current.isCurrent(revision)) {
                setSearchLocation(null);
                setLoading(false);
            }
            return null;
        }

        try {
            const location = await getUserLocation({
                searchInput: locationCode,
                profileLocation: null,
                useGeolocation: false,
            });

            if (searchLocationGateRef.current.isCurrent(revision)) {
                setSearchLocation(location);
            }
            return location;
        } catch (err: any) {
            if (searchLocationGateRef.current.isCurrent(revision)) {
                setError(err.message);
                setSearchLocation(null);
            }
            return null;
        } finally {
            if (searchLocationGateRef.current.isCurrent(revision)) {
                setLoading(false);
            }
        }
    }, []);

    const clearSearchLocation = useCallback(() => {
        searchLocationGateRef.current.invalidate();
        setSearchLocation(null);
        setSearchLocationActive(false);
        setError(null);
        setLoading(false);
    }, []);

    // Get active location (search takes priority over user location)
    const getActiveLocation = useCallback(() => {
        return searchLocationActive ? searchLocation : (userLocation || null);
    }, [searchLocation, searchLocationActive, userLocation]);

    const value = {
        userLocation,
        searchLocation,
        activeLocation: getActiveLocation(),
        loading,
        error,
        updateLocationFromSearch,
        clearSearchLocation,
    };

    return (
        <LocationContext.Provider value={value}>
            {children}
        </LocationContext.Provider>
    );
};
