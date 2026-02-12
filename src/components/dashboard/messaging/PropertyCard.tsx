import { useState } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, ExternalLink, Map, Square } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Dynamic imports for modals
const StreetViewModal = dynamic(() => import('@/components/ui/StreetViewModal'), { ssr: false });
const Tour360Modal = dynamic(() => import('@/components/ui/Tour360Modal'), { ssr: false });

interface PropertyData {
    propertyId?: string;
    propertyTitle?: string;
    propertyAddress?: string;
    propertyPrice?: number;
    propertyImage?: string;
    // Mock coordinates for demo
    latitude?: number;
    longitude?: number;
    tourUrl?: string;
}

interface MessagingPropertyCardProps {
    property: PropertyData | null;
}

const MessagingPropertyCard = ({ property }: MessagingPropertyCardProps) => {
    const router = useRouter();
    const [showStreetView, setShowStreetView] = useState(false);
    const [showTour, setShowTour] = useState(false);

    if (!property || !property.propertyId) {
        return null;
    }

    const formatPrice = (price?: number) => {
        if (!price) return 'Price on request';
        return `£${price.toLocaleString()}`;
    };

    const handleViewDetails = () => {
        if (property.propertyId) {
            router.push(`/user/dashboard/property/${property.propertyId}`);
        }
    };

    // Default coordinates (London) if not provided
    const location = {
        lat: property.latitude || 51.5074,
        lng: property.longitude || -0.1278
    };

    return (
        <>
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-4">
                <div className="flex gap-3">
                    {/* Property Image */}
                    {property.propertyImage && (
                        <div className="flex-shrink-0">
                            <img
                                src={property.propertyImage}
                                alt={property.propertyTitle || 'Property'}
                                className="w-20 h-20 rounded-lg object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=200';
                                }}
                            />
                        </div>
                    )}

                    {/* Property Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-1 truncate">
                            {property.propertyTitle || 'Property'}
                        </h3>
                        {property.propertyAddress && (
                            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400 mb-2">
                                <MapPin size={12} />
                                <span className="truncate">{property.propertyAddress}</span>
                            </div>
                        )}
                        {property.propertyPrice && (
                            <p className="text-sm font-bold text-orange-600 dark:text-orange-400 mb-2">
                                {formatPrice(property.propertyPrice)}
                            </p>
                        )}

                        <div className="flex items-center gap-2 mt-2">
                            <button
                                onClick={handleViewDetails}
                                className="flex items-center gap-1 text-xs font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors"
                            >
                                <span>View Details</span>
                                <ExternalLink size={12} />
                            </button>

                            <button
                                onClick={() => setShowStreetView(true)}
                                className="p-1.5 bg-white dark:bg-gray-800 rounded-lg text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-colors shadow-sm border border-gray-200 dark:border-gray-700"
                                title="Street View"
                            >
                                <Map size={14} />
                            </button>

                            <button
                                onClick={() => setShowTour(true)}
                                className="p-1.5 bg-white dark:bg-gray-800 rounded-lg text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-colors shadow-sm border border-gray-200 dark:border-gray-700"
                                title="360 Tour"
                            >
                                <Square size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {showStreetView && <StreetViewModal location={location} onClose={() => setShowStreetView(false)} />}
            {showTour && <Tour360Modal tourUrl={property.tourUrl} onClose={() => setShowTour(false)} />}
        </>
    );
};

export default MessagingPropertyCard;
