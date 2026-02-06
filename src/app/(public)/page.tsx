export default function HomePage() {
  return (
    <div className="container mx-auto px-6 py-16">
      <section className="text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-6">
          Find Your Perfect Space
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Discover and manage properties with EstoSpaces modern platform
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/search"
            className="bg-blue-600 text-white px-8 py-3 rounded-md text-lg hover:bg-blue-700"
          >
            Search Properties
          </a>
          <a
            href="/register"
            className="bg-gray-200 text-gray-800 px-8 py-3 rounded-md text-lg hover:bg-gray-300"
          >
            Get Started
          </a>
        </div>
      </section>

      <section className="mt-16 grid md:grid-cols-3 gap-8">
        <div className="text-center">
          <h3 className="text-2xl font-semibold mb-4">For Renters</h3>
          <p className="text-gray-600">Find and apply for your dream property</p>
        </div>
        <div className="text-center">
          <h3 className="text-2xl font-semibold mb-4">For Managers</h3>
          <p className="text-gray-600">Manage properties and clients efficiently</p>
        </div>
        <div className="text-center">
          <h3 className="text-2xl font-semibold mb-4">For Admins</h3>
          <p className="text-gray-600">Oversee platform operations</p>
        </div>
      </section>
    </div>
  );
}
