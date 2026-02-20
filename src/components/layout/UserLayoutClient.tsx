"use client";

import React, { Suspense } from 'react';
import UserHeader from '../../components/layout/UserHeader';
import HorizontalNavigation from '../../components/layout/HorizontalNavigation';
import { LocationProvider } from '../../contexts/LocationContext';
import { PropertyProvider } from '../../contexts/PropertyContext';
import { PropertyFilterProvider } from '../../contexts/PropertyFilterContext';
import { MessagesProvider } from '../../contexts/MessagesContext';
import { NotificationsProvider } from '../../contexts/NotificationsContext';

import { ThemeProvider } from '../../contexts/ThemeContext';

interface UserLayoutClientProps {
    children: React.ReactNode;
    isSubdomain?: boolean;
}

export default function UserLayoutClient({ children, isSubdomain = false }: UserLayoutClientProps) {
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
                                        {/* Lakshmi AI Assistant - Could be added here globally or per page */}
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
