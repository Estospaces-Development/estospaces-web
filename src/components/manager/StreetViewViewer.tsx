import { useState } from 'react';
import { MapPin, AlertCircle, Loader2 } from 'lucide-react';

interface StreetViewViewerProps {
    streetViewUrl: string;
    address: string;
    latitude: number;
    longitude: number;
}

const StreetViewViewer = ({ streetViewUrl, address, latitude, longitude }: StreetViewViewerProps) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const handleIframeLoad = () => setIsLoading(false);
    const handleIframeError = () => { setIsLoading(false); setHasError(true); };

    if (!streetViewUrl) {
        return (
            <div className="relative w-full aspect-video bg-gray-100 dark:bg-zinc-900 rounded-xl overflow-hidden border border-gray-200 dark:border-zinc-800">
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 p-6">
                    <div className="w-16 h-16 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">Street View Unavailable</h3>
                    <p className="text-sm text-center max-w-xs">
                        Street view imagery is not available for this location. Please verify the address manually.
                    </p>
                    <div className="mt-4 px-4 py-2 bg-gray-200 dark:bg-zinc-800 rounded-lg flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4" />
                        <span className="truncate max-w-[250px]">{address}</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full aspect-video bg-gray-100 dark:bg-zinc-900 rounded-xl overflow-hidden shadow-lg border border-gray-200 dark:border-zinc-800">
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-zinc-900 z-10">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-3" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">Loading Street View...</p>
                </div>
            )}

            {hasError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 dark:bg-zinc-900 z-10 p-6">
                    <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Failed to Load</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        Could not load street view. Please check your connection and try again.
                    </p>
                </div>
            )}

            <iframe
                src={streetViewUrl}
                className={`w-full h-full border-0 ${isLoading ? 'invisible' : 'visible'}`}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title={`Street View - ${address}`}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
            />

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                <div className="flex items-center gap-2 text-white">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{address}</span>
                </div>
                <div className="text-xs text-white/70 mt-1 ml-6">
                    {latitude.toFixed(4)}°N, {longitude.toFixed(4)}°E
                </div>
            </div>
        </div>
    );
};

export default StreetViewViewer;
