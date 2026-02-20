'use client';

const LoadingState = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] py-12">
            {/* Construction Site Illustration */}
            <div className="relative w-64 h-64 mb-8">
                <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-lg"></div>
                <div className="absolute top-4 left-8 w-2 h-32 bg-gray-400 rounded"></div>
                <div className="absolute top-4 left-6 w-6 h-2 bg-gray-500 rounded"></div>
                <div className="absolute bottom-8 left-12 w-16 h-16 bg-green-500 rounded shadow-lg"></div>
                <div className="absolute bottom-8 left-32 w-16 h-16 bg-blue-500 rounded shadow-lg"></div>
                <div className="absolute bottom-8 right-12 w-16 h-16 bg-purple-500 rounded shadow-lg"></div>
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gray-300 dark:bg-gray-700 rounded-b-lg"></div>
            </div>

            {/* Loading Text */}
            <div className="text-center">
                <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">Loading...</p>
                <div className="w-48 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
                <div className="flex gap-2 justify-center mt-4">
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
            </div>
        </div>
    );
};

export default LoadingState;
