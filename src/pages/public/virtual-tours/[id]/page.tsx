import React, { useEffect, useState } from 'react';
import { Loader2, Video } from 'lucide-react';
import { useParams } from 'react-router-dom';

import ImmersiveVirtualTourViewer, { type PublicVirtualTour } from '@/components/virtual-tour/ImmersiveVirtualTourViewer';
import { getPublicVirtualTour } from '@/services/virtualTourService';

export default function PublicVirtualTourPage() {
    const { id } = useParams();
    const [tour, setTour] = useState<PublicVirtualTour | null>(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        setLoading(true);
        setError('');

        if (!id) {
            setTour(null);
            setError('Virtual tour link is missing.');
            setLoading(false);
            return () => {
                alive = false;
            };
        }

        getPublicVirtualTour(id).then((result) => {
            if (!alive) return;
            setTour(result.data);
            setError(result.error || '');
            setLoading(false);
        });

        return () => {
            alive = false;
        };
    }, [id]);

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
                <div className="flex items-center gap-3 rounded-full bg-white/10 px-5 py-4 text-sm font-black">
                    <Loader2 className="h-5 w-5 animate-spin text-orange-400" />
                    Loading Estospaces 360 tour...
                </div>
            </div>
        );
    }

    if (error || !tour) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-950 px-6 text-center text-white">
                <div>
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-300">
                        <Video />
                    </div>
                    <h1 className="text-2xl font-black">Tour unavailable</h1>
                    <p className="mt-3 max-w-md text-sm font-medium text-gray-400">
                        {error || 'This Estospaces virtual tour is not ready to view yet.'}
                    </p>
                </div>
            </div>
        );
    }

    return <ImmersiveVirtualTourViewer tour={tour} />;
}
