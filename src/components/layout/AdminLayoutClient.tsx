"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdminHeader';

interface AdminLayoutClientProps {
    children: React.ReactNode;
    isSubdomain?: boolean;
}

export default function AdminLayoutClient({ children, isSubdomain = false }: AdminLayoutClientProps) {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const { user, loading, isAuthenticated } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading) {
            if (!isAuthenticated) {
                router.push('/login');
            } else if (user?.role !== 'admin') {
                router.push('/login'); // Or unauthorized page
            }
        }
    }, [isAuthenticated, loading, user, router]);

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    if (!isAuthenticated || user?.role !== 'admin') {
        return null; // Prevent flash of content
    }

    return (
        <ThemeProvider>
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
        </ThemeProvider>
    );
}
