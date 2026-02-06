import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'EstoSpaces - Modern Property Management Platform',
  description: 'Find, manage, and rent properties with ease',
};

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      {/* Public Header/Navbar - TODO: Create PublicHeader component */}
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">EstoSpaces</h1>
            <div className="flex gap-4">
              <a href="/login" className="text-gray-600 hover:text-gray-900">Sign In</a>
              <a href="/register" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Get Started</a>
            </div>
          </div>
        </nav>
      </header>

      {/* Page Content */}
      <main>
        {children}
      </main>

      {/* Public Footer - TODO: Create PublicFooter component */}
      <footer className="bg-gray-900 text-white mt-16">
        <div className="container mx-auto px-6 py-8">
          <p className="text-center text-gray-400">© 2026 EstoSpaces. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
