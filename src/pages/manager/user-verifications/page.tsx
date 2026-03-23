"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import UserVerificationQueue from '@/components/verification/UserVerificationQueue';

export default function ManagerUserVerificationsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialSelectedUserId = searchParams.get('user');

    return (
        <Suspense fallback={
            <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center font-bold">
                Loading...
            </div>
        }>
            <UserVerificationQueue
                scope="manager"
                initialSelectedUserId={initialSelectedUserId}
                onSelectionCleared={() => {
                    if (!initialSelectedUserId) {
                        return;
                    }

                    setSearchParams((previous) => {
                        const next = new URLSearchParams(previous);
                        next.delete('user');
                        return next;
                    });
                }}
            />
        </Suspense>
    );
}
