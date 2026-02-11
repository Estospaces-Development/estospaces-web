"use client";

import { useState } from 'react';
import { ThemeProvider } from '../../contexts/ThemeContext';
import { NotificationsProvider } from '../../contexts/NotificationsContext';
import { ManagerVerificationProvider } from '../../contexts/ManagerVerificationContext';
import { ToastProvider } from '../../contexts/ToastContext';
import NotificationContainer from '../../components/ui/NotificationContainer';
import Sidebar from '../../components/layout/Sidebar';
import Header from '../../components/layout/Header';
import { PropertyProvider } from '../../contexts/PropertyContext';
import { LeadProvider } from '../../contexts/LeadContext';

interface ManagerLayoutProps {
  children: React.ReactNode;
}

export default function ManagerLayout({ children }: ManagerLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <ThemeProvider>
      <NotificationsProvider>
        <ManagerVerificationProvider>
          <PropertyProvider>
            <LeadProvider>
              <div className="min-h-screen bg-gray-50 dark:bg-black font-manager transition-colors duration-300">
                <NotificationContainer />
                <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
                <div className={`flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>
                  <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />
                  <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 font-manager bg-gray-50 dark:bg-black transition-colors duration-300">
                    <div className="mx-auto max-w-[1600px] w-full h-full animate-fadeIn">
                      {children}
                    </div>
                  </main>
                </div>
              </div>
            </LeadProvider>
          </PropertyProvider>
        </ManagerVerificationProvider>
      </NotificationsProvider>
    </ThemeProvider>
  );
}
