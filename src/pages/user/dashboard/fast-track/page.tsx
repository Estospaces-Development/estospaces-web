'use client';

import FastTrackWorkspace from '@/components/fast-track/FastTrackWorkspace';

export default function UserFastTrackPage() {
    return (
        <div className="px-2.5 pb-8 pt-3 sm:px-5 sm:pb-10 sm:pt-7 lg:px-6">
            <FastTrackWorkspace role="user" />
        </div>
    );
}
