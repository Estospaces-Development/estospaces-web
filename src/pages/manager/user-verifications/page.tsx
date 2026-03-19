"use client";

import React, { Suspense } from 'react';
import UserVerificationQueue from '@/components/verification/UserVerificationQueue';

export default function ManagerUserVerificationsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center font-bold">
                Loading...
            </div>
        }>
            <UserVerificationQueue scope="manager" />
        </Suspense>
    );
}
