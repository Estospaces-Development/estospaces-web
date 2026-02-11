'use client';

import Image from 'next/image';
import React from 'react';

interface AuthLayoutProps {
    children: React.ReactNode;
}

export default function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="flex min-h-screen w-full overflow-hidden">
            {/* Left side - Image (hidden on mobile) */}
            <div className="hidden md:block w-0 md:w-1/2 min-h-screen relative">
                <Image
                    src="/images/auth/building.jpg"
                    alt="Estospaces"
                    fill
                    className="object-cover"
                    priority
                />
                <div className="absolute inset-0 bg-black/10"></div>
            </div>

            {/* Right side - Form */}
            <div className="w-full md:w-1/2 flex flex-col justify-center items-center px-6 py-12 md:px-16 bg-white dark:bg-gray-900 min-h-screen">
                <div className="w-full max-w-sm">
                    {children}
                </div>
            </div>
        </div>
    );
}
