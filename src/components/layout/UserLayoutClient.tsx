"use client";

import React, { Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import UserHeader from '../../components/layout/UserHeader';
import HorizontalNavigation from '../../components/layout/HorizontalNavigation';
import { useAuth } from '../../contexts/AuthContext';
import { LocationProvider } from '../../contexts/LocationContext';
import { PropertyProvider } from '../../contexts/PropertyContext';
import { PropertyFilterProvider } from '../../contexts/PropertyFilterContext';
import { MessagesProvider } from '../../contexts/MessagesContext';
import { NotificationsProvider } from '../../contexts/NotificationsContext';
import MessageInboxFab from '../../components/layout/MessageInboxFab';

import { ThemeProvider } from '../../contexts/ThemeContext';
import { getRedirectPath, shouldAwaitSessionResolution } from '@/lib/authUtils';

interface UserLayoutClientProps {
    children: React.ReactNode;
    isSubdomain?: boolean;
}

export default function UserLayoutClient({ children, isSubdomain = false }: UserLayoutClientProps) {
    const { user, loading, isAuthenticated } = useAuth();
    const shouldWaitForSession = shouldAwaitSessionResolution(loading, isAuthenticated);

    if (shouldWaitForSession) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (user?.role !== 'user') {
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
                                    <div className="flex flex-col min-h-screen bg-gray-50 transition-colors duration-300">
                                        <UserHeader useSubdomain={isSubdomain} />
                                        <Suspense fallback={<div className="h-12 bg-white animate-pulse" />}>
                                            <HorizontalNavigation useSubdomain={isSubdomain} />
                                        </Suspense>
                                        <main className="flex-1 overflow-y-auto bg-gray-50 transition-colors duration-300">
                                            <Suspense fallback={<div className="h-full w-full flex items-center justify-center min-h-[50vh]">Loading...</div>}>
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
