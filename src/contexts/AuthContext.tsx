'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
    id: string;
    email: string;
    name: string;
    role: string;
    isAuthenticated: boolean;
    avatar_url?: string;
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
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (name: string, email: string, password: string, role: string) => Promise<{ success: boolean; error?: string }>;
    signOut: () => void;
    refreshUser: () => Promise<void>;
    getRole: () => string;
    getDisplayName: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { apiFetch } from '@/lib/apiUtils';

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
            const data = await apiFetch<any>(`${CORE_SERVICE_URL}/api/v1/auth/me`);
            const userData = data.user || data.data || data;
            const userObj: User = {
                id: userData.id,
                email: userData.email,
                name: userData.first_name ? `${userData.first_name} ${userData.last_name || ''}`.trim() : userData.name || userData.email.split('@')[0],
                role: userData.role || 'user',
                isAuthenticated: true,
                avatar_url: userData.avatar_url,
                phone: userData.phone,
                address: userData.address
            };
            localStorage.setItem('esto_user', JSON.stringify(userObj));
            setUser(userObj);
        } catch (err) {
            console.error('Failed to refresh user:', err);
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

    const login = useCallback(async (email: string, password: string) => {
        setError(null);
        try {
            const data = await apiFetch<any>(
                `${CORE_SERVICE_URL}/api/v1/auth/login`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                }
            );

            if (!data) {
                return { success: false, error: 'Login failed' };
            }

            const token = data.token || data.data?.token;
            const userData = data.user || data.data?.user || { email };

            const userObj: User = {
                id: userData.id || '',
                email: userData.email || email,
                name: userData.name || userData.full_name || email.split('@')[0],
                role: userData.role || 'user',
                isAuthenticated: true,
            };

            localStorage.setItem('esto_token', token);
            localStorage.setItem('esto_user', JSON.stringify(userObj));
            setUser(userObj);

            return { success: true };
        } catch (err: any) {
            console.error('Login error:', err);
            const errMsg = err.message || 'Login failed. Please check your credentials.';
            setError(errMsg);
            return { success: false, error: errMsg };
        }
    }, []);

    const register = useCallback(async (name: string, email: string, password: string, role: string) => {
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
                    body: JSON.stringify({ first_name, last_name, email, password, role }),
                }
            );

            if (!data) {
                setError('Registration failed');
                return { success: false, error: 'Registration failed' };
            }

            const token = data.token || data.data?.token;
            const userData = data.user || data.data?.user || { email, name, role };

            const userObj: User = {
                id: userData.id || '',
                email: userData.email || email,
                name: userData.name || name,
                role: userData.role || role,
                isAuthenticated: true,
            };

            if (token) {
                localStorage.setItem('esto_token', token);
                localStorage.setItem('esto_user', JSON.stringify(userObj));
                setUser(userObj);
            }

            return { success: true };
        } catch (err: any) {
            console.error('Registration error:', err);
            setError(err.message || 'Registration failed');
            return { success: false, error: err.message || 'Registration failed' };
        }
    }, []);

    const signOut = useCallback(() => {
        localStorage.removeItem('esto_token');
        localStorage.removeItem('esto_user');
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


