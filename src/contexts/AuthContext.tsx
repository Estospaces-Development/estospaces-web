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
    getRole: () => string;
    getDisplayName: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

import { silentFetch } from '@/lib/apiUtils';

const CORE_SERVICE_URL = import.meta.env.VITE_CORE_SERVICE_URL || 'http://localhost:8080';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const isAuthenticated = !!user?.isAuthenticated;

    // Check for existing session on mount
    useEffect(() => {
        const stored = localStorage.getItem('esto_user');
        const token = localStorage.getItem('esto_token');
        if (stored && token) {
            try {
                const parsed = JSON.parse(stored);
                setUser({ ...parsed, isAuthenticated: true });
            } catch {
                localStorage.removeItem('esto_user');
                localStorage.removeItem('esto_token');
            }
        }
        setLoading(false);
    }, []);

    const login = useCallback(async (email: string, password: string) => {
        setError(null);
        try {
            const result = await silentFetch<any>(
                `${CORE_SERVICE_URL}/api/v1/auth/login`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password }),
                },
                null,
                'AuthContext'
            );

            if (!result.data || result.error) {
                console.warn('Backend login failed, trying mock login fallback');
                return tryMockLogin(email, password);
            }

            const data = result.data;
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
        } catch (err) {
            console.warn('Backend unavailable, using mock login:', err);
            return tryMockLogin(email, password);
        }
    }, []);

    const tryMockLogin = (email: string, password: string) => {
        const MOCK_USERS: Record<string, { password: string; role: string; name: string }> = {
            'manager@gmail.com': { password: 'Estospaces@123', role: 'manager', name: 'Manager User' },
            'manager@estospaces.com': { password: 'Estospaces@123', role: 'manager', name: 'Manager User' },
            'user@gmail.com': { password: 'Estospaces@123', role: 'user', name: 'Demo User' },
            'user@estospaces.com': { password: 'Estospaces@123', role: 'user', name: 'Demo User' },
            'admin@estospaces.com': { password: 'Estospaces@123', role: 'admin', name: 'Admin User' },
        };

        const mockUser = MOCK_USERS[email.toLowerCase()];
        if (!mockUser) {
            return { success: false, error: 'Invalid email. Try manager@gmail.com or user@gmail.com for demo.' };
        }
        if (password !== mockUser.password) {
            return { success: false, error: 'Invalid password. Use Estospaces@123 for demo.' };
        }

        const userObj: User = {
            id: 'mock-' + Date.now(),
            email: email.toLowerCase(),
            name: mockUser.name,
            role: mockUser.role,
            isAuthenticated: true,
        };

        localStorage.setItem('esto_token', 'mock-token-' + Date.now());
        localStorage.setItem('esto_user', JSON.stringify(userObj));
        setUser(userObj);

        return { success: true };
    };

    const register = useCallback(async (name: string, email: string, password: string, role: string) => {
        setError(null);
        try {
            const nameParts = name.trim().split(' ');
            const first_name = nameParts[0] || 'Unknown';
            const last_name = nameParts.length > 1 ? nameParts.slice(1).join(' ') : first_name;

            const result = await silentFetch<any>(
                `${CORE_SERVICE_URL}/api/v1/auth/register`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ first_name, last_name, email, password, role }),
                },
                null,
                'AuthContext'
            );

            if (!result.data || result.error) {
                const errMsg = result.error || 'Registration failed';
                setError(errMsg);
                return { success: false, error: errMsg };
            }

            const data = result.data;
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
        } catch (err) {
            console.warn('Backend unavailable for registration:', err);
            return { success: false, error: 'Backend service unavailable. Please ensure the core service is running on port 8080.' };
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


