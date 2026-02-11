import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard - EstoSpaces',
  description: 'EstoSpaces Admin Dashboard for platform management',
};

import { PropertyProvider } from '@/contexts/PropertyContext';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PropertyProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Admin Sidebar - TODO: Create AdminSidebar component */}
        <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-md">
          <div className="p-4">
            <h2 className="text-xl font-bold text-gray-800">Admin Panel</h2>
          </div>
          {/* Navigation will be added here */}
        </aside>

        {/* Main Content Area */}
        <main className="ml-64 min-h-screen">
          {/* Admin Header - TODO: Create AdminHeader component */}
          <header className="bg-white shadow-sm">
            <div className="px-6 py-4">
              <h1 className="text-2xl font-semibold text-gray-800">Dashboard</h1>
            </div>
          </header>

          {/* Page Content */}
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </PropertyProvider>
  );
}
