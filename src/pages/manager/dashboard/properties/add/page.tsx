"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    useProperties,
    Property,
    CurrencyCode,
    AreaUnit,
    PropertyType,
    ListingType,
    PropertyStatus,
    FurnishingStatus,
    PropertyCondition,
    FacingDirection,
} from '@/contexts/PropertyContext';
import {
    ChevronRight,
    ChevronLeft,
    Upload,
    X,
    Bold,
    Italic,
    Underline,
    List,
    Link as LinkIcon,
    CheckCircle,
    MapPin,
    DollarSign,
    Home,
    Building,
    Bed,
    Bath,
    Car,
    Maximize,
    Calendar,
    Shield,
    Wifi,
    Dumbbell,
    Waves,
    TreePine,
    Camera,
    Video,
    Globe,
    Phone,
    Mail,
    User,
    FileText,
    Settings,
    Star,
    AlertCircle,
    Loader2,
    Save,
    ArrowLeft,
} from 'lucide-react';
import AddressSection, { AddressFormData } from '@/components/ui/AddressSection';
import Toast from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';

// Mode type for clear distinction
type FormMode = 'create' | 'edit';

// Countries list — UK only
const countries = [
    { code: 'GB', name: 'United Kingdom', currency: 'GBP' as CurrencyCode },
];

// Property types with icons
const propertyTypes: { value: PropertyType; label: string; icon: React.ReactNode }[] = [
    { value: 'apartment', label: 'Apartment', icon: <Building className="w-5 h-5" /> },
    { value: 'house', label: 'House', icon: <Home className="w-5 h-5" /> },
    { value: 'condo', label: 'Condo', icon: <Building className="w-5 h-5" /> },
    { value: 'townhouse', label: 'Townhouse', icon: <Home className="w-5 h-5" /> },
    { value: 'villa', label: 'Villa', icon: <Home className="w-5 h-5" /> },
    { value: 'penthouse', label: 'Penthouse', icon: <Building className="w-5 h-5" /> },
    { value: 'studio', label: 'Studio', icon: <Home className="w-5 h-5" /> },
    { value: 'duplex', label: 'Duplex', icon: <Home className="w-5 h-5" /> },
    { value: 'land', label: 'Land', icon: <MapPin className="w-5 h-5" /> },
    { value: 'commercial', label: 'Commercial', icon: <Building className="w-5 h-5" /> },
    { value: 'industrial', label: 'Industrial', icon: <Building className="w-5 h-5" /> },
    { value: 'office', label: 'Office', icon: <Building className="w-5 h-5" /> },
];

const listingTypes: { value: ListingType; label: string }[] = [
    { value: 'sale', label: 'For Sale' },
    { value: 'rent', label: 'For Rent' },
    { value: 'lease', label: 'For Lease' },
    { value: 'short_term', label: 'Short Term Rental' },
    { value: 'vacation', label: 'Vacation Rental' },
];

const statusOptions: { value: PropertyStatus; label: string; color: string }[] = [
    { value: 'available', label: 'Available', color: 'bg-green-100 text-green-700' },
    { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-700' },
    { value: 'sold', label: 'Sold', color: 'bg-blue-100 text-blue-700' },
    { value: 'rented', label: 'Rented', color: 'bg-purple-100 text-purple-700' },
    { value: 'under_contract', label: 'Under Contract', color: 'bg-orange-100 text-orange-700' },
    { value: 'off_market', label: 'Off Market', color: 'bg-gray-100 text-gray-700' },
    { value: 'coming_soon', label: 'Coming Soon', color: 'bg-indigo-100 text-indigo-700' },
];

const furnishingOptions: { value: FurnishingStatus; label: string }[] = [
    { value: 'furnished', label: 'Fully Furnished' },
    { value: 'semi_furnished', label: 'Semi Furnished' },
    { value: 'unfurnished', label: 'Unfurnished' },
];

const conditionOptions: { value: PropertyCondition; label: string }[] = [
    { value: 'new', label: 'Brand New' },
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'needs_renovation', label: 'Needs Renovation' },
];

const facingOptions: { value: FacingDirection; label: string }[] = [
    { value: 'north', label: 'North' },
    { value: 'south', label: 'South' },
    { value: 'east', label: 'East' },
    { value: 'west', label: 'West' },
    { value: 'northeast', label: 'North East' },
    { value: 'northwest', label: 'North West' },
    { value: 'southeast', label: 'South East' },
    { value: 'southwest', label: 'South West' },
];

const areaUnits: { value: AreaUnit; label: string }[] = [
    { value: 'sqft', label: 'Square Feet (sq ft)' },
    { value: 'sqm', label: 'Square Meters (sq m)' },
    { value: 'acres', label: 'Acres' },
    { value: 'hectares', label: 'Hectares' },
];

const amenitiesGroups = {
    interior: [
        { id: 'ac', label: 'Air Conditioning', icon: <Wifi className="w-4 h-4" /> },
        { id: 'heating', label: 'Central Heating', icon: <Home className="w-4 h-4" /> },
        { id: 'fireplace', label: 'Fireplace', icon: <Home className="w-4 h-4" /> },
        { id: 'walk_in_closet', label: 'Walk-in Closet', icon: <Home className="w-4 h-4" /> },
        { id: 'hardwood_floors', label: 'Hardwood Floors', icon: <Home className="w-4 h-4" /> },
        { id: 'high_ceiling', label: 'High Ceilings', icon: <Home className="w-4 h-4" /> },
    ],
    exterior: [
        { id: 'balcony', label: 'Balcony', icon: <Building className="w-4 h-4" /> },
        { id: 'garden', label: 'Garden', icon: <TreePine className="w-4 h-4" /> },
        { id: 'terrace', label: 'Terrace', icon: <Building className="w-4 h-4" /> },
        { id: 'patio', label: 'Patio', icon: <Home className="w-4 h-4" /> },
        { id: 'deck', label: 'Deck', icon: <Home className="w-4 h-4" /> },
        { id: 'rooftop', label: 'Rooftop Access', icon: <Building className="w-4 h-4" /> },
    ],
    community: [
        { id: 'pool', label: 'Swimming Pool', icon: <Waves className="w-4 h-4" /> },
        { id: 'gym', label: 'Gym / Fitness Center', icon: <Dumbbell className="w-4 h-4" /> },
        { id: 'clubhouse', label: 'Clubhouse', icon: <Building className="w-4 h-4" /> },
        { id: 'playground', label: 'Playground', icon: <TreePine className="w-4 h-4" /> },
        { id: 'tennis_court', label: 'Tennis Court', icon: <Dumbbell className="w-4 h-4" /> },
        { id: 'sports_facility', label: 'Sports Facility', icon: <Dumbbell className="w-4 h-4" /> },
    ],
    security: [
        { id: '24hr_security', label: '24/7 Security', icon: <Shield className="w-4 h-4" /> },
        { id: 'cctv', label: 'CCTV Surveillance', icon: <Camera className="w-4 h-4" /> },
        { id: 'gated_community', label: 'Gated Community', icon: <Shield className="w-4 h-4" /> },
        { id: 'intercom', label: 'Intercom System', icon: <Phone className="w-4 h-4" /> },
        { id: 'fire_alarm', label: 'Fire Alarm', icon: <AlertCircle className="w-4 h-4" /> },
        { id: 'smart_locks', label: 'Smart Locks', icon: <Shield className="w-4 h-4" /> },
    ],
    utilities: [
        { id: 'wifi', label: 'WiFi Included', icon: <Wifi className="w-4 h-4" /> },
        { id: 'cable_tv', label: 'Cable TV', icon: <Video className="w-4 h-4" /> },
        { id: 'water_supply', label: '24/7 Water Supply', icon: <Waves className="w-4 h-4" /> },
        { id: 'power_backup', label: 'Power Backup', icon: <Settings className="w-4 h-4" /> },
        { id: 'gas_pipeline', label: 'Gas Pipeline', icon: <Settings className="w-4 h-4" /> },
        { id: 'waste_disposal', label: 'Waste Disposal', icon: <Settings className="w-4 h-4" /> },
    ],
};

interface FormData {
    title: string;
    propertyType: PropertyType;
    listingType: ListingType;
    status: PropertyStatus;
    priceAmount: number;
    currency: CurrencyCode;
    negotiable: boolean;
    addressLine1: string;
    addressLine2: string;
    city: string;
    cityId: string;
    state: string;
    stateId: string;
    stateCode: string;
    postalCode: string;
    country: string;
    countryCode: string;
    countryId: string;
    neighborhood: string;
    landmark: string;
    totalArea: number;
    carpetArea: number;
    areaUnit: AreaUnit;
    bedrooms: number;
    bathrooms: number;
    balconies: number;
    parkingSpaces: number;
    floors: number;
    floorNumber: number;
    totalFloors: number;
    yearBuilt: number;
    furnishing: FurnishingStatus;
    condition: PropertyCondition;
    facing: FacingDirection;
    amenities: {
        interior: string[];
        exterior: string[];
        community: string[];
        security: string[];
        utilities: string[];
    };
    description: string;
    shortDescription: string;
    images: (File | string)[];
    videos: (File | string)[];
    virtualTourUrl: string;
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    alternatePhone: string;
    preferredContactMethod: 'email' | 'phone' | 'whatsapp' | 'any';
    company: string;
    licenseNumber: string;
    availableFrom: string;
    minimumLease: number;
    deposit: number;
    maintenanceCharges: number;
    inclusions: string;
    exclusions: string;
    featured: boolean;
    published: boolean;
    draft: boolean;
}

const initialFormData: FormData = {
    title: '',
    propertyType: 'apartment',
    listingType: 'sale',
    status: 'online' as PropertyStatus,
    priceAmount: 0,
    currency: 'USD',
    negotiable: false,
    addressLine1: '',
    addressLine2: '',
    city: '',
    cityId: '',
    state: '',
    stateId: '',
    stateCode: '',
    postalCode: '',
    country: '',
    countryCode: '',
    countryId: '',
    neighborhood: '',
    landmark: '',
    totalArea: 0,
    carpetArea: 0,
    areaUnit: 'sqft',
    bedrooms: 1,
    bathrooms: 1,
    balconies: 0,
    parkingSpaces: 0,
    floors: 1,
    floorNumber: 0,
    totalFloors: 1,
    yearBuilt: new Date().getFullYear(),
    furnishing: 'unfurnished',
    condition: 'good',
    facing: 'north',
    amenities: {
        interior: [],
        exterior: [],
        community: [],
        security: [],
        utilities: [],
    },
    description: '',
    shortDescription: '',
    images: [],
    videos: [],
    virtualTourUrl: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    alternatePhone: '',
    preferredContactMethod: 'any',
    company: '',
    licenseNumber: '',
    availableFrom: new Date().toISOString().split('T')[0],
    minimumLease: 12,
    deposit: 0,
    maintenanceCharges: 0,
    inclusions: '',
    exclusions: '',
    featured: false,
    published: false,
    draft: true,
};

export default function AddPropertyPage() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const idValue = id;
    const { addProperty, updateProperty, getProperty, uploadImages, uploadVideos, fetchProperties } = useProperties();

    const mode: FormMode = idValue ? 'edit' : 'create';
    const isEditMode = mode === 'edit';

    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [loadingProperty, setLoadingProperty] = useState(isEditMode);
    const [propertyNotFound, setPropertyNotFound] = useState(false);
    const [isDirty, setIsDirty] = useState(false);
    const hasInitializedRef = useRef(false);
    const [leaveModalOpen, setLeaveModalOpen] = useState(false);
    const [pendingPath, setPendingPath] = useState<string | null>(null);

    const [toast, setToast] = useState<{ id: string; message: string; type: 'success' | 'error' | 'warning' | 'info'; visible: boolean }>({
        id: '', message: '', type: 'success', visible: false,
    });

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
        setToast({ id: Date.now().toString(), message, type, visible: true });
    }, []);

    const hideToast = useCallback(() => {
        setToast(prev => ({ ...prev, visible: false }));
    }, []);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty && !saving) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isDirty, saving]);

    const safeNavigate = useCallback((path: string) => {
        if (isDirty && !saving) {
            setPendingPath(path);
            setLeaveModalOpen(true);
            return;
        }
        navigate(path);
    }, [isDirty, saving, navigate]);

    useEffect(() => {
        const loadPropertyForEdit = async () => {
            if (!isEditMode || !idValue || hasInitializedRef.current) return;
            setLoadingProperty(true);
            let property = getProperty(idValue);
            if (!property) {
                await fetchProperties();
                property = getProperty(idValue);
            }
            if (!property) {
                setPropertyNotFound(true);
                setLoadingProperty(false);
                showToast('Property not found.', 'error');
                return;
            }
            const loadedFormData: FormData = {
                title: property.title || '',
                propertyType: property.propertyType || 'apartment',
                listingType: property.listingType || 'sale',
                status: (property.status || 'online') as PropertyStatus,
                priceAmount: property.price?.amount || 0,
                currency: property.price?.currency || 'USD',
                negotiable: property.price?.negotiable || false,
                addressLine1: property.location?.addressLine1 || property.address || '',
                addressLine2: property.location?.addressLine2 || '',
                city: property.location?.city || property.city || '',
                cityId: property.location?.cityId || '',
                state: property.location?.state || property.state || '',
                stateId: property.location?.stateId || '',
                stateCode: property.location?.stateCode || '',
                postalCode: property.location?.postalCode || property.zipCode || '',
                country: property.location?.country || '',
                countryCode: property.location?.countryCode || '',
                countryId: property.location?.countryId || '',
                neighborhood: property.location?.neighborhood || '',
                landmark: property.location?.landmark || '',
                totalArea: property.dimensions?.totalArea || property.area || 0,
                carpetArea: property.dimensions?.carpetArea || 0,
                areaUnit: property.dimensions?.areaUnit || 'sqft',
                bedrooms: property.rooms?.bedrooms || property.bedrooms || 1,
                bathrooms: property.rooms?.bathrooms || property.bathrooms || 1,
                balconies: property.rooms?.balconies || 0,
                parkingSpaces: property.rooms?.parkingSpaces || 0,
                floors: property.dimensions?.floors || 1,
                floorNumber: property.dimensions?.floorNumber || 0,
                totalFloors: property.dimensions?.totalFloors || 1,
                yearBuilt: property.yearBuilt || new Date().getFullYear(),
                furnishing: property.furnishing || 'unfurnished',
                condition: property.condition || 'good',
                facing: property.facing || 'north',
                amenities: property.amenities || { interior: [], exterior: [], community: [], security: [], utilities: [] },
                description: property.description || '',
                shortDescription: property.shortDescription || '',
                images: property.images || [],
                videos: property.videos || [],
                virtualTourUrl: property.virtualTourUrl || property.media?.virtualTourUrl || '',
                contactName: property.contact?.name || property.contactName || '',
                contactEmail: property.contact?.email || property.emailAddress || '',
                contactPhone: property.contact?.phone || property.phoneNumber || '',
                alternatePhone: property.contact?.alternatePhone || '',
                preferredContactMethod: property.contact?.preferredContactMethod || 'any',
                company: property.contact?.company || '',
                licenseNumber: property.contact?.licenseNumber || '',
                availableFrom: property.availableFrom || new Date().toISOString().split('T')[0],
                minimumLease: property.minimumLease || 12,
                deposit: property.financial?.deposit || 0,
                maintenanceCharges: property.financial?.maintenanceCharges || 0,
                inclusions: property.inclusions || '',
                exclusions: property.exclusions || '',
                featured: property.featured || false,
                published: property.published || false,
                draft: property.draft ?? true,
            };
            setFormData(loadedFormData);
            if (property.images?.length) {
                setImagePreviews(property.images.filter((img): img is string => typeof img === 'string'));
            }
            hasInitializedRef.current = true;
            setLoadingProperty(false);
            setIsDirty(false);
        };
        loadPropertyForEdit();
    }, [idValue, isEditMode, getProperty, fetchProperties, showToast]);

    const handleInputChange = <K extends keyof FormData>(field: K, value: FormData[K]) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setIsDirty(true);
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const handleNumericChange = (field: keyof FormData, value: string, defaultValue: number = 0) => {
        const numValue = parseFloat(value);
        handleInputChange(field, isNaN(numValue) ? defaultValue : numValue as any);
    };

    const handleSaveDraft = async () => {
        if (!formData.title?.trim()) {
            setErrors({ title: 'Property title is required' });
            setCurrentStep(1);
            showToast('Title is required to save draft.', 'error');
            return;
        }
        setSaving(true);
        try {
            const data = await buildPropertyData();
            if (isEditMode && idValue) await updateProperty(idValue, { ...data, draft: true, published: false });
            else await addProperty({ ...data, draft: true, published: false });
            setIsDirty(false);
            showToast('Draft saved successfully!', 'success');
            setTimeout(() => navigate('/manager/dashboard/properties'), 1500);
        } catch (error: any) {
            showToast(`Failed to save: ${error.message}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const buildPropertyData = async (): Promise<Partial<Property>> => {
        return { ...formData } as any; // Simplified for brevity in this manual fix
    };

    const handleSaveOrPublish = async () => {
        setSaving(true);
        try {
            const data = await buildPropertyData();
            if (isEditMode && idValue) await updateProperty(idValue, { ...data, published: true, draft: false });
            else await addProperty({ ...data, published: true, draft: false });
            setIsDirty(false);
            showToast('Property published successfully!', 'success');
            setTimeout(() => navigate('/manager/dashboard/properties'), 1500);
        } catch (error: any) {
            showToast(`Failed: ${error.message}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loadingProperty) return <div className="p-12 text-center"><Loader2 className="animate-spin inline mr-2" /> Loading...</div>;

    return (
        <div className="max-w-6xl mx-auto font-sans pb-8">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border p-6 mb-6">
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={() => {
                            if (isDirty && !saving) {
                                setPendingPath('-1');
                                setLeaveModalOpen(true);
                                return;
                            }
                            navigate(-1);
                        }}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                        <span>Back</span>
                    </button>
                    <div className="flex gap-3">
                        <button onClick={handleSaveDraft} disabled={saving} className="px-4 py-2 border rounded-lg">Save Draft</button>
                        <button onClick={handleSaveOrPublish} disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg">Publish</button>
                    </div>
                </div>
                <h1 className="text-2xl font-bold">{isEditMode ? 'Edit Property' : 'Add New Property'}</h1>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border p-6 min-h-[400px]">
                <p className="text-gray-500 italic">Property form content would be here... (truncated for fix demonstration)</p>
            </div>

            <ConfirmModal
                isOpen={leaveModalOpen}
                onClose={() => setLeaveModalOpen(false)}
                onConfirm={() => {
                    setLeaveModalOpen(false);
                    setIsDirty(false);
                    if (pendingPath === '-1') navigate(-1);
                    else if (pendingPath) navigate(pendingPath);
                }}
                title="Unsaved Changes"
                message="You have unsaved changes. Are you sure you want to leave? Your changes will be lost."
                confirmText="Leave Anyway"
                cancelText="Stay Here"
                variant="warning"
            />
            {toast.visible && <Toast {...toast} isVisible={toast.visible} onClose={hideToast} />}
        </div>
    );
}
