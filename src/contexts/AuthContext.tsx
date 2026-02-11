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

const CORE_SERVICE_URL = 'http://localhost:8080';

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
            const response = await fetch(`${CORE_SERVICE_URL}/api/v1/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                // If backend rejects the credentials (e.g. users not seeded),
                // fall back to mock login for demo purposes
                console.warn('Backend login failed, trying mock login fallback');
                return tryMockLogin(email, password);
            }

            // Store token and user info
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
            // If backend is down, try mock login for demo purposes
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
            const response = await fetch(`${CORE_SERVICE_URL}/api/v1/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password, role }),
            });

            const data = await response.json();

            if (!response.ok) {
                const errMsg = data.error || data.message || 'Registration failed';
                setError(errMsg);
                return { success: false, error: errMsg };
            }

            // Auto-login after registration
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

export function getRedirectPath(role: string): string {
    switch (role) {
        case 'admin':
            return '/admin/verifications';
        case 'manager':
            return '/manager/dashboard';
        default:
            return '/dashboard';
    }
}
