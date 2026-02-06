import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EstoSpaces - Find Your Perfect Property',
  description: 'Search and discover properties, manage bookings, and applications',
};

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* User Sidebar - TODO: Create UserSidebar component */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white shadow-md">
        <div className="p-4">
          <h2 className="text-xl font-bold text-gray-800">EstoSpaces</h2>
        </div>
        {/* Navigation will be added here */}
      </aside>

      {/* Main Content Area */}
      <main className="ml-64 min-h-screen">
        {/* User Header - TODO: Create UserHeader component */}
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
  );
}
