"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch, getServiceUrl } from '@/lib/apiUtils';
import type { Property } from './PropertyContext';
import { isSameSavedPropertyId, normalizeSavedPropertyId } from '@/lib/savedPropertyState';
import { invalidatePropertyDetailCache } from '@/services/propertyService';
import { filterPropertiesForMarket } from '@/lib/propertyMarket';
import { useUserGeoMarket } from '@/lib/useGeoMarket';

interface SavedPropertiesContextType {
    savedProperties: Property[];
    savedPropertyIds: Set<string>;
    loading: boolean;
    error: string | null;
    saveProperty: (property: Property | string) => Promise<any>;
    removeProperty: (propertyId: string) => Promise<any>;
    toggleProperty: (property: Property | string) => Promise<any>;
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
    const geoMarket = useUserGeoMarket(user);
    const [savedProperties, setSavedProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const pendingPropertyIds = useRef(new Set<string>());
    const canUseSavedProperties = (user?.role || '').trim().toLowerCase() === 'user';

    const fetchSavedProperties = useCallback(async () => {
        if (!user || !canUseSavedProperties) {
            setSavedProperties([]);
            setError(null);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const data = await apiFetch<Property[]>(
                `${getServiceUrl('core')}/api/v1/properties/saved`,
            );
            setSavedProperties(filterPropertiesForMarket(data || [], geoMarket));
            setError(null);
        } catch (err: any) {
            setSavedProperties([]);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [user, canUseSavedProperties, geoMarket]);

    useEffect(() => {
        fetchSavedProperties();
    }, [fetchSavedProperties]);

    const isPropertySaved = useCallback((propertyId: string) => {
        return savedProperties.some(p => isSameSavedPropertyId(p.id, propertyId));
    }, [savedProperties]);

    const saveProperty = useCallback(async (property: any) => {
        const propertyId = normalizeSavedPropertyId(typeof property === 'string' ? property : property.id);
        if (!canUseSavedProperties) {
            return { success: false, error: 'Saved properties are only available to user accounts' };
        }
        if (!propertyId) {
            return { success: false, error: 'Missing property id' };
        }
        if (pendingPropertyIds.current.has(propertyId) || isPropertySaved(propertyId)) {
            return { success: true, skipped: true };
        }

        pendingPropertyIds.current.add(propertyId);
        try {
            await apiFetch<any>(
                `${getServiceUrl('core')}/api/v1/properties/${propertyId}/save`,
                { method: 'POST' },
            );
            invalidatePropertyDetailCache(propertyId);
            await fetchSavedProperties();
            return { success: true };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            pendingPropertyIds.current.delete(propertyId);
        }
    }, [canUseSavedProperties, fetchSavedProperties, isPropertySaved]);

    const removeProperty = useCallback(async (propertyId: string) => {
        const normalizedPropertyId = normalizeSavedPropertyId(propertyId);
        if (!canUseSavedProperties) {
            return { success: false, error: 'Saved properties are only available to user accounts' };
        }
        if (!normalizedPropertyId) {
            return { success: false, error: 'Missing property id' };
        }
        if (pendingPropertyIds.current.has(normalizedPropertyId) || !isPropertySaved(normalizedPropertyId)) {
            return { success: true, skipped: true };
        }

        pendingPropertyIds.current.add(normalizedPropertyId);
        try {
            await apiFetch<any>(
                `${getServiceUrl('core')}/api/v1/properties/${normalizedPropertyId}/save`,
                { method: 'DELETE' },
            );
            invalidatePropertyDetailCache(normalizedPropertyId);
            setSavedProperties(prev => prev.filter(p => !isSameSavedPropertyId(p.id, normalizedPropertyId)));
            return { success: true };
        } catch (err: any) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            pendingPropertyIds.current.delete(normalizedPropertyId);
        }
    }, [canUseSavedProperties, isPropertySaved]);

    const toggleProperty = useCallback(async (property: any) => {
        const propertyId = normalizeSavedPropertyId(typeof property === 'string' ? property : property.id);
        const isSaved = isPropertySaved(propertyId);

        if (isSaved) {
            return await removeProperty(propertyId);
        } else {
            return await saveProperty(property);
        }
    }, [isPropertySaved, saveProperty, removeProperty]);

    const savedPropertyIds = useMemo(
        () => new Set(savedProperties.map(p => normalizeSavedPropertyId(p.id)).filter(Boolean)),
        [savedProperties],
    );
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
