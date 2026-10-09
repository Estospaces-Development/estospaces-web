"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch, getServiceUrl } from '@/lib/apiUtils';
import type { Property } from './PropertyContext';
import { isSameSavedPropertyId, normalizeSavedPropertyId } from '@/lib/savedPropertyState';
import { invalidatePropertyDetailCache } from '@/services/propertyService';

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
    refreshSavedPropertiesIfStale: () => void;
}

// Skip a background refresh when a fetch started this recently (e.g. the first app load).
const SAVED_REFRESH_MIN_INTERVAL_MS = 5000;

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
    const [savedProperties, setSavedProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const pendingPropertyIds = useRef(new Set<string>());
    const canUseSavedProperties = (user?.role || '').trim().toLowerCase() === 'user';

    // Starts at mount time so a page that mounts with the provider does not duplicate the first load.
    const lastFetchStartedAt = useRef(Date.now());

    // `silent` keeps the current list on screen (no skeleton) and keeps it if the refetch fails.
    const loadSavedProperties = useCallback(async (silent: boolean) => {
        if (!user || !canUseSavedProperties) {
            setSavedProperties([]);
            setError(null);
            setLoading(false);
            return;
        }

        lastFetchStartedAt.current = Date.now();
        if (!silent) setLoading(true);
        try {
            const data = await apiFetch<Property[]>(
                `${getServiceUrl('core')}/api/v1/properties/saved`,
            );
            // The saved list is the user's own record, so it is never market-filtered:
            // a home saved from another market must stay visible and removable here.
            setSavedProperties(Array.isArray(data) ? data : []);
            setError(null);
        } catch (err: any) {
            if (!silent) {
                setSavedProperties([]);
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    }, [user, canUseSavedProperties]);

    const fetchSavedProperties = useCallback(() => loadSavedProperties(false), [loadSavedProperties]);

    const refreshSavedPropertiesIfStale = useCallback(() => {
        if (Date.now() - lastFetchStartedAt.current < SAVED_REFRESH_MIN_INTERVAL_MS) return;
        void loadSavedProperties(true);
    }, [loadSavedProperties]);

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
                refreshSavedPropertiesIfStale,
            }}
        >
            {children}
        </SavedPropertiesContext.Provider>
    );
};

/** Call on the Saved page: refetch live listing data (price/status) on open and when the tab regains focus. */
export const useRefreshSavedOnOpen = () => {
    const { refreshSavedPropertiesIfStale } = useSavedProperties();
    useEffect(() => {
        refreshSavedPropertiesIfStale();
        const onVisible = () => {
            if (document.visibilityState === 'visible') refreshSavedPropertiesIfStale();
        };
        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, [refreshSavedPropertiesIfStale]);
};
