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
    const [sidebarOpen, setSidebarOpen] = useState(true);
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
                                    <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} useSubdomain={isSubdomain} />
                                    <div className={`flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
                                        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
                                        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 font-manager bg-gray-50 dark:bg-black transition-colors duration-300">
                                            <div className="mx-auto max-w-[1600px] w-full h-full animate-fadeIn">
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
