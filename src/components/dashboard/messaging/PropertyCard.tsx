import { useState, Suspense, lazy } from 'react';
import { MapPin, ExternalLink, Map, Square } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/placeholders';
import { VIRTUAL_TOUR_ENABLED } from '@/lib/launchFlags';
import { formatLaunchCurrencyForCountry } from '@/lib/launchLocale';
import { getVerifiedPropertyMapCoordinates } from '@/lib/mapCoordinates';

// Dynamic imports for modals
const StreetViewModal = lazy(() => import('@/components/ui/StreetViewModal'));
const Tour360Modal = lazy(() => import('@/components/ui/Tour360Modal'));

interface PropertyData {
    propertyId?: string;
    propertyTitle?: string;
    propertyAddress?: string;
    propertyPrice?: number;
    propertyCountry?: string;
    propertyCurrency?: string;
    propertyImage?: string;
    latitude?: number;
    longitude?: number;
    tourUrl?: string;
}

interface MessagingPropertyCardProps {
    property: PropertyData | null;
}

const MessagingPropertyCard = ({ property }: MessagingPropertyCardProps) => {
    const navigate = useNavigate();
    const [showStreetView, setShowStreetView] = useState(false);
    const [showTour, setShowTour] = useState(false);

    if (!property || !property.propertyId) {
        return null;
    }

    const formatPrice = (price?: number) => {
        if (!price) return 'Price on request';
        return formatLaunchCurrencyForCountry(price, {
            countryCode: property.propertyCountry,
            countryName: property.propertyCountry,
            currencyCode: property.propertyCurrency,
        });
    };

    const handleViewDetails = () => {
        if (property.propertyId) {
            navigate(`/user/properties/${property.propertyId}`);
        }
    };

    const verifiedCoordinates = getVerifiedPropertyMapCoordinates({
        latitude: property.latitude,
        longitude: property.longitude,
        country: property.propertyCountry,
        address: property.propertyAddress,
    });
    const location = verifiedCoordinates
        ? { lat: verifiedCoordinates.latitude, lng: verifiedCoordinates.longitude }
        : null;

    return (
        <>
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4 mb-4">
                <div className="flex gap-3">
                    {/* Property Image */}
                    {property.propertyImage && (
                        <div className="flex-shrink-0">
                            <img
                                src={property.propertyImage}
                                alt={property.propertyTitle || 'Property'}
                                className="w-20 h-20 rounded-lg object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = PROPERTY_PLACEHOLDER_IMAGE;
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

                            {location ? (
                                <button
                                    onClick={() => setShowStreetView(true)}
                                    className="p-1.5 bg-white dark:bg-gray-800 rounded-lg text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-colors shadow-sm"
                                    title="Street View"
                                    aria-label="Open Street View for this property"
                                >
                                    <Map size={14} />
                                </button>
                            ) : null}

                            {VIRTUAL_TOUR_ENABLED && (
                                <button
                                    onClick={() => setShowTour(true)}
                                    className="p-1.5 bg-white dark:bg-gray-800 rounded-lg text-gray-500 hover:text-orange-600 hover:bg-orange-50 transition-colors shadow-sm"
                                    title="360 Tour"
                                >
                                    <Square size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <Suspense fallback={null}>
                {showStreetView && location ? <StreetViewModal location={location} onClose={() => setShowStreetView(false)} /> : null}
                {VIRTUAL_TOUR_ENABLED && showTour && <Tour360Modal tourUrl={property.tourUrl} onClose={() => setShowTour(false)} />}
            </Suspense>
        </>
    );
};

export default MessagingPropertyCard;

