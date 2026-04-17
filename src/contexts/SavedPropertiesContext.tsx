"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { getSavedProperties as fetchSavedPropertiesFromService } from '@/services/propertyService';
import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

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

export const SavedPropertiesProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const { pathname } = useLocation();
    const [savedProperties, setSavedProperties] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSavedProperties = useCallback(async () => {
        if (!user || user.role !== 'user' || !pathname.startsWith('/user')) {
            setSavedProperties([]);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const { data, error: fetchError } = await fetchSavedPropertiesFromService();
            if (fetchError) {
                throw new Error(fetchError);
            }
            setSavedProperties(data || []);
            setError(null);
        } catch (err: any) {
            console.error('[SavedProperties] Error:', err.message);
            setSavedProperties([]);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [pathname, user]);

    useEffect(() => {
        fetchSavedProperties();
    }, [fetchSavedProperties]);

    const saveProperty = useCallback(async (property: any) => {
        const propertyId = typeof property === 'string' ? property : property.id;
        try {
            await apiFetch<any>(
                `${getServiceUrl('core')}/api/v1/properties/${propertyId}/save`,
                { method: 'POST' },
            );
            await fetchSavedProperties();
            return { success: true };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        }
    }, [fetchSavedProperties]);

    const removeProperty = useCallback(async (propertyId: string) => {
        try {
            await apiFetch<any>(
                `${getServiceUrl('core')}/api/v1/properties/${propertyId}/save`,
                { method: 'DELETE' },
            );
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
