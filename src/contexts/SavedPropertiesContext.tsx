"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { notifyPropertySaved } from '../services/notificationsService';
import { useAuth } from './AuthContext';

import { silentFetch } from '@/lib/apiUtils';

interface SavedPropertiesContextType {
    savedProperties: any[];
    savedPropertyIds: Set<string>;
    loading: boolean;
    error: string | null;
    saveProperty: (property: any) => Promise<any>;
    removeProperty: (propertyId: string) => Promise<any>;
    toggleProperty: (property: any) => Promise<any>;
    isPropertySaved: (propertyId: string) => boolean;
    savedCount: number;
    refreshSavedProperties: () => void;
}

const SavedPropertiesContext = createContext<SavedPropertiesContextType | undefined>(undefined);

export const useSavedProperties = () => {
    const context = useContext(SavedPropertiesContext);
    if (!context) {
        throw new Error('useSavedProperties must be used within a SavedPropertiesProvider');
    }
    return context;
};

const CORE_SERVICE_URL = process.env.NEXT_PUBLIC_CORE_SERVICE_URL || 'http://localhost:8080';

export const SavedPropertiesProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [savedProperties, setSavedProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const getHeaders = () => {
        const token = typeof window !== 'undefined' ? localStorage.getItem('esto_token') : '';
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    };

    const fetchSavedProperties = useCallback(async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true);
        const result = await silentFetch<any[]>(
            `${CORE_SERVICE_URL}/api/v1/properties/saved`,
            { headers: getHeaders() },
            [],
            'SavedPropertiesContext'
        );

        setSavedProperties(result.data);
        setError(result.error);
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchSavedProperties();
    }, [fetchSavedProperties]);

    const saveProperty = useCallback(async (property: any) => {
        const propertyId = typeof property === 'string' ? property : property.id;
        try {
            const response = await fetch(`${CORE_SERVICE_URL}/api/v1/properties/${propertyId}/save`, {
                method: 'POST',
                headers: getHeaders()
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save property');
            }

            await fetchSavedProperties();
            return { success: true };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        }
    }, [fetchSavedProperties]);

    const removeProperty = useCallback(async (propertyId: string) => {
        try {
            const response = await fetch(`${CORE_SERVICE_URL}/api/v1/properties/${propertyId}/save`, {
                method: 'DELETE',
                headers: getHeaders()
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to remove property');
            }

            setSavedProperties(prev => prev.filter(p => p.id !== propertyId));
            return { success: true };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        }
    }, []);

    const toggleProperty = useCallback(async (property: any) => {
        const propertyId = typeof property === 'string' ? property : property.id;
        const isSaved = savedProperties.some(p => p.id === propertyId);

        if (isSaved) {
            return await removeProperty(propertyId);
        } else {
            return await saveProperty(property);
        }
    }, [savedProperties, saveProperty, removeProperty]);

    const isPropertySaved = useCallback((propertyId: string) => {
        return savedProperties.some(p => p.id === propertyId);
    }, [savedProperties]);

    const savedPropertyIds = new Set(savedProperties.map(p => p.id));
    const savedCount = savedProperties.length;

    return (
        <SavedPropertiesContext.Provider
            value={{
                savedProperties,
                savedPropertyIds,
                loading,
                error,
                saveProperty,
                removeProperty,
                toggleProperty,
                isPropertySaved,
                savedCount,
                refreshSavedProperties: fetchSavedProperties,
            }}
        >
            {children}
        </SavedPropertiesContext.Provider>
    );
};
