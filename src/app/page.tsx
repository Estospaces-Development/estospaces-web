import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Header/Navbar */}
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">EstoSpaces</h1>
            <div className="flex gap-4">
              <Link href="/login" className="text-gray-600 hover:text-gray-900">
                Sign In
              </Link>
              <Link href="/register" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">
                Get Started
              </Link>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-16">
        <section className="text-center">
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            Find Your Perfect Space
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Discover and manage properties with EstoSpaces modern platform
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/search"
              className="bg-blue-600 text-white px-8 py-3 rounded-md text-lg hover:bg-blue-700"
            >
              Search Properties
            </Link>
            <Link
              href="/register"
              className="bg-gray-200 text-gray-800 px-8 py-3 rounded-md text-lg hover:bg-gray-300"
            >
              Get Started
            </Link>
          </div>
        </section>

        {/* Features Section */}
        <section className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="text-center p-6">
            <div className="text-4xl mb-4">🏠</div>
            <h3 className="text-2xl font-semibold mb-4">For Renters</h3>
            <p className="text-gray-600">Find and apply for your dream property</p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4">💼</div>
            <h3 className="text-2xl font-semibold mb-4">For Managers</h3>
            <p className="text-gray-600">Manage properties and clients efficiently</p>
          </div>
          <div className="text-center p-6">
            <div className="text-4xl mb-4">⚙️</div>
            <h3 className="text-2xl font-semibold mb-4">For Admins</h3>
            <p className="text-gray-600">Oversee platform operations</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white mt-16">
        <div className="container mx-auto px-6 py-8">
          <p className="text-center text-gray-400">© 2026 EstoSpaces. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
