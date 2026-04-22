"use client";

import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { getRedirectPath, shouldAwaitSessionResolution } from '@/lib/authUtils';

interface AdminLayoutClientProps {
    children: React.ReactNode;
    isSubdomain?: boolean;
}

export default function AdminLayoutClient({ children, isSubdomain = false }: AdminLayoutClientProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const { user, loading, isAuthenticated } = useAuth();
    const shouldWaitForSession = shouldAwaitSessionResolution(loading, isAuthenticated);

    if (shouldWaitForSession) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (user?.role !== 'admin') {
        return <Navigate to={getRedirectPath(user?.role || 'user')} replace />;
    }

    return (
        <ThemeProvider>
            <NotificationsProvider>
                <div className="min-h-screen bg-gray-50 dark:bg-black flex transition-colors duration-300">
                    <AdminSidebar
                        isOpen={sidebarOpen}
                        onToggle={() => setSidebarOpen(!sidebarOpen)}
                        useSubdomain={isSubdomain}
                    />

                    <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
                        <AdminHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
                        <main className="flex-1 p-6">
                            {children}
                        </main>
                    </div>
                </div>
            </NotificationsProvider>
        </ThemeProvider>
    );
}

