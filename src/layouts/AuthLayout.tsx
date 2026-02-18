import React from 'react';
import { Outlet } from 'react-router-dom';

export default function AuthLayout() {
    return (
        <div className="flex min-h-screen w-full overflow-hidden">
            {/* Left side - Image (hidden on mobile) */}
            <div className="hidden md:block w-1/2 min-h-screen relative">
                <img
                    src="/images/auth/building.jpg"
                    alt="Estospaces"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/10"></div>
            </div>

            {/* Right side - Form */}
            <div className="w-full md:w-1/2 flex flex-col justify-center items-center px-6 py-12 md:px-16 bg-white dark:bg-gray-900 min-h-screen">
                <div className="w-full max-w-sm">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}

