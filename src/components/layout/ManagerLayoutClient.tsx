"use client";

import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { NotificationsProvider } from '../../contexts/NotificationsContext';
import { ManagerVerificationProvider } from '../../contexts/ManagerVerificationContext';
import { MessagesProvider } from '../../contexts/MessagesContext';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { PropertyProvider } from '../../contexts/PropertyContext';
import { LeadProvider } from '../../contexts/LeadContext';
import { getRedirectPath, shouldAwaitSessionResolution } from '@/lib/authUtils';

interface ManagerLayoutClientProps {
    children: React.ReactNode;
    isSubdomain?: boolean;
}

export default function ManagerLayoutClient({ children, isSubdomain = false }: ManagerLayoutClientProps) {
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        if (typeof window === 'undefined') {
            return true;
        }
        return window.matchMedia('(min-width: 1024px)').matches;
    });
    const { user, loading, isAuthenticated } = useAuth();
    const hasManagerAccess = user?.role === 'manager' || user?.role === 'broker';
    const shouldWaitForSession = shouldAwaitSessionResolution(loading, isAuthenticated);

    if (shouldWaitForSession) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (!hasManagerAccess) {
        return <Navigate to={getRedirectPath(user?.role || 'user')} replace />;
    }

    return (
        <ThemeProvider>
            <NotificationsProvider>
                <ManagerVerificationProvider>
                    <PropertyProvider scope="manager">
                        <LeadProvider>
                            <MessagesProvider>
                                <div className="min-h-screen bg-gray-50 dark:bg-black font-manager transition-colors duration-300">
                                    {sidebarOpen && (
                                        <button
                                            type="button"
                                            aria-label="Close navigation"
                                            className="fixed inset-0 z-40 bg-gray-950/40 backdrop-blur-sm lg:hidden"
                                            onClick={() => setSidebarOpen(false)}
                                        />
                                    )}
                                    <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} useSubdomain={isSubdomain} />
                                    <div className={`flex min-h-screen min-w-0 flex-col transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}>
                                        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
                                        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4 font-manager transition-colors duration-300 dark:bg-black sm:p-6 lg:p-8">
                                            <div className="mx-auto h-full w-full max-w-[1600px] min-w-0 animate-fadeIn">
                                                {children}
                                            </div>
                                        </main>
                                    </div>
                                </div>
                            </MessagesProvider>
                        </LeadProvider>
                    </PropertyProvider>
                </ManagerVerificationProvider>
            </NotificationsProvider>
        </ThemeProvider>
    );
}
