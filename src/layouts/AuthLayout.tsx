import React from 'react';
import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
    return (
        <div className="flex min-h-screen w-full overflow-hidden bg-white dark:bg-gray-900">
            {/* Left side - Image (hidden on mobile) */}
            <div className="hidden md:block w-1/2 min-h-screen relative" aria-hidden="true">
                <img
                    src="/images/auth/building.jpg"
                    alt="Estospaces"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/10"></div>
            </div>

            {/* Right side - Form */}
            <div className="flex min-h-screen w-full flex-col items-center overflow-y-auto px-4 py-6 sm:px-6 sm:py-8 md:w-1/2 md:px-12 md:py-10 lg:px-16">
                <div className="w-full max-w-sm">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

