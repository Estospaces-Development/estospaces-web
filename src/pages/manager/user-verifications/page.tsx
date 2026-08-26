"use client";

import React, { Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import UserVerificationQueue from '@/components/verification/UserVerificationQueue';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';

export default function ManagerUserVerificationsPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const initialSelectedUserId = searchParams.get('user');

    return (
        <Suspense fallback={<BrandLoadingScreen variant="section" label="Loading verification requests..." />}>
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
