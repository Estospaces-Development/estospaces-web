"use client";

import React, { Suspense } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import UserHeader from '../../components/layout/UserHeader';
import HorizontalNavigation from '../../components/layout/HorizontalNavigation';
import PublicHeader from '../../components/layout/PublicHeader';
import Footer from '../../components/layout/Footer';
import { useAuth } from '../../contexts/AuthContext';
import { LocationProvider } from '../../contexts/LocationContext';
import { PropertyProvider } from '../../contexts/PropertyContext';
import { PropertyFilterProvider } from '../../contexts/PropertyFilterContext';
import { MessagesProvider } from '../../contexts/MessagesContext';
import { NotificationsProvider } from '../../contexts/NotificationsContext';
import MessageInboxFab from '../../components/layout/MessageInboxFab';

import { ThemeProvider } from '../../contexts/ThemeContext';
import { getLoginPath, getRedirectPath, isPublicUserPropertyDetailPath, shouldAwaitSessionResolution } from '@/lib/authUtils';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';

interface UserLayoutClientProps {
    children: React.ReactNode;
    isSubdomain?: boolean;
}

export default function UserLayoutClient({ children, isSubdomain = false }: UserLayoutClientProps) {
    const { user, loading, isAuthenticated } = useAuth();
    const location = useLocation();
    const shouldWaitForSession = shouldAwaitSessionResolution(loading, isAuthenticated);
    const isPublicPropertyDetail = isPublicUserPropertyDetailPath(location.pathname);

    const publicPropertyDetailShell = (
        <div className="min-h-screen overflow-x-hidden bg-white">
            <PublicHeader />
            <main className="pt-[72px]">
                {children}
            </main>
            <Footer />
        </div>
    );

    if (shouldWaitForSession) {
        return <BrandLoadingScreen label="Opening your dashboard..." />;
    }

    if (!isAuthenticated) {
        if (isPublicPropertyDetail) {
            return publicPropertyDetailShell;
        }

        return <Navigate to={getLoginPath()} replace />;
    }

    if (user?.role !== 'user') {
        if (isPublicPropertyDetail) {
            return publicPropertyDetailShell;
        }

        return <Navigate to={getRedirectPath(user?.role || 'user')} replace />;
    }

    return (
        <ThemeProvider>
            <NotificationsProvider>
                <LocationProvider>
                    <PropertyProvider>
                        <Suspense fallback={null}>
                            <PropertyFilterProvider>
                                <MessagesProvider>
                                    <div className="flex min-h-screen min-w-0 flex-col overflow-x-hidden bg-gray-50 transition-colors duration-300" data-workspace-role="user">
                                        <UserHeader useSubdomain={isSubdomain} />
                                        <Suspense fallback={<div className="h-12 bg-white animate-pulse" />}>
                                            <HorizontalNavigation useSubdomain={isSubdomain} />
                                        </Suspense>
                                        <main
                                            className="role-workspace-content mobile-app-content min-w-0 flex-1 overflow-x-hidden bg-gray-50 pb-24 transition-colors duration-300 md:pb-0"
                                            data-mobile-scroll-root
                                        >
                                            <Suspense fallback={<BrandLoadingScreen variant="section" label="Loading this page..." />}>
                                                {children}
                                            </Suspense>
                                        </main>
                                        <MessageInboxFab />
                                    </div>
                                </MessagesProvider>
                            </PropertyFilterProvider>
                        </Suspense>
                    </PropertyProvider>
                </LocationProvider>
            </NotificationsProvider>
        </ThemeProvider>
    );
}
