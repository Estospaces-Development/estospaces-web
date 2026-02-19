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

// Amenities grouped by category
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
    // Basic Info
    title: string;
    propertyType: PropertyType;
    listingType: ListingType;
    status: PropertyStatus;

    // Price
    priceAmount: number;
    currency: CurrencyCode;
    negotiable: boolean;

    // Location
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

    // Property Details
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

    // Features
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

    // Description
    description: string;
    shortDescription: string;

    // Media
    images: (File | string)[];
    videos: (File | string)[];
    virtualTourUrl: string;

    // Contact
    contactName: string;
    contactEmail: string;
    contactPhone: string;
    alternatePhone: string;
    preferredContactMethod: 'email' | 'phone' | 'whatsapp' | 'any';
    company: string;
    licenseNumber: string;

    // Availability & Terms
    availableFrom: string;
    minimumLease: number;
    deposit: number;
    maintenanceCharges: number;
    inclusions: string;
    exclusions: string;

    // Settings
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
    const { addProperty, updateProperty, getProperty, formatPrice, formatArea, uploadImages, uploadVideos, fetchProperties, loading: contextLoading } = useProperties();

    // Determine mode based on presence of ID
    const mode: FormMode = idValue ? 'edit' : 'create';
    const isEditMode = mode === 'edit';

    const [currentStep, setCurrentStep] = useState(1);
    const [formData, setFormData] = useState<FormData>(initialFormData);
    const [originalFormData, setOriginalFormData] = useState<FormData | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);
    const [videoPreviews, setVideoPreviews] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [loadingProperty, setLoadingProperty] = useState(isEditMode);
    const [propertyNotFound, setPropertyNotFound] = useState(false);

    // Track dirty state (has form been modified)
    const [isDirty, setIsDirty] = useState(false);
    const hasInitializedRef = useRef(false);

    // Toast state
    const [toast, setToast] = useState<{ id: string; message: string; type: 'success' | 'error' | 'warning' | 'info'; visible: boolean }>({
        id: '',
        message: '',
        type: 'success',
        visible: false,
    });

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
        setToast({ id: Date.now().toString(), message, type, visible: true });
    }, []);

    const hideToast = useCallback(() => {
        setToast(prev => ({ ...prev, visible: false }));
    }, []);

    // Unsaved changes warning - uses beforeunload event for browser navigation
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (isDirty && !saving) {
                e.preventDefault();
                // Modern browsers require returnValue to be set
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [isDirty, saving]);

    // Custom navigation wrapper that warns about unsaved changes
    const safeNavigate = useCallback((path: string) => {
        if (isDirty && !saving) {
            const confirmLeave = window.confirm(
                'You have unsaved changes. Are you sure you want to leave? Your changes will be lost.'
            );
            if (!confirmLeave) {
                return;
            }
        }
        navigate(path);
    }, [isDirty, saving, navigate]);

    // Load existing property for edit mode
    useEffect(() => {
        const loadPropertyForEdit = async () => {
            if (!isEditMode || !idValue || hasInitializedRef.current) return;

            setLoadingProperty(true);
            setPropertyNotFound(false);

            // Try to get property from context first
            let property = getProperty(idValue);

            // If not found in context, try fetching fresh data
            if (!property) {
                await fetchProperties();
                property = getProperty(idValue);
            }

            if (!property) {
                setPropertyNotFound(true);
                setLoadingProperty(false);
                showToast('Property not found. Please go back and try again.', 'error');
                return;
            }

            // Map property to form data using helper/logic as seen in demo app...
            // [Will implement mapping here]

            // Using placeholder logic to init form data for now, actual mapping needs to be identical to demo
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
                amenities: property.amenities || {
                    interior: [],
                    exterior: [],
                    community: [],
                    security: [],
                    utilities: [],
                },

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
            setOriginalFormData(loadedFormData); // Store original for dirty comparison

            // Load image previews
            if (property.images?.length) {
                const previews = property.images.filter((img): img is string => typeof img === 'string');
                setImagePreviews(previews);
            }

            hasInitializedRef.current = true;
            setLoadingProperty(false);
            setIsDirty(false); // Reset dirty state after loading
        };

        loadPropertyForEdit();
    }, [idValue, isEditMode, getProperty, fetchProperties, showToast]);

    const steps = [
        { number: 1, title: 'Basic Info', icon: <Home className="w-5 h-5" /> },
        { number: 2, title: 'Location', icon: <MapPin className="w-5 h-5" /> },
        { number: 3, title: 'Property Details', icon: <Settings className="w-5 h-5" /> },
        { number: 4, title: 'Media & Features', icon: <Camera className="w-5 h-5" /> },
        { number: 5, title: 'Contact & Publish', icon: <FileText className="w-5 h-5" /> },
    ];

    const validateStep = (step: number): boolean => {
        const newErrors: Record<string, string> = {};

        if (step === 1) {
            if (!formData.title?.trim()) newErrors.title = 'Property title is required';
            if (formData.priceAmount <= 0) newErrors.priceAmount = 'Price is required';
        } else if (step === 2) {
            if (!formData.addressLine1?.trim()) newErrors.addressLine1 = 'Street address is required';
            if (!formData.countryId) newErrors.country = 'Country is required';
            if (!formData.stateId && !formData.state?.trim()) newErrors.state = 'State/Province is required';
            if (!formData.cityId && !formData.city?.trim()) newErrors.city = 'City is required';
            if (!formData.postalCode?.trim()) newErrors.postalCode = 'Postal code is required';
        } else if (step === 3) {
            if (formData.totalArea <= 0) newErrors.totalArea = 'Area is required';
            if (formData.bedrooms < 0) newErrors.bedrooms = 'Invalid bedrooms';
            if (formData.bathrooms < 0) newErrors.bathrooms = 'Invalid bathrooms';
        } else if (step === 4) {
            if (formData.images.length === 0 && imagePreviews.length === 0) {
                newErrors.images = 'At least one image is required';
            }
        } else if (step === 5) {
            if (!formData.contactName?.trim()) newErrors.contactName = 'Contact name is required';
            if (!formData.contactPhone?.trim()) newErrors.contactPhone = 'Phone number is required';
            if (!formData.contactEmail?.trim()) {
                newErrors.contactEmail = 'Email is required';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
                newErrors.contactEmail = 'Please enter a valid email';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleNext = () => {
        if (mode === 'create') {
            if (validateStep(currentStep)) {
                if (currentStep < 5) {
                    setCurrentStep(currentStep + 1);
                }
            }
        } else {
            if (currentStep < 5) {
                setCurrentStep(currentStep + 1);
            }
        }
    };

    const handlePrevious = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const validateAllFields = (): Record<string, string> => {
        const allErrors: Record<string, string> = {};

        // Step 1 validation
        if (!formData.title?.trim()) allErrors.title = 'Property title is required';
        if (formData.priceAmount <= 0) allErrors.priceAmount = 'Price is required';

        // Step 2 validation
        if (!formData.addressLine1?.trim()) allErrors.addressLine1 = 'Street address is required';
        if (!formData.countryId) allErrors.country = 'Country is required';
        if (!formData.stateId && !formData.state?.trim()) allErrors.state = 'State/Province is required';
        if (!formData.cityId && !formData.city?.trim()) allErrors.city = 'City is required';
        if (!formData.postalCode?.trim()) allErrors.postalCode = 'Postal code is required';

        // Step 3 validation
        if (formData.totalArea <= 0) allErrors.totalArea = 'Area is required';

        // Step 4 validation
        if (formData.images.length === 0 && imagePreviews.length === 0) {
            allErrors.images = 'At least one image is required';
        }

        // Step 5 validation
        if (!formData.contactName?.trim()) allErrors.contactName = 'Contact name is required';
        if (!formData.contactPhone?.trim()) allErrors.contactPhone = 'Phone number is required';
        if (!formData.contactEmail?.trim()) {
            allErrors.contactEmail = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
            allErrors.contactEmail = 'Please enter a valid email';
        }

        return allErrors;
    };

    const getFirstErrorStep = (errorFields: Record<string, string>): number => {
        if (errorFields.title || errorFields.priceAmount) return 1;
        if (errorFields.addressLine1 || errorFields.country || errorFields.state || errorFields.city || errorFields.postalCode) return 2;
        if (errorFields.totalArea) return 3;
        if (errorFields.images) return 4;
        if (errorFields.contactName || errorFields.contactPhone || errorFields.contactEmail) return 5;
        return 1;
    };

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
        if (value === '' || value === null || value === undefined) {
            handleInputChange(field, defaultValue as any);
        } else {
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && numValue >= 0) {
                handleInputChange(field, numValue as any);
            }
        }
    };

    const getNumericDisplayValue = (value: number | undefined): string => {
        if (value === undefined || value === null || value === 0) {
            return '';
        }
        return value.toString();
    };

    const handleTabClick = (stepNumber: number) => {
        if (mode === 'edit') {
            setCurrentStep(stepNumber);
        } else {
            if (stepNumber < currentStep) {
                setCurrentStep(stepNumber);
            }
        }
    };

    const handleCountryChange = (countryCode: string) => {
        const country = countries.find(c => c.code === countryCode);
        if (country) {
            setFormData(prev => ({
                ...prev,
                country: country.name,
                countryCode: country.code,
                currency: country.currency,
            }));
            setIsDirty(true);
        }
    };

    const toggleAmenity = (category: keyof typeof amenitiesGroups, amenityId: string) => {
        setFormData(prev => {
            const current = prev.amenities[category] || [];
            const updated = current.includes(amenityId)
                ? current.filter(a => a !== amenityId)
                : [...current, amenityId];
            return {
                ...prev,
                amenities: {
                    ...prev.amenities,
                    [category]: updated,
                },
            };
        });
        setIsDirty(true);
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);

        files.forEach((file) => {
            if (file.size > 10 * 1024 * 1024) {
                showToast(`${file.name} is too large. Maximum size is 10MB.`, 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setImagePreviews(prev => [...prev, event.target!.result as string]);
                    setFormData(prev => ({
                        ...prev,
                        images: [...prev.images, file],
                    }));
                    setIsDirty(true);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);

        files.forEach((file) => {
            if (file.size > 50 * 1024 * 1024) {
                showToast(`${file.name} is too large. Maximum size is 50MB.`, 'error');
                return;
            }

            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setVideoPreviews(prev => [...prev, event.target!.result as string]);
                    setFormData(prev => ({
                        ...prev,
                        videos: [...prev.videos, file],
                    }));
                    setIsDirty(true);
                }
            };
            reader.readAsDataURL(file);
        });
    };

    const removeImage = (index: number) => {
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter((_, i) => i !== index),
        }));
        setIsDirty(true);
    };

    const removeVideo = (index: number) => {
        setVideoPreviews(prev => prev.filter((_, i) => i !== index));
        setFormData(prev => ({
            ...prev,
            videos: prev.videos.filter((_, i) => i !== index),
        }));
        setIsDirty(true);
    };

    const processImages = async (files: (File | string)[]): Promise<string[]> => {
        const existingUrls: string[] = [];
        const newFiles: File[] = [];

        for (const file of files) {
            if (typeof file === 'string') {
                existingUrls.push(file);
            } else {
                newFiles.push(file);
            }
        }

        let uploadedUrls: string[] = [];
        if (newFiles.length > 0) {
            try {
                uploadedUrls = await uploadImages(newFiles);
            } catch (err) {
                console.error('Failed to upload images:', err);
                // Fallback to base64 if upload fails
                for (const file of newFiles) {
                    const base64 = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result as string);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                    uploadedUrls.push(base64);
                }
            }
        }

        return [...existingUrls, ...uploadedUrls];
    };

    const processVideos = async (files: (File | string)[]): Promise<string[]> => {
        const existingUrls: string[] = [];
        const newFiles: File[] = [];

        for (const file of files) {
            if (typeof file === 'string') {
                existingUrls.push(file);
            } else {
                newFiles.push(file);
            }
        }

        let uploadedUrls: string[] = [];
        if (newFiles.length > 0) {
            try {
                uploadedUrls = await uploadVideos(newFiles);
                if (uploadedUrls.length === 0 && newFiles.length > 0) {
                    console.warn('No video URLs returned, using base64 fallback for remaining files');
                    for (const file of newFiles) {
                        if (file.size > 10 * 1024 * 1024) {
                            console.warn(`Video "${file.name}" might be too large for base64 storage.`);
                        }
                        const base64 = await new Promise<string>((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result as string);
                            reader.onerror = reject;
                            reader.readAsDataURL(file);
                        });
                        uploadedUrls.push(base64);
                    }
                }
            } catch (err: any) {
                console.error('Failed to upload videos:', err);
                throw new Error(`Failed to upload videos: ${err?.message || err?.toString() || 'Unknown error'}`);
            }
        }

        return [...existingUrls, ...uploadedUrls];
    };

    const buildPropertyData = async (): Promise<Partial<Property>> => {
        const images = await processImages(formData.images);
        const videos = await processVideos(formData.videos);

        return {
            title: formData.title,
            propertyType: formData.propertyType,
            listingType: formData.listingType,
            status: formData.status,
            description: formData.description,
            shortDescription: formData.shortDescription,

            location: {
                addressLine1: formData.addressLine1,
                addressLine2: formData.addressLine2,
                city: formData.city,
                cityId: formData.cityId,
                state: formData.state,
                stateId: formData.stateId,
                stateCode: formData.stateCode,
                postalCode: formData.postalCode,
                country: formData.country,
                countryCode: formData.countryCode,
                countryId: formData.countryId,
                neighborhood: formData.neighborhood,
                landmark: formData.landmark,
            },
            address: formData.addressLine1,
            city: formData.city,
            state: formData.state,
            zipCode: formData.postalCode,

            price: {
                amount: formData.priceAmount,
                currency: formData.currency,
                negotiable: formData.negotiable,
            },
            // Using context helpers where possible or falling back to simple format if needed
            // formatPrice is available from context
            priceString: `${formData.currency} ${formData.priceAmount.toLocaleString()}`,

            dimensions: {
                totalArea: formData.totalArea,
                carpetArea: formData.carpetArea,
                areaUnit: formData.areaUnit,
                floors: formData.floors,
                floorNumber: formData.floorNumber,
                totalFloors: formData.totalFloors,
            },
            rooms: {
                bedrooms: formData.bedrooms,
                bathrooms: formData.bathrooms,
                balconies: formData.balconies,
                parkingSpaces: formData.parkingSpaces,
            },
            bedrooms: formData.bedrooms,
            bathrooms: formData.bathrooms,
            area: formData.totalArea,

            yearBuilt: formData.yearBuilt,
            furnishing: formData.furnishing,
            condition: formData.condition,
            facing: formData.facing,
            amenities: formData.amenities,
            features: [
                ...formData.amenities.interior,
                ...formData.amenities.exterior,
                ...formData.amenities.community,
                ...formData.amenities.security,
                ...formData.amenities.utilities,
            ],

            images,
            videos,
            virtualTourUrl: formData.virtualTourUrl,
            media: {
                images: images.map((url, i) => ({
                    id: `img-${i}`,
                    url,
                    type: 'image' as const,
                    isPrimary: i === 0,
                    order: i,
                    uploadedAt: new Date().toISOString(),
                })),
                videos: videos.map((url, i) => ({
                    id: `vid-${i}`,
                    url,
                    type: 'video' as const,
                    order: i,
                    uploadedAt: new Date().toISOString(),
                })),
                floorPlans: [],
                virtualTourUrl: formData.virtualTourUrl,
            },

            contact: {
                name: formData.contactName,
                email: formData.contactEmail,
                phone: formData.contactPhone,
                alternatePhone: formData.alternatePhone,
                preferredContactMethod: formData.preferredContactMethod,
                company: formData.company,
                licenseNumber: formData.licenseNumber,
            },
            contactName: formData.contactName,
            phoneNumber: formData.contactPhone,
            emailAddress: formData.contactEmail,

            availableFrom: formData.availableFrom,
            minimumLease: formData.minimumLease,
            inclusions: formData.inclusions,
            exclusions: formData.exclusions,

            financial: {
                deposit: formData.deposit,
                maintenanceCharges: formData.maintenanceCharges,
                maintenanceFrequency: 'monthly',
            },

            featured: formData.featured,
        };
    };

    const handleSaveDraft = async () => {
        if (!formData.title?.trim()) {
            setErrors({ title: 'Property title is required to save draft' });
            setCurrentStep(1);
            showToast('Please enter a property title to save as draft.', 'error');
            return;
        }

        setSaving(true);
        try {
            const propertyData = await buildPropertyData();

            if (mode === 'edit' && idValue) {
                const result = await updateProperty(idValue, { ...propertyData, draft: true, published: false });
                if (!result) throw new Error('Failed to save property');
            } else {
                const result = await addProperty({ ...propertyData, draft: true, published: false });
                if (!result) throw new Error('Failed to save property');
            }
            setIsDirty(false);
            showToast('Property saved as draft successfully!', 'success');
            setTimeout(() => navigate('/manager/dashboard/properties'), 1500);
        } catch (error: any) {
            console.error('Error saving draft:', error);
            showToast(`Failed to save draft: ${error?.message || 'Unknown error'}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveOrPublish = async () => {
        const allErrors = validateAllFields();

        if (Object.keys(allErrors).length > 0) {
            setErrors(allErrors);
            const firstErrorStep = getFirstErrorStep(allErrors);
            setCurrentStep(firstErrorStep);

            const errorMessage = mode === 'edit'
                ? 'Please fill in all required fields before saving.'
                : 'Please fill in all required fields before publishing.';
            showToast(errorMessage, 'error');
            return;
        }

        setSaving(true);
        try {
            const propertyData = await buildPropertyData();

            if (mode === 'edit' && idValue) {
                const result = await updateProperty(idValue, { ...propertyData, published: true, draft: false });
                if (!result) throw new Error('Failed to save property');
                setIsDirty(false);
                showToast('Property saved successfully!', 'success');
            } else {
                const result = await addProperty({ ...propertyData, published: true, draft: false });
                if (!result) throw new Error('Failed to publish property');
                setIsDirty(false);
                showToast('Property published successfully!', 'success');
            }
            setTimeout(() => navigate('/manager/dashboard/properties'), 1500);
        } catch (error: any) {
            console.error('Error saving/publishing property:', error);
            const actionWord = mode === 'edit' ? 'save' : 'publish';
            showToast(`Failed to ${actionWord} property: ${error?.message || 'Unknown error'}`, 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loadingProperty) {
        return (
            <div className="max-w-6xl mx-auto font-sans pb-8">
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-12">
                    <div className="flex flex-col items-center justify-center gap-4">
                        <Loader2 className="w-12 h-12 text-primary animate-spin" />
                        <p className="text-lg text-gray-600 dark:text-gray-400">Loading property details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (propertyNotFound && isEditMode) {
        return (
            <div className="max-w-6xl mx-auto font-sans pb-8">
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-12">
                    <div className="flex flex-col items-center justify-center gap-4">
                        <AlertCircle className="w-12 h-12 text-red-500" />
                        <p className="text-lg text-gray-800 dark:text-white font-medium">Property Not Found</p>
                        <p className="text-gray-600 dark:text-gray-400 text-center max-w-md">
                            The property you're trying to edit could not be found. It may have been deleted or you may not have access to it.
                        </p>
                        <button
                            onClick={() => navigate('/manager/dashboard/properties')}
                            className="mt-4 px-6 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors"
                        >
                            Back to Properties
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const primaryButtonLabel = mode === 'edit'
        ? (saving ? 'Saving...' : 'Save Property')
        : (saving ? 'Publishing...' : 'Publish Property');

    const primaryButtonIcon = mode === 'edit' ? <Save className="w-4 h-4" /> : null;

    return (
        <div className="max-w-6xl mx-auto font-sans pb-8">
            {/* Header */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <div className="mb-4">
                            {/* Custom back button that respects unsaved changes */}
                            <button
                                onClick={() => {
                                    if (isDirty && !saving) {
                                        const confirmLeave = window.confirm(
                                            'You have unsaved changes. Are you sure you want to leave? Your changes will be lost.'
                                        );
                                        if (!confirmLeave) return;
                                    }
                                    navigate(-1);
                                }}
                                className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5" />
                                <span className="font-medium">Back</span>
                            </button>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
                            {mode === 'edit' ? 'Edit Property' : 'Add New Property'}
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400">
                            {mode === 'edit' ? 'Update your property listing' : 'Create a new property listing with all the details'}
                        </p>
                        {isDirty && (
                            <p className="text-amber-600 dark:text-amber-400 text-sm mt-1 flex items-center gap-1">
                                <AlertCircle className="w-4 h-4" />
                                You have unsaved changes
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleSaveDraft}
                            disabled={saving}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Draft'}
                        </button>
                        <button
                            onClick={handleSaveOrPublish}
                            disabled={saving}
                            className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {formData.featured && <Star className="w-4 h-4" />}
                            {primaryButtonIcon}
                            {primaryButtonLabel}
                        </button>
                    </div>
                </div>

                {/* Progress Bar / Tab Navigation */}
                <div className="mt-6">
                    <div className="flex items-center justify-between overflow-x-auto pb-2">
                        {steps.map((step, index) => {
                            // Determine if this step is accessible
                            const isCurrentStep = currentStep === step.number;
                            const isCompleted = currentStep > step.number;
                            const isAccessible = mode === 'edit' ? true : (isCompleted || isCurrentStep);

                            return (
                                <div key={step.number} className="flex items-center flex-1 min-w-0">
                                    <div className="flex flex-col items-center flex-1 min-w-0">
                                        <button
                                            onClick={() => isAccessible && handleTabClick(step.number)}
                                            disabled={!isAccessible}
                                            title={mode === 'edit' ? step.title : (isAccessible ? step.title : 'Complete previous steps first')}
                                            className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${isCurrentStep
                                                ? 'bg-primary text-white shadow-lg ring-4 ring-primary/20'
                                                : isCompleted || mode === 'edit'
                                                    ? 'bg-primary/80 text-white shadow-md cursor-pointer hover:scale-110 hover:bg-primary'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                                }`}
                                        >
                                            {isCompleted && mode === 'create' ? (
                                                <CheckCircle className="w-5 h-5" />
                                            ) : (
                                                step.icon
                                            )}
                                        </button>
                                        <span
                                            className={`mt-2 text-xs font-medium text-center hidden md:block ${isCurrentStep || isCompleted || mode === 'edit'
                                                ? 'text-primary'
                                                : 'text-gray-500 dark:text-gray-400'
                                                }`}
                                        >
                                            {step.title}
                                        </span>
                                    </div>
                                    {index < steps.length - 1 && (
                                        <div
                                            className={`flex-1 h-1 mx-2 rounded hidden sm:block ${isCompleted || (mode === 'edit' && step.number < 5)
                                                ? 'bg-primary'
                                                : 'bg-gray-200 dark:bg-gray-700'
                                                }`}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                    {mode === 'edit' && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                            You can navigate to any tab. Changes will be saved when you click "Save Property".
                        </p>
                    )}
                </div>
            </div>

            {/* Form Content */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">

                {/* Step 1: Basic Info */}
                {currentStep === 1 && (
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                <Home className="w-5 h-5 text-primary" />
                                Basic Property Information
                            </h2>

                            {/* Title */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Property Title *
                                </label>
                                <input
                                    type="text"
                                    value={formData.title}
                                    onChange={(e) => handleInputChange('title', e.target.value)}
                                    className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white placeholder-gray-500 ${errors.title ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                                        }`}
                                    placeholder="e.g., Luxurious 3BR Apartment with Ocean View"
                                />
                                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                            </div>

                            {/* Property Type */}
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Property Type *
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                    {propertyTypes.map((type) => (
                                        <button
                                            key={type.value}
                                            type="button"
                                            onClick={() => handleInputChange('propertyType', type.value)}
                                            className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${formData.propertyType === type.value
                                                ? 'border-primary bg-primary/10 text-primary'
                                                : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                                                }`}
                                        >
                                            {type.icon}
                                            <span className="text-sm font-medium">{type.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Listing Type & Status */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Listing Type *
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {listingTypes.map((type) => (
                                            <button
                                                key={type.value}
                                                type="button"
                                                onClick={() => handleInputChange('listingType', type.value)}
                                                className={`px-4 py-2 rounded-lg border transition-all ${formData.listingType === type.value
                                                    ? 'border-primary bg-primary text-white'
                                                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                                                    }`}
                                            >
                                                {type.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Status *
                                    </label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => handleInputChange('status', e.target.value as PropertyStatus)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                                    >
                                        {statusOptions.map((status) => (
                                            <option key={status.value} value={status.value}>
                                                {status.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Pricing */}
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                <DollarSign className="w-5 h-5 text-primary" />
                                Pricing
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Country
                                    </label>
                                    <select
                                        value={formData.countryCode}
                                        onChange={(e) => handleCountryChange(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                                    >
                                        {countries.map((country) => (
                                            <option key={country.code} value={country.code}>
                                                {country.name} ({country.currency})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Price *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                                            {formData.currency}
                                        </span>
                                        <input
                                            type="number"
                                            value={formData.priceAmount || ''}
                                            onChange={(e) => handleInputChange('priceAmount', parseFloat(e.target.value) || 0)}
                                            className={`w-full pl-16 pr-10 py-3 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white transition-all hover:border-gray-300 dark:hover:border-gray-600 ${errors.priceAmount ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                                                }`}
                                            placeholder="0"
                                        />
                                    </div>
                                    {errors.priceAmount && <p className="text-red-500 text-xs mt-1">{errors.priceAmount}</p>}
                                </div>

                                <div className="flex items-end">
                                    <label className="flex items-center gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.negotiable}
                                            onChange={(e) => handleInputChange('negotiable', e.target.checked)}
                                            className="w-5 h-5 rounded border-gray-300 dark:border-gray-600 text-primary focus:ring-primary transition-all"
                                        />
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                            Price is Negotiable
                                        </span>
                                    </label>
                                </div>
                            </div>

                            {/* Featured Toggle */}
                            <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.featured}
                                        onChange={(e) => handleInputChange('featured', e.target.checked)}
                                        className="w-5 h-5 rounded border-yellow-400 text-yellow-600 focus:ring-yellow-500"
                                    />
                                    <div>
                                        <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
                                            <Star className="w-4 h-4" />
                                            Mark as Featured Property
                                        </span>
                                        <p className="text-xs text-yellow-600 dark:text-yellow-300 mt-1">
                                            Featured properties get more visibility and appear at the top of search results
                                        </p>
                                    </div>
                                </label>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Location */}
                {currentStep === 2 && (
                    <div className="space-y-6">
                        <AddressSection
                            key={`address-${idValue || 'new'}-${formData.countryId || ''}-${formData.stateId || ''}-${formData.cityId || ''}`}
                            value={{
                                countryId: formData.countryId || '',
                                countryName: formData.country || '',
                                countryCode: formData.countryCode || '',
                                stateId: formData.stateId || '',
                                stateName: formData.state || '',
                                stateCode: formData.stateCode || '',
                                cityId: formData.cityId || '',
                                cityName: formData.city || '',
                                addressLine1: formData.addressLine1 || '',
                                addressLine2: formData.addressLine2 || '',
                                postalCode: formData.postalCode || '',
                                neighborhood: formData.neighborhood || '',
                                landmark: formData.landmark || '',
                            }}
                            onChange={(addressData: AddressFormData) => {
                                setFormData(prev => ({
                                    ...prev,
                                    countryId: addressData.countryId,
                                    country: addressData.countryName,
                                    countryCode: addressData.countryCode,
                                    stateId: addressData.stateId,
                                    state: addressData.stateName,
                                    stateCode: addressData.stateCode,
                                    cityId: addressData.cityId,
                                    city: addressData.cityName,
                                    addressLine1: addressData.addressLine1,
                                    addressLine2: addressData.addressLine2,
                                    postalCode: addressData.postalCode,
                                    neighborhood: addressData.neighborhood,
                                    landmark: addressData.landmark,
                                }));
                                // Only mark as dirty after initial load is complete
                                if (hasInitializedRef.current || mode === 'create') {
                                    setIsDirty(true);
                                }
                            }}
                            errors={errors}
                            disabled={saving}
                            required={true}
                            initialCountry={formData.country}
                            initialCountryCode={formData.countryCode}
                            initialState={formData.state}
                            initialCity={formData.city}
                        />
                    </div>
                )}

                {/* Step 3: Property Details */}
                {currentStep === 3 && (
                    <div className="space-y-8">
                        {/* Area & Dimensions */}
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                <Maximize className="w-5 h-5 text-primary" />
                                Area & Dimensions
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Total Area *
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.totalArea || ''}
                                        onChange={(e) => handleInputChange('totalArea', parseFloat(e.target.value) || 0)}
                                        className={`w-full px-4 py-3 pr-10 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white transition-all hover:border-gray-300 dark:hover:border-gray-600 ${errors.totalArea ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                                            }`}
                                        placeholder="0"
                                    />
                                    {errors.totalArea && <p className="text-red-500 text-xs mt-1">{errors.totalArea}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Carpet Area
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.carpetArea || ''}
                                        onChange={(e) => handleInputChange('carpetArea', parseFloat(e.target.value) || 0)}
                                        className="w-full px-4 py-3 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white transition-all hover:border-gray-300 dark:hover:border-gray-600"
                                        placeholder="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Area Unit
                                    </label>
                                    <select
                                        value={formData.areaUnit}
                                        onChange={(e) => handleInputChange('areaUnit', e.target.value as AreaUnit)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                                    >
                                        {areaUnits.map((unit) => (
                                            <option key={unit.value} value={unit.value}>
                                                {unit.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Year Built
                                    </label>
                                    <input
                                        type="number"
                                        min="1800"
                                        max={new Date().getFullYear()}
                                        value={formData.yearBuilt || ''}
                                        onChange={(e) => handleInputChange('yearBuilt', parseInt(e.target.value) || 0)}
                                        className="w-full px-4 py-3 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white transition-all hover:border-gray-300 dark:hover:border-gray-600"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Rooms */}
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                <Bed className="w-5 h-5 text-primary" />
                                Rooms & Spaces
                            </h2>

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        <Bed className="w-4 h-4 inline mr-1" /> Bedrooms *
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={getNumericDisplayValue(formData.bedrooms)}
                                        onChange={(e) => handleNumericChange('bedrooms', e.target.value, 0)}
                                        className="w-full px-4 py-3 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white transition-all hover:border-gray-300 dark:hover:border-gray-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        <Bath className="w-4 h-4 inline mr-1" /> Bathrooms *
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={getNumericDisplayValue(formData.bathrooms)}
                                        onChange={(e) => handleNumericChange('bathrooms', e.target.value, 0)}
                                        className="w-full px-4 py-3 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white transition-all hover:border-gray-300 dark:hover:border-gray-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Balconies
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={getNumericDisplayValue(formData.balconies)}
                                        onChange={(e) => handleNumericChange('balconies', e.target.value, 0)}
                                        className="w-full px-4 py-3 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white transition-all hover:border-gray-300 dark:hover:border-gray-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        <Car className="w-4 h-4 inline mr-1" /> Parking Spaces
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={getNumericDisplayValue(formData.parkingSpaces)}
                                        onChange={(e) => handleNumericChange('parkingSpaces', e.target.value, 0)}
                                        className="w-full px-4 py-3 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white transition-all hover:border-gray-300 dark:hover:border-gray-600"
                                    />
                                </div>
                            </div>

                            {/* Floor Info */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Floor Number
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={getNumericDisplayValue(formData.floorNumber)}
                                        onChange={(e) => handleNumericChange('floorNumber', e.target.value, 0)}
                                        className="w-full px-4 py-3 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white transition-all hover:border-gray-300 dark:hover:border-gray-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Total Floors
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        value={getNumericDisplayValue(formData.totalFloors)}
                                        onChange={(e) => handleNumericChange('totalFloors', e.target.value, 1)}
                                        className="w-full px-4 py-3 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white transition-all hover:border-gray-300 dark:hover:border-gray-600"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Facing Direction
                                    </label>
                                    <select
                                        value={formData.facing}
                                        onChange={(e) => handleInputChange('facing', e.target.value as FacingDirection)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                                    >
                                        {facingOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Condition & Furnishing */}
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                <Settings className="w-5 h-5 text-primary" />
                                Condition & Furnishing
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Furnishing Status
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {furnishingOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onClick={() => handleInputChange('furnishing', option.value)}
                                                className={`px-4 py-2 rounded-lg border transition-all ${formData.furnishing === option.value
                                                    ? 'border-primary bg-primary text-white'
                                                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                                    }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Property Condition
                                    </label>
                                    <select
                                        value={formData.condition}
                                        onChange={(e) => handleInputChange('condition', e.target.value as PropertyCondition)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                                    >
                                        {conditionOptions.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-primary" />
                                Description
                            </h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Short Description (for cards)
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.shortDescription}
                                        onChange={(e) => handleInputChange('shortDescription', e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                                        placeholder="A brief summary of the property (max 150 chars)"
                                        maxLength={150}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Full Description
                                    </label>
                                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                                        <div className="border-b border-gray-200 dark:border-gray-700 p-2 flex gap-2 flex-wrap bg-gray-50 dark:bg-gray-800">
                                            <button type="button" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                                                <Bold className="w-4 h-4" />
                                            </button>
                                            <button type="button" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                                                <Italic className="w-4 h-4" />
                                            </button>
                                            <button type="button" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                                                <Underline className="w-4 h-4" />
                                            </button>
                                            <button type="button" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                                                <List className="w-4 h-4" />
                                            </button>
                                            <button type="button" className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
                                                <LinkIcon className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => handleInputChange('description', e.target.value)}
                                            className="w-full p-4 min-h-[200px] focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                                            placeholder="Enter a detailed property description..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Media & Features */}
                {currentStep === 4 && (
                    <div className="space-y-8">
                        {/* Images */}
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                <Camera className="w-5 h-5 text-primary" />
                                Property Images
                            </h2>

                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:border-primary transition-colors">
                                <input
                                    type="file"
                                    id="image-upload"
                                    multiple
                                    accept="image/png,image/jpg,image/jpeg,image/webp"
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                                <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
                                    <Upload className="w-12 h-12 text-gray-400 mb-4" />
                                    <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">Click to upload images</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">PNG, JPG, JPEG, WEBP up to 10MB each</p>
                                </label>
                            </div>
                            {errors.images && <p className="text-red-500 text-xs mt-1">{errors.images}</p>}

                            {imagePreviews.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                    {imagePreviews.map((preview, index) => (
                                        <div key={index} className="relative group rounded-lg overflow-hidden">
                                            <img
                                                src={preview}
                                                alt={`Preview ${index + 1}`}
                                                className="w-full h-32 object-cover"
                                            />
                                            {index === 0 && (
                                                <span className="absolute top-2 left-2 px-2 py-1 bg-primary text-white text-xs rounded">
                                                    Primary
                                                </span>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Videos */}
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                <Video className="w-5 h-5 text-primary" />
                                Property Videos
                            </h2>

                            <div className="border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-8 text-center hover:border-primary transition-colors">
                                <input
                                    type="file"
                                    id="video-upload"
                                    multiple
                                    accept="video/mp4,video/mov,video/avi"
                                    onChange={handleVideoUpload}
                                    className="hidden"
                                />
                                <label htmlFor="video-upload" className="cursor-pointer flex flex-col items-center">
                                    <Video className="w-12 h-12 text-gray-400 mb-4" />
                                    <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">Click to upload videos</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">MP4, MOV, AVI up to 50MB each</p>
                                </label>
                            </div>

                            {videoPreviews.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    {videoPreviews.map((preview, index) => (
                                        <div key={index} className="relative group rounded-lg overflow-hidden">
                                            <video src={preview} className="w-full h-48 object-cover" controls />
                                            <button
                                                type="button"
                                                onClick={() => removeVideo(index)}
                                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Virtual Tour */}
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                <Globe className="w-5 h-5 text-primary" />
                                Virtual Tour
                            </h2>

                            <input
                                type="url"
                                value={formData.virtualTourUrl}
                                onChange={(e) => handleInputChange('virtualTourUrl', e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                                placeholder="https://your-virtual-tour-url.com"
                            />
                        </div>

                        {/* Amenities */}
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                <Star className="w-5 h-5 text-primary" />
                                Amenities & Features
                            </h2>

                            {Object.entries(amenitiesGroups).map(([category, amenities]) => (
                                <div key={category} className="mb-6">
                                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 capitalize">
                                        {category.replace('_', ' ')} Features
                                    </h3>
                                    <div className="flex flex-wrap gap-2">
                                        {amenities.map((amenity) => (
                                            <button
                                                key={amenity.id}
                                                type="button"
                                                onClick={() => toggleAmenity(category as keyof typeof amenitiesGroups, amenity.id)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${formData.amenities[category as keyof typeof amenitiesGroups]?.includes(amenity.id)
                                                    ? 'border-primary bg-primary text-white'
                                                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                                                    }`}
                                            >
                                                {amenity.icon}
                                                {amenity.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 5: Contact & Publish */}
                {currentStep === 5 && (
                    <div className="space-y-8">
                        {/* Contact Information */}
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                <User className="w-5 h-5 text-primary" />
                                Contact Information
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Contact Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.contactName}
                                        onChange={(e) => handleInputChange('contactName', e.target.value)}
                                        className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white ${errors.contactName ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                                            }`}
                                        placeholder="Enter contact name"
                                    />
                                    {errors.contactName && <p className="text-red-500 text-xs mt-1">{errors.contactName}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Email Address *
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.contactEmail}
                                        onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                                        className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white ${errors.contactEmail ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                                            }`}
                                        placeholder="Enter email address"
                                    />
                                    {errors.contactEmail && <p className="text-red-500 text-xs mt-1">{errors.contactEmail}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Phone Number *
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.contactPhone}
                                        onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                                        className={`w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white ${errors.contactPhone ? 'border-red-500' : 'border-gray-200 dark:border-gray-700'
                                            }`}
                                        placeholder="+1 (555) 000-0000"
                                    />
                                    {errors.contactPhone && <p className="text-red-500 text-xs mt-1">{errors.contactPhone}</p>}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Alternate Phone
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.alternatePhone}
                                        onChange={(e) => handleInputChange('alternatePhone', e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                                        placeholder="+1 (555) 000-0000 (optional)"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Company Name
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.company}
                                        onChange={(e) => handleInputChange('company', e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                                        placeholder="Real estate agency (optional)"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        License Number
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.licenseNumber}
                                        onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                                        placeholder="Agent license number (optional)"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Availability & Terms */}
                        <div>
                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-primary" />
                                Availability & Terms
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Available From
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.availableFrom}
                                        onChange={(e) => handleInputChange('availableFrom', e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                                    />
                                </div>

                                {(formData.listingType === 'rent' || formData.listingType === 'lease') && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Minimum Lease (months)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.minimumLease}
                                            onChange={(e) => handleInputChange('minimumLease', parseInt(e.target.value) || 1)}
                                            className="w-full px-4 py-3 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white transition-all hover:border-gray-300 dark:hover:border-gray-600"
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Security Deposit ({formData.currency})
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.deposit || ''}
                                        onChange={(e) => handleInputChange('deposit', parseFloat(e.target.value) || 0)}
                                        className="w-full px-4 py-3 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white transition-all hover:border-gray-300 dark:hover:border-gray-600"
                                        placeholder="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Maintenance Charges ({formData.currency}/month)
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        value={formData.maintenanceCharges || ''}
                                        onChange={(e) => handleInputChange('maintenanceCharges', parseFloat(e.target.value) || 0)}
                                        className="w-full px-4 py-3 pr-10 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white transition-all hover:border-gray-300 dark:hover:border-gray-600"
                                        placeholder="0"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Inclusions
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.inclusions}
                                        onChange={(e) => handleInputChange('inclusions', e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                                        placeholder="e.g., Appliances, furniture, utilities"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Exclusions
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.exclusions}
                                        onChange={(e) => handleInputChange('exclusions', e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-gray-900 dark:text-white"
                                        placeholder="e.g., Parking fees, utility bills"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Ready to Save/Publish */}
                        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                                </div>
                                <div>
                                    <p className="text-green-800 dark:text-green-200 font-medium text-lg">
                                        {mode === 'edit' ? 'Ready to Save!' : 'Ready to Publish!'}
                                    </p>
                                    <p className="text-green-700 dark:text-green-300 text-sm mt-1">
                                        {mode === 'edit'
                                            ? 'Review your changes and click "Save Property" to update the listing. You can also save as draft if the listing is not ready.'
                                            : 'Your property listing is complete. Review the details and publish when ready. You can also save as draft and publish later.'
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex flex-col sm:flex-row justify-between gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={handlePrevious}
                        disabled={currentStep === 1}
                        className={`px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-center gap-2 transition-all ${currentStep === 1
                            ? 'opacity-50 cursor-not-allowed'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                    >
                        <ChevronLeft className="w-5 h-5" />
                        Previous
                    </button>

                    {currentStep < 5 ? (
                        <button
                            type="button"
                            onClick={handleNext}
                            className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg"
                        >
                            Next: {steps[currentStep]?.title}
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={handleSaveDraft}
                                disabled={saving}
                                className="px-6 py-3 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
                            >
                                Save as Draft
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveOrPublish}
                                disabled={saving}
                                className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition-all shadow-lg disabled:opacity-50 flex items-center gap-2"
                            >
                                {formData.featured && <Star className="w-4 h-4" />}
                                {primaryButtonIcon}
                                {primaryButtonLabel}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Toast Notification */}
            <Toast
                id={toast.id}
                message={toast.message}
                type={toast.type}
                isVisible={toast.visible}
                onClose={hideToast}
                duration={3000}
            />
        </div>
    );
}

