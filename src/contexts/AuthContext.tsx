'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AUTH_EXPIRED_EVENT, apiFetch, getErrorMessage } from '@/lib/apiUtils';
import { resetAuthExpiryState } from '@/lib/authExpiry';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    isAuthenticated: boolean;
    avatar_url?: string;
    avatar?: string;
    phone?: string;
    address?: string;
    postcode?: string;
    user_metadata?: {
        full_name?: string;
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
        termsAcceptance: { acceptedAt: string; version: string },
    ) => Promise<{ success: boolean; error?: string }>;
    signOut: () => void;
    refreshUser: () => Promise<void>;
    getRole: () => string;
    getDisplayName: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CORE_SERVICE_URL = import.meta.env.VITE_CORE_SERVICE_URL || 'http://localhost:8080';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isAuthenticated = !!user?.isAuthenticated;

    const refreshUser = useCallback(async () => {
        const token = localStorage.getItem('esto_token');
        if (!token) {
            setUser(null);
            setLoading(false);
            return;
        }

        try {
            const data = await apiFetch<any>(`${CORE_SERVICE_URL}/api/v1/auth/me`, { suppressErrorToast: true });
            const userData = data.user || data.data || data;

            let metadata = {};
            if (userData.metadata) {
                try {
                    metadata = typeof userData.metadata === 'string' ? JSON.parse(userData.metadata) : userData.metadata;
                } catch (e) {
                    console.error('Failed to parse user metadata:', e);
                }
            }

            const userObj: User = {
                id: userData.id,
                email: userData.email,
                name: userData.first_name ? `${userData.first_name} ${userData.last_name || ''}`.trim() : userData.name || userData.email.split('@')[0],
                role: userData.role || 'user',
                isAuthenticated: true,
                avatar_url: userData.avatar_url || userData.avatar,
                avatar: userData.avatar || userData.avatar_url,
                phone: userData.phone,
                address: userData.address,
                postcode: userData.postcode,
                user_metadata: {
                    full_name: userData.first_name ? `${userData.first_name} ${userData.last_name || ''}`.trim() : userData.name,
                    phone: userData.phone,
                    ...metadata
                },
            };
            localStorage.setItem('esto_user', JSON.stringify(userObj));
            setUser(userObj);
        } catch (err) {
            // If token is invalid, sign out
            localStorage.removeItem('esto_token');
            localStorage.removeItem('esto_user');
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    // Check for existing session on mount
    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    useEffect(() => {
        const handleAuthExpired = () => {
            setUser(null);
            setLoading(false);
            setError('Your session has expired. Please log in again.');
        };

        window.addEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
        return () => window.removeEventListener(AUTH_EXPIRED_EVENT, handleAuthExpired);
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        setError(null);
        try {
            const data = await apiFetch<any>(
                `${CORE_SERVICE_URL}/api/v1/auth/login`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                    suppressErrorToast: true,
                }
            );

            if (!data) {
                return { success: false, error: 'Login failed' };
            }

            const token = data.token || data.data?.token;
            const userData = data.user || data.data?.user || { email };

            // Build name from first_name + last_name (backend field names)
            const firstName = userData.first_name || '';
            const lastName = userData.last_name || '';
            const fullName = `${firstName} ${lastName}`.trim() || userData.name || email.split('@')[0];

            let metadata = {};
            if (userData.metadata) {
                try {
                    metadata = typeof userData.metadata === 'string' ? JSON.parse(userData.metadata) : userData.metadata;
                } catch (e) { /* ignore */ }
            }

            const userObj: User = {
                id: userData.id || '',
                email: userData.email || email,
                name: fullName,
                role: userData.role || 'user',
                isAuthenticated: true,
                avatar_url: userData.avatar_url || userData.avatar,
                avatar: userData.avatar || userData.avatar_url,
                phone: userData.phone,
                address: userData.address,
                postcode: userData.postcode,
                user_metadata: {
                    full_name: fullName,
                    phone: userData.phone,
                    ...metadata,
                },
            };

            localStorage.setItem('esto_token', token);
            localStorage.setItem('esto_user', JSON.stringify(userObj));
            resetAuthExpiryState();
            setUser(userObj);

            // Refresh from /auth/me to get complete user data
            setTimeout(() => refreshUser(), 100);

            return { success: true, role: userObj.role };
        } catch (err: any) {
            const errMsg = getErrorMessage(err, 'Login failed. Please check your credentials.');
            setError(errMsg);
            return { success: false, error: errMsg };
        }
    }, [refreshUser]);

    const register = useCallback(async (
        name: string,
        email: string,
        password: string,
        role: string,
        termsAcceptance: { acceptedAt: string; version: string },
    ) => {
        setError(null);
        try {
            const nameParts = name.trim().split(' ');
            const first_name = nameParts[0] || 'Unknown';
            const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : first_name;

            const data = await apiFetch<any>(
                `${CORE_SERVICE_URL}/api/v1/auth/register`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        first_name,
                        last_name,
                        email,
                        password,
                        role,
                        accepted_terms: true,
                        accepted_terms_version: termsAcceptance.version,
                        accepted_terms_at: termsAcceptance.acceptedAt,
                    }),
                    suppressErrorToast: true,
                }
            );

            if (!data) {
                setError('Registration failed');
                return { success: false, error: 'Registration failed' };
            }

            const token = data.token || data.data?.token;
            const userData = data.user || data.data?.user || { email, name, role };

            const regFirstName = userData.first_name || first_name;
            const regLastName = userData.last_name || last_name;
            const fullName = `${regFirstName} ${regLastName}`.trim() || name;

            const userObj: User = {
                id: userData.id || '',
                email: userData.email || email,
                name: fullName,
                role: userData.role || role,
                isAuthenticated: true,
                phone: userData.phone,
                address: userData.address,
                postcode: userData.postcode,
                user_metadata: {
                    full_name: fullName,
                    phone: userData.phone,
                },
            };

            if (token) {
                localStorage.setItem('esto_token', token);
                localStorage.setItem('esto_user', JSON.stringify(userObj));
                resetAuthExpiryState();
                setUser(userObj);
            }

            return { success: true };
        } catch (err: any) {
            const errorMessage = getErrorMessage(err, 'Registration failed');
            setError(errorMessage);
            return { success: false, error: errorMessage };
        }
    }, []);

    const signOut = useCallback(() => {
        localStorage.removeItem('esto_token');
        localStorage.removeItem('esto_user');
        resetAuthExpiryState();
        setUser(null);
        setError(null);
    }, []);

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
            getRole,
            getDisplayName,
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


