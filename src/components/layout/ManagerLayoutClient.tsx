"use client";

import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { NotificationsProvider } from '../../contexts/NotificationsContext';
import { ManagerVerificationProvider, useManagerVerification } from '../../contexts/ManagerVerificationContext';
import { MessagesProvider } from '../../contexts/MessagesContext';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { PropertyProvider } from '../../contexts/PropertyContext';
import { LeadProvider } from '../../contexts/LeadContext';
import { getLoginPath, getRedirectPath, shouldAwaitSessionResolution } from '@/lib/authUtils';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';
import RoleMobileNavigation from './RoleMobileNavigation';

interface ManagerLayoutClientProps {
    children: React.ReactNode;
    isSubdomain?: boolean;
}

function ManagerOperationalProviders({ children }: { children: React.ReactNode }) {
    const { isLoading, isVerified } = useManagerVerification();
    const operationalDataEnabled = !isLoading && isVerified;

    return (
        <PropertyProvider scope="manager" enabled={operationalDataEnabled}>
            <LeadProvider enabled={operationalDataEnabled}>
                <MessagesProvider>{children}</MessagesProvider>
            </LeadProvider>
        </PropertyProvider>
    );
}

export default function ManagerLayoutClient({ children, isSubdomain = false }: ManagerLayoutClientProps) {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(() => {
        if (typeof window === 'undefined') {
            return true;
        }
        return window.matchMedia('(min-width: 1024px)').matches;
    });
    const { user, loading, isAuthenticated } = useAuth();
    const hasManagerAccess = user?.role === 'manager' || user?.role === 'broker';
    const shouldWaitForSession = shouldAwaitSessionResolution(loading, isAuthenticated);

    useEffect(() => {
        if (typeof window === 'undefined' || window.matchMedia('(min-width: 1024px)').matches) {
            return;
        }

        setSidebarOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (typeof document === 'undefined') {
            return;
        }

        const root = document.documentElement;
        root.style.setProperty('--workspace-sidebar-offset', sidebarOpen ? '16rem' : '5rem');
        root.style.setProperty('--workspace-header-height', '4rem');

        return () => {
            root.style.removeProperty('--workspace-sidebar-offset');
            root.style.removeProperty('--workspace-header-height');
        };
    }, [sidebarOpen]);

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
        return <BrandLoadingScreen label="Opening the manager workspace..." />;
    }

    if (!isAuthenticated) {
        return <Navigate to={getLoginPath()} replace />;
    }

    if (!hasManagerAccess) {
        return <Navigate to={getRedirectPath(user?.role || 'user')} replace />;
    }

    return (
        <ThemeProvider>
            <NotificationsProvider>
                <ManagerVerificationProvider>
                    <ManagerOperationalProviders>
                                <div className="min-h-screen bg-gray-50 dark:bg-black font-manager transition-colors duration-300" data-workspace-role="manager">
                                    {sidebarOpen && (
                                        <button
                                            type="button"
                                            aria-label="Close navigation"
                                            className="fixed inset-0 z-40 bg-gray-950/40 backdrop-blur-sm lg:hidden"
                                            onClick={() => setSidebarOpen(false)}
                                        />
                                    )}
                                    <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} useSubdomain={isSubdomain} />
                                    <div
                                        className={`flex min-h-screen min-w-0 flex-col transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'}`}
                                        style={{
                                            '--workspace-sidebar-offset': sidebarOpen ? '16rem' : '5rem',
                                            '--workspace-header-height': '4rem',
                                        } as React.CSSProperties}
                                    >
                                        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
                                        <main
                                            className="role-workspace-content mobile-app-content flex-1 overflow-x-hidden bg-gray-50 p-3 pb-24 font-manager transition-colors duration-300 dark:bg-black sm:p-6 sm:pb-24 lg:p-8"
                                            data-mobile-scroll-root
                                        >
                                            <div className="mx-auto h-full w-full max-w-[1600px] min-w-0 animate-fadeIn">
                                                {children}
                                            </div>
                                        </main>
                                        <RoleMobileNavigation role="manager" onOpenMore={() => setSidebarOpen(true)} />
                                    </div>
                                </div>
                    </ManagerOperationalProviders>
                </ManagerVerificationProvider>
            </NotificationsProvider>
        </ThemeProvider>
    );
}
