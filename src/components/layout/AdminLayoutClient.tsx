"use client";

import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { NotificationsProvider } from '@/contexts/NotificationsContext';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';
import { getLoginPath, getRedirectPath, shouldAwaitSessionResolution } from '@/lib/authUtils';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';

interface AdminLayoutClientProps {
    children: React.ReactNode;
    isSubdomain?: boolean;
}

export default function AdminLayoutClient({ children, isSubdomain = false }: AdminLayoutClientProps) {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        if (typeof window === 'undefined') {
            return true;
        }
        return window.matchMedia('(min-width: 1024px)').matches;
    });
    const { user, loading, isAuthenticated } = useAuth();
    const shouldWaitForSession = shouldAwaitSessionResolution(loading, isAuthenticated);

    useEffect(() => {
        if (typeof window === 'undefined' || window.matchMedia('(min-width: 1024px)').matches) {
            return;
        }

        setSidebarOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!sidebarOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') {
                return;
            }

            event.preventDefault();
            setSidebarOpen(false);
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [sidebarOpen]);

    if (shouldWaitForSession) {
        return <BrandLoadingScreen label="Opening the admin workspace..." />;
    }

    if (!isAuthenticated) {
        return <Navigate to={getLoginPath()} replace />;
    }

    if (user?.role !== 'admin') {
        return <Navigate to={getRedirectPath(user?.role || 'user')} replace />;
    }

    return (
        <ThemeProvider>
            <NotificationsProvider>
                <div className="min-h-screen bg-gray-50 dark:bg-black transition-colors duration-300" data-workspace-role="admin">
                    {sidebarOpen && (
                        <button
                            type="button"
                            aria-label="Close admin navigation"
                            className="fixed inset-0 z-40 bg-gray-950/40 backdrop-blur-sm lg:hidden"
                            onClick={() => setSidebarOpen(false)}
                        />
                    )}
                    <AdminSidebar
                        isOpen={sidebarOpen}
                        onToggle={() => setSidebarOpen(!sidebarOpen)}
                        useSubdomain={isSubdomain}
                    />

                    <div className={`flex min-h-screen min-w-0 flex-col transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
                        <AdminHeader onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
                        <main className="role-workspace-content flex-1 overflow-x-hidden p-3 sm:p-6 lg:p-8">
                            <div className="mx-auto w-full max-w-[1600px] min-w-0">
                                {children}
                            </div>
                        </main>
                    </div>
                </div>
            </NotificationsProvider>
        </ThemeProvider>
    );
}

