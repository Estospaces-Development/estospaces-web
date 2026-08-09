'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { isCurrentAuthRoute } from '@/lib/authUtils';
import { AUTH_EXPIRED_EVENT, ApiRequestError, apiFetch, getErrorMessage, getServiceUrl } from '@/lib/apiUtils';
import { resetAuthExpiryState } from '@/lib/authExpiry';
import { clearAuthToken, getAuthToken, setAuthToken } from '@/lib/authToken';
import { setProductAnalyticsIdentity, trackProductEvent } from '@/lib/productAnalytics';

export interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    isAuthenticated: boolean;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    avatar?: string;
    phone?: string;
    address?: string;
    postcode?: string;
    country?: string;
    countryCode?: string;
    country_code?: string;
    user_metadata?: {
        full_name?: string;
        phone?: string;
        [key: string]: any;
    };
}

interface AuthContextType {
    user: User | null;
    profile: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
    login: (email: string, password: string) => Promise<{ success: boolean; role?: string; error?: string }>;
    register: (
        name: string,
        email: string,
        password: string,
        role: string,
        termsAcceptance: { acceptedAt: string; version: string; country?: string },
    ) => Promise<{ success: boolean; error?: string }>;
    signOut: () => Promise<void>;
    refreshUser: () => Promise<void>;
    mergeCurrentUserProfile: (updatedProfile: Record<string, any>) => void;
    getRole: () => string;
    getDisplayName: () => string;
    /** Returns the role of the currently cached session, or null if none. */
    getExistingRole: () => string | null;
    /** Returns true when a different role is already signed in. */
    hasRoleConflict: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CORE_SERVICE_URL = () => getServiceUrl('core');

/**
 * Shared across all roles today, but each role's session must live in its own
 * localStorage slot so an admin login in another tab does not silently replace
 * the user/manager session in the current tab (issue #356 cross-tab overwrite).
 */
const AUTH_STORAGE_BASE_KEY = 'esto_user';

const roleStorageKey = (role?: string | null) => {
    const safeRole = String(role || '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
    return safeRole ? `${AUTH_STORAGE_BASE_KEY}:${safeRole}` : AUTH_STORAGE_BASE_KEY;
};

let AUTH_STORAGE_KEY = AUTH_STORAGE_BASE_KEY;

const refreshAuthStorageKey = (role?: string | null) => {
    AUTH_STORAGE_KEY = roleStorageKey(role);
    return AUTH_STORAGE_KEY;
};

const parseMetadata = (value: unknown): Record<string, any> => {
    if (!value) {
        return {};
    }

    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return typeof parsed === 'object' && parsed !== null ? parsed as Record<string, any> : {};
        } catch {
            return {};
        }
    }

    if (typeof value === 'object') {
        return value as Record<string, any>;
    }

    return {};
};

const getEmailPrefix = (email?: string) => {
    const normalizedEmail = String(email || '').trim();
    if (!normalizedEmail) {
        return 'User';
    }

    const [prefix] = normalizedEmail.split('@');
    return prefix || normalizedEmail;
};

const buildFullName = (
    firstName?: string,
    lastName?: string,
    fallbackName?: string,
    fallbackEmail?: string,
) => {
    const combinedName = `${String(firstName || '').trim()} ${String(lastName || '').trim()}`.trim();
    if (combinedName) {
        return combinedName;
    }

    const normalizedFallbackName = String(fallbackName || '').trim();
    if (normalizedFallbackName) {
        return normalizedFallbackName;
    }

    return getEmailPrefix(fallbackEmail);
};

export const splitRegistrationName = (name: string) => {
    const normalizedName = name.trim().replace(/\s+/g, ' ');
    const nameParts = normalizedName ? normalizedName.split(' ') : [];
    const first_name = nameParts[0] || '';
    const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    return { first_name, last_name };
};

const buildStoredUser = (rawUser: Record<string, any>, fallbackEmail = ''): User => {
    const metadata = {
        ...parseMetadata(rawUser.metadata),
        ...parseMetadata(rawUser.user_metadata),
    };
    const email = String(rawUser.email || fallbackEmail || '').trim();
    const firstName = String(rawUser.first_name || '').trim();
    const lastName = String(rawUser.last_name || '').trim();
    const fullName = buildFullName(firstName, lastName, rawUser.name || metadata.full_name, email);
    const avatar = rawUser.avatar || rawUser.avatar_url || '';
    const phone = rawUser.phone || metadata.phone || '';

    const country = rawUser.country || metadata.country || undefined;
    
    // Derive country code dynamically to avoid stale countryCode cached values
    let derivedCode: string | undefined = undefined;
    if (country) {
        const norm = country.trim().toLowerCase();
        if (norm === 'india' || norm === 'in' || norm === 'bharat') {
            derivedCode = 'IN';
        } else if (norm === 'united kingdom' || norm === 'uk' || norm === 'gb' || norm === 'great britain') {
            derivedCode = 'GB';
        }
    }

    const countryCode = derivedCode || rawUser.countryCode || rawUser.country_code || metadata.countryCode || metadata.country_code || undefined;

    return {
        id: String(rawUser.id || ''),
        email,
        name: fullName,
        role: String(rawUser.role || 'user'),
        isAuthenticated: true,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        avatar_url: avatar || undefined,
        avatar: avatar || undefined,
        phone: phone || undefined,
        address: rawUser.address || undefined,
        postcode: rawUser.postcode || undefined,
        country: rawUser.country || metadata.country || undefined,
        countryCode: rawUser.countryCode || rawUser.country_code || metadata.countryCode || metadata.country_code || undefined,
        country_code: rawUser.country_code || rawUser.countryCode || metadata.country_code || metadata.countryCode || undefined,
        user_metadata: {
            ...metadata,
            country: country,
            countryCode: countryCode,
            country_code: countryCode,
            full_name: fullName,
            phone: phone || undefined,
        },
    };
};

function getCachedUser(): User | null {
    if (typeof window === 'undefined') {
        return null;
    }

    const keysToCheck = new Set<string>([AUTH_STORAGE_BASE_KEY]);
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`${AUTH_STORAGE_BASE_KEY}:`)) {
                keysToCheck.add(key);
            }
        }
    } catch {
        // localStorage iteration may throw in some envs; fall back to base key
    }

    for (const key of keysToCheck) {
        const rawUser = localStorage.getItem(key);
        if (!rawUser) {
            continue;
        }
        try {
            const parsed = JSON.parse(rawUser) as User;
            if (parsed && (parsed.isAuthenticated || parsed.role)) {
                refreshAuthStorageKey(parsed.role);
                return parsed;
            }
        } catch {
            // ignore malformed entries
        }
    }

    return null;
}

const persistUser = (nextUser: User | null) => {
    if (typeof window === 'undefined') {
        return;
    }

    if (!nextUser) {
        // Clear every role-scoped slot so the next login doesn't inherit a stale role.
        try {
            const keysToRemove: string[] = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && (key === AUTH_STORAGE_BASE_KEY || key.startsWith(`${AUTH_STORAGE_BASE_KEY}:`))) {
                    keysToRemove.push(key);
                }
            }
            keysToRemove.forEach((key) => localStorage.removeItem(key));
        } catch {
            localStorage.removeItem(AUTH_STORAGE_BASE_KEY);
        }
        return;
    }

    const storedUser: User = {
        id: nextUser.id,
        email: nextUser.email,
        name: nextUser.name,
        role: nextUser.role,
        isAuthenticated: nextUser.isAuthenticated,
        first_name: nextUser.first_name,
        last_name: nextUser.last_name,
        avatar_url: nextUser.avatar_url,
        avatar: nextUser.avatar,
        country: nextUser.country,
        countryCode: nextUser.countryCode,
        country_code: nextUser.country_code,
    };

    const targetKey = refreshAuthStorageKey(nextUser.role);
    localStorage.setItem(targetKey, JSON.stringify(storedUser));
};

const clearStoredAuth = () => {
    clearAuthToken();
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key === AUTH_STORAGE_BASE_KEY || key.startsWith(`${AUTH_STORAGE_BASE_KEY}:`))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch {
        localStorage.removeItem(AUTH_STORAGE_BASE_KEY);
    }
};

const resolveSignedOutError = () => {
    return isCurrentAuthRoute() ? null : 'Your session has expired. Please log in again.';
};

const getInitialAuthState = () => {
    const token = getAuthToken();
    if (!token) {
        clearAuthToken();
    }
    const cachedUser = token ? getCachedUser() : null;

    return {
        user: cachedUser?.isAuthenticated ? cachedUser : null,
        loading: !!token,
    };
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(() => getInitialAuthState().user);
    const [loading, setLoading] = useState(() => getInitialAuthState().loading);
    const [error, setError] = useState<string | null>(null);

    const isAuthenticated = !!user?.isAuthenticated;

    const applySignedOutState = useCallback((nextError?: string | null) => {
        clearStoredAuth();
        resetAuthExpiryState();
        setUser(null);
        setLoading(false);
        setError(nextError === undefined ? resolveSignedOutError() : nextError);
    }, []);

    const refreshUser = useCallback(async () => {
        const token = getAuthToken();
        if (!token) {
            clearStoredAuth();
            resetAuthExpiryState();
            setUser(null);
            setError(null);
            setLoading(false);
            return;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const data = await apiFetch<any>(`${CORE_SERVICE_URL()}/api/v1/auth/me`, {
                suppressErrorToast: true,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);
            const userData = data.user || data.data || data;
            const userObj = buildStoredUser(userData, userData?.email);

            persistUser(userObj);
            setUser(userObj);
            setError(null);
        } catch (err) {
            if (err instanceof ApiRequestError && err.status === 401) {
                applySignedOutState();
                return;
            }

            const cachedUser = getCachedUser();
            if (cachedUser?.isAuthenticated) {
                setUser(cachedUser);
                setError(null);
            } else {
                applySignedOutState();
            }
        } finally {
            setLoading(false);
        }
    }, [applySignedOutState]);

    const mergeCurrentUserProfile = useCallback((updatedProfile: Record<string, any>) => {
        setUser((currentUser) => {
            if (!currentUser) {
                return currentUser;
            }

            const mergedMetadata = {
                ...(currentUser.user_metadata || {}),
                ...parseMetadata(updatedProfile.metadata),
                ...parseMetadata(updatedProfile.user_metadata),
            };
            const mergedRaw = {
                ...currentUser,
                ...updatedProfile,
                id: updatedProfile.id || currentUser.id,
                email: updatedProfile.email || currentUser.email,
                role: updatedProfile.role || currentUser.role,
                first_name: updatedProfile.first_name ?? currentUser.first_name,
                last_name: updatedProfile.last_name ?? currentUser.last_name,
                avatar: updatedProfile.avatar ?? updatedProfile.avatar_url ?? currentUser.avatar ?? currentUser.avatar_url,
                avatar_url: updatedProfile.avatar_url ?? updatedProfile.avatar ?? currentUser.avatar_url ?? currentUser.avatar,
                phone: updatedProfile.phone ?? currentUser.phone,
                address: updatedProfile.address ?? currentUser.address,
                postcode: updatedProfile.postcode ?? currentUser.postcode,
                country: updatedProfile.country ?? currentUser.country,
                countryCode: updatedProfile.countryCode ?? updatedProfile.country_code ?? currentUser.countryCode,
                country_code: updatedProfile.country_code ?? updatedProfile.countryCode ?? currentUser.country_code,
                metadata: mergedMetadata,
                user_metadata: mergedMetadata,
            };
            const nextUser = buildStoredUser(mergedRaw, currentUser.email);
            persistUser(nextUser);
            return nextUser;
        });
    }, []);

    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    useEffect(() => {
        const handleAuthExpired = () => {
            applySignedOutState();
        };

        window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
        return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    }, [applySignedOutState]);

    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            if (event.storageArea !== localStorage) {
                return;
            }

            // Only react to storage events for THIS role's slot (or the legacy
            // shared `esto_user` key, so upgrades from older tabs still work).
            const isThisRoleKey = event.key === AUTH_STORAGE_KEY;
            const isLegacySharedKey = event.key === AUTH_STORAGE_BASE_KEY;
            if (!isThisRoleKey && !isLegacySharedKey) {
                return;
            }

            const nextToken = getAuthToken();
            if (!nextToken) {
                applySignedOutState(null);
                return;
            }

            if (event.newValue !== event.oldValue) {
                const cachedUser = getCachedUser();
                if (cachedUser?.isAuthenticated && cachedUser.role === user?.role) {
                    setUser(cachedUser);
                    setError(null);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [applySignedOutState, refreshUser, user?.role]);

    const getExistingRole = useCallback((): string | null => {
        const cached = getCachedUser();
        return cached?.isAuthenticated ? cached.role : null;
    }, []);

    const hasRoleConflict = useCallback((nextRole: string) => {
        const existing = getExistingRole();
        if (!existing || !nextRole) {
            return false;
        }
        return existing !== nextRole;
    }, [getExistingRole]);

    // Cross-role session detection: detects when a different role is already signed in
    // (e.g., admin tab followed by manager/user login in another tab). The shared
    // AUTH_STORAGE_KEY + session-token storage mean a new login silently replaces the
    // existing session in every other open tab. The role-mismatch guard below warns
    // before persist so user/manager/admin sessions don't trample each other.
    const login = useCallback(async (email: string, password: string) => {
        setError(null);
        try {
            const data = await apiFetch<any>(
                `${CORE_SERVICE_URL()}/api/v1/auth/login`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                    suppressErrorToast: true,
                },
            );

            if (!data) {
                return { success: false, error: 'Login failed' };
            }

            const token = data.token || data.data?.token;
            const userData = data.user || data.data?.user || { email };
            const userObj = buildStoredUser(userData, email);

            if (hasRoleConflict(userObj.role)) {
                const errMsg = 'Your session has a different active role. Please sign out before switching accounts.';
                setError(errMsg);
                return { success: false, error: errMsg };
            }

            if (!token) {
                const errMsg = 'Login failed. Please try again.';
                setError(errMsg);
                return { success: false, error: errMsg };
            }

            setAuthToken(token);
            persistUser(userObj);
            resetAuthExpiryState();
            setUser(userObj);

            setTimeout(() => {
                void refreshUser();
            }, 100);

            return { success: true, role: userObj.role };
        } catch (err: any) {
            const errMsg = getErrorMessage(err, 'Login failed. Please check your credentials.');
            setError(errMsg);
            return { success: false, error: errMsg };
        }
    }, [refreshUser, hasRoleConflict]);

const sanitizeRegistrationError = (err: unknown): string => {
    const raw = getErrorMessage(err, '').toLowerCase();

    if (raw.includes('already exists') || raw.includes('already registered') || raw.includes('duplicate') || raw.includes('unique constraint') || (raw.includes('email') && raw.includes('taken'))) {
        return 'An account with this email already exists. Please sign in or use a different email.';
    }

    if (raw.includes('weak password') || raw.includes('password too short') || raw.includes('password must')) {
        return 'Please choose a stronger password that meets all requirements.';
    }

    if (raw.includes('invalid') || raw.includes('bad request')) {
        return 'Please check your information and try again.';
    }

    return 'We could not create your account. Please try again later.';
};

    const register = useCallback(async (
        name: string,
        email: string,
        password: string,
        role: string,
        termsAcceptance: { acceptedAt: string; version: string; country?: string },
    ) => {
        setError(null);
        try {
            const { first_name, last_name } = splitRegistrationName(name);

            const payload: Record<string, any> = {
                first_name,
                last_name,
                email,
                password,
                role,
                accepted_terms: true,
                accepted_terms_version: termsAcceptance.version,
                accepted_terms_at: termsAcceptance.acceptedAt,
            };

            if (role === 'manager' && termsAcceptance.country) {
                payload.country = termsAcceptance.country;
            }

            const data = await apiFetch<any>(
                `${CORE_SERVICE_URL()}/api/v1/auth/register`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                    suppressErrorToast: true,
                },
            );

            if (!data) {
                setError('Registration failed');
                return { success: false, error: 'Registration failed' };
            }

            const token = data.token || data.data?.token;
            const userData = data.user || data.data?.user || { email, first_name, last_name, role };
            const userObj = buildStoredUser(userData, email);

            setProductAnalyticsIdentity({
                email: userObj.email,
                firstName: userObj.first_name || first_name,
                id: userObj.id,
                lastName: userObj.last_name || last_name,
                role: userObj.role,
            });
            trackProductEvent('registration_completed', {
                outcome: 'success',
                role: userObj.role,
            });

            if (token) {
                setAuthToken(token);
                persistUser(userObj);
                resetAuthExpiryState();
                setUser(userObj);
                setError(null);
                setTimeout(() => {
                    void refreshUser();
                }, 100);
            }

            return { success: true };
        } catch (err: any) {
            const errorMessage = sanitizeRegistrationError(err);
            setError(errorMessage);
            return { success: false, error: errorMessage };
        }
    }, [refreshUser]);

    const signOut = useCallback(async () => {
        const token = getAuthToken();
        if (token) {
            try {
                await apiFetch(`${CORE_SERVICE_URL()}/api/v1/auth/logout`, {
                    method: 'POST',
                    suppressErrorToast: true,
                });
            } catch {
                // Local auth state must still be cleared if token revocation fails.
            }
        }

        applySignedOutState(null);
    }, [applySignedOutState]);

    const getRole = useCallback(() => {
        return user?.role || 'user';
    }, [user]);

    const getDisplayName = useCallback(() => {
        return user?.name || user?.email?.split('@')[0] || 'User';
    }, [user]);

    return (
        <AuthContext.Provider value={{
            user,
            profile: user,
            isAuthenticated,
            loading,
            error,
            login,
            register,
            signOut,
            refreshUser,
            mergeCurrentUserProfile,
            getRole,
            getDisplayName,
            getExistingRole,
            hasRoleConflict,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export function useOptionalAuth() {
    return useContext(AuthContext);
}
