"use client";

import React, { Suspense } from 'react';
import UserHeader from '../../components/layout/UserHeader';
import HorizontalNavigation from '../../components/layout/HorizontalNavigation';
import { LocationProvider } from '../../contexts/LocationContext';
import { PropertyProvider } from '../../contexts/PropertyContext';
import { PropertyFilterProvider } from '../../contexts/PropertyFilterContext';
import { MessagesProvider } from '../../contexts/MessagesContext';
import { NotificationsProvider } from '../../contexts/NotificationsContext';

interface UserLayoutProps {
  children: React.ReactNode;
}

export default function UserLayout({ children }: UserLayoutProps) {
  return (
    <NotificationsProvider>
      <LocationProvider>
        <PropertyProvider>
          <Suspense fallback={null}>
            <PropertyFilterProvider>
              <MessagesProvider>
                <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                  <UserHeader />
                  <Suspense fallback={<div className="h-12 bg-white animate-pulse" />}>
                    <HorizontalNavigation />
                  </Suspense>
                  <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-black transition-colors duration-300">
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
  );
}
