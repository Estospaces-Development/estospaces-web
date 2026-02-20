"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUserLocation } from '../services/locationService';
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
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Get user profile location (Mock implementation for now)
    const getUserProfileLocation = useCallback(async () => {
        if (!user) return null;
        // In real app, fetch from API
        return null;
    }, [user]);

    // Detect user location on mount
    useEffect(() => {
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
                console.error('Error detecting location:', err);
                setError(err.message);
                // Set default location
                setUserLocation({
                    type: 'default',
                    postcode: 'SW1A 1AA',
                    latitude: 51.5074,
                    longitude: -0.1278,
                    city: 'London',
                    source: 'default',
                });
            } finally {
                setLoading(false);
            }
        };

        detectLocation();
    }, [getUserProfileLocation]);

    // Update location from search
    const updateLocationFromSearch = useCallback(async (searchInput: string) => {
        setLoading(true);
        setError(null);

        try {
            const location = await getUserLocation({
                searchInput,
                profileLocation: await getUserProfileLocation(),
                useGeolocation: false,
            });

            setSearchLocation(location);
            return location;
        } catch (err: any) {
            console.error('Error updating location from search:', err);
            setError(err.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [getUserProfileLocation]);

    // Get active location (search takes priority over user location)
    const getActiveLocation = useCallback(() => {
        return searchLocation || userLocation || {
            type: 'default',
            postcode: 'SW1A 1AA',
            latitude: 51.5074,
            longitude: -0.1278,
            city: 'London',
            source: 'default',
        };
    }, [searchLocation, userLocation]);

    const value = {
        userLocation: userLocation || {
            type: 'default',
            postcode: 'SW1A 1AA',
            latitude: 51.5074,
            longitude: -0.1278,
            city: 'London',
            source: 'default',
        },
        searchLocation,
        activeLocation: getActiveLocation(),
        loading,
        error,
        updateLocationFromSearch,
        clearSearchLocation: () => setSearchLocation(null),
    };

    return (
        <LocationContext.Provider value={value}>
            {children}
        </LocationContext.Provider>
    );
};
