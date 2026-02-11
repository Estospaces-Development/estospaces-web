"use client";

import { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';

// Type definitions
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'INR' | 'AED' | 'CAD' | 'AUD' | 'JPY' | 'CNY' | 'SGD';
export type AreaUnit = 'sqft' | 'sqm' | 'acres' | 'hectares';
export type PropertyStatus =
    | 'online'
    | 'offline'
    | 'under_offer'
    | 'sold'
    | 'let'
    | 'draft'
    | 'published'
    | 'active'
    | 'available'
    | 'pending'
    | 'rented'
    | 'under_contract'
    | 'off_market'
    | 'coming_soon';
export type PropertyType = 'apartment' | 'house' | 'condo' | 'townhouse' | 'villa' | 'penthouse' | 'studio' | 'duplex' | 'triplex' | 'land' | 'commercial' | 'industrial' | 'office';
export type ListingType = 'sale' | 'rent' | 'lease' | 'short_term' | 'vacation';
export type FurnishingStatus = 'furnished' | 'semi_furnished' | 'unfurnished';
export type PropertyCondition = 'new' | 'excellent' | 'good' | 'fair' | 'needs_renovation';
export type FacingDirection = 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';

export interface PriceInfo {
    amount: number;
    currency: CurrencyCode;
    negotiable: boolean;
}

export interface Property {
    id: string;
    title: string;
    description?: string;
    shortDescription?: string;
    price?: PriceInfo;
    priceString?: string;
    propertyType: PropertyType;
    listingType: ListingType;
    status: PropertyStatus;

    // Location
    location?: {
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        cityId?: string;
        state?: string;
        stateId?: string;
        stateCode?: string;
        postalCode?: string;
        country?: string;
        countryCode?: string;
        countryId?: string;
        latitude?: number;
        longitude?: number;
        neighborhood?: string;
        landmark?: string;
    };
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;

    // Dimensions
    dimensions?: {
        totalArea: number;
        carpetArea?: number;
        areaUnit: AreaUnit;
        floors?: number;
        floorNumber?: number;
        totalFloors?: number;
    };
    area?: number;

    // Rooms
    rooms?: {
        bedrooms: number;
        bathrooms: number;
        balconies?: number;
        parkingSpaces?: number;
    };
    bedrooms?: number;
    bathrooms?: number;

    // Features
    yearBuilt?: number;
    furnishing: FurnishingStatus;
    condition: PropertyCondition;
    facing?: FacingDirection;
    amenities: {
        interior: string[];
        exterior: string[];
        community: string[];
        security: string[];
        utilities: string[];
    };
    features?: string[];

    // Media
    media?: {
        images: { id: string; url: string; type: string; isPrimary?: boolean; order?: number; uploadedAt: string }[];
        videos: { id: string; url: string; type: string; order?: number; uploadedAt: string }[];
        floorPlans: any[];
        virtualTourUrl?: string;
    };
    images?: (File | string)[];
    videos?: (File | string)[];
    virtualTourUrl?: string;

    // Contact
    contact?: {
        name: string;
        email: string;
        phone: string;
        alternatePhone?: string;
        preferredContactMethod: 'email' | 'phone' | 'whatsapp' | 'any';
        company?: string;
        licenseNumber?: string;
    };
    contactName?: string;
    phoneNumber?: string;
    emailAddress?: string;

    // Terms
    availableFrom: string;
    minimumLease?: number;
    inclusions?: string;
    exclusions?: string;
    financial?: {
        deposit?: number;
        maintenanceCharges?: number;
        maintenanceFrequency?: string;
    };

    // Analytics
    analytics: {
        views: number;
        inquiries: number;
        favorites: number;
        shares: number;
    };

    // Flags & Meta
    propertyId?: string;
    createdAt: string;
    updatedAt: string;
    published: boolean;
    draft: boolean;
    featured?: boolean;
    verified?: boolean;
    premium?: boolean;
    version?: number;
}

export interface PropertyFilters {
    search?: string;
    propertyType?: PropertyType[];
    listingType?: ListingType[];
    status?: (PropertyStatus | string)[];
    priceMin?: number;
    priceMax?: number;
    bedroomsMin?: number;
    bedroomsMax?: number;
    bathroomsMin?: number;
    areaMin?: number;
    areaMax?: number;
    city?: string;
    country?: string;
    furnishing?: FurnishingStatus[];
    featured?: boolean;
    verified?: boolean;
}

export type SortField = 'createdAt' | 'updatedAt' | 'price' | 'area' | 'bedrooms' | 'views' | 'title';
export type SortOrder = 'asc' | 'desc';

export interface SortOption {
    field: SortField;
    order: SortOrder;
}

export interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface PropertyContextType {
    properties: Property[];
    filteredProperties: Property[];
    selectedProperties: string[];
    filters: PropertyFilters;
    sort: SortOption;
    pagination: Pagination;
    loading: boolean;
    error: string | null;

    fetchProperties: () => Promise<void>;
    addProperty: (property: Partial<Property>) => Promise<Property | null>;
    updateProperty: (id: string, property: Partial<Property>) => Promise<Property | null>;
    deleteProperty: (id: string) => Promise<void>;
    deleteProperties: (ids: string[]) => Promise<void>;
    duplicateProperty: (id: string) => Promise<Property | null>;
    getProperty: (id: string) => Property | undefined;
    uploadImages: (files: File[]) => Promise<string[]>;
    uploadVideos: (files: File[]) => Promise<string[]>;

    selectProperty: (id: string) => void;
    deselectProperty: (id: string) => void;
    selectAllProperties: () => void;
    clearSelection: () => void;
    bulkUpdateStatus: (ids: string[], status: PropertyStatus) => Promise<void>;

    setFilters: (filters: PropertyFilters) => void;
    clearFilters: () => void;
    setSort: (sort: SortOption) => void;
    setPage: (page: number) => void;
    setLimit: (limit: number) => void;

    incrementViews: (id: string) => void;
    incrementInquiries: (id: string) => void;
    incrementShares: (id: string) => void;
    exportProperties: (format: 'csv' | 'json' | 'pdf', ids?: string[]) => void;
    formatPrice: (price: PriceInfo | undefined) => string;
    formatArea: (area: number, unit: AreaUnit) => string;
    getPropertyStats: () => { total: number; available: number; sold: number; rented: number; pending: number };
}

const PropertyContext = createContext<PropertyContextType | undefined>(undefined);

export const useProperties = () => {
    const context = useContext(PropertyContext);
    if (!context) {
        throw new Error('useProperties must be used within PropertyProvider');
    }
    return context;
};

// Mock Properties
const MOCK_PROPERTIES: Property[] = [
    {
        id: '1',
        title: 'Luxury Villa in Beverly Hills',
        description: 'A stunning 5-bedroom villa with ocean views and a private pool.',
        shortDescription: 'Luxury 5-bed villa with pool.',
        price: { amount: 5000000, currency: 'USD', negotiable: true },
        priceString: '$5,000,000',
        propertyType: 'villa',
        listingType: 'sale',
        status: 'active',
        location: {
            addressLine1: '123 Palm Drive',
            city: 'Beverly Hills',
            state: 'California',
            country: 'USA',
            countryCode: 'US'
        },
        address: '123 Palm Drive',
        city: 'Beverly Hills',
        state: 'California',
        zipCode: '90210',
        dimensions: { totalArea: 4500, areaUnit: 'sqft', floors: 2 },
        area: 4500,
        rooms: { bedrooms: 5, bathrooms: 6, parkingSpaces: 3 },
        bedrooms: 5,
        bathrooms: 6,
        yearBuilt: 2020,
        furnishing: 'furnished',
        condition: 'excellent',
        amenities: { interior: ['AC', 'Heater'], exterior: ['Pool', 'Garden'], community: ['Gym'], security: ['CCTV'], utilities: ['Water', 'Electricity'] },
        media: { images: [], videos: [], floorPlans: [] },
        images: [],
        analytics: { views: 1200, inquiries: 45, favorites: 30, shares: 15 },

        availableFrom: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        published: true,
        draft: false,
        featured: true,
        verified: true
    },
    {
        id: '2',
        title: 'Modern Apartment in Downtown',
        description: 'Spacious 2-bedroom apartment in the heart of the city.',
        shortDescription: 'Modern 2-bed apartment.',
        price: { amount: 2500, currency: 'USD', negotiable: false },
        priceString: '$2,500/mo',
        propertyType: 'apartment',
        listingType: 'rent',
        status: 'active',
        location: {
            addressLine1: '456 Main St',
            city: 'New York',
            state: 'New York',
            country: 'USA',
            countryCode: 'US'
        },
        address: '456 Main St',
        city: 'New York',
        state: 'New York',
        zipCode: '10001',
        dimensions: { totalArea: 1200, areaUnit: 'sqft', floorNumber: 15, totalFloors: 40 },
        area: 1200,
        rooms: { bedrooms: 2, bathrooms: 2, parkingSpaces: 1 },
        bedrooms: 2,
        bathrooms: 2,
        yearBuilt: 2018,
        furnishing: 'semi_furnished',
        condition: 'good',
        amenities: { interior: ['AC'], exterior: ['Balcony'], community: ['Gym', 'Pool'], security: ['24/7 Security'], utilities: ['Water', 'Gas'] },
        media: { images: [], videos: [], floorPlans: [] },
        images: [],
        analytics: { views: 800, inquiries: 25, favorites: 15, shares: 8 },

        availableFrom: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        published: true,
        draft: false,
        featured: false,
        verified: true
    }
];

export const PropertyProvider = ({ children }: { children: ReactNode }) => {
    const [properties, setProperties] = useState<Property[]>(MOCK_PROPERTIES);
    const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
    const [filters, setFiltersState] = useState<PropertyFilters>({});
    const [sort, setSort] = useState<SortOption>({ field: 'createdAt', order: 'desc' });
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 12, total: MOCK_PROPERTIES.length, totalPages: 1 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchProperties = async () => {
        setLoading(true);
        // Simulate API delay
        setTimeout(() => {
            setProperties(MOCK_PROPERTIES);
            setLoading(false);
        }, 500);
    };

    useEffect(() => {
        fetchProperties();
    }, []);

    const filteredProperties = properties; // Placeholder for actual filtering logic

    return (
        <PropertyContext.Provider value={{
            properties,
            filteredProperties,
            selectedProperties,
            filters,
            sort,
            pagination,
            loading,
            error,
            fetchProperties,
            addProperty: async () => null,
            updateProperty: async () => null,
            deleteProperty: async () => { },
            deleteProperties: async () => { },
            duplicateProperty: async () => null,
            getProperty: (id) => properties.find(p => p.id === id),
            uploadImages: async () => [],
            uploadVideos: async () => [],
            selectProperty: (id) => setSelectedProperties(prev => [...prev, id]),
            deselectProperty: (id) => setSelectedProperties(prev => prev.filter(pId => pId !== id)),
            selectAllProperties: () => setSelectedProperties(properties.map(p => p.id)),
            clearSelection: () => setSelectedProperties([]),
            bulkUpdateStatus: async () => { },
            setFilters: setFiltersState,
            clearFilters: () => setFiltersState({}),
            setSort,
            setPage: (page) => setPagination(prev => ({ ...prev, page })),
            setLimit: (limit) => setPagination(prev => ({ ...prev, limit })),
            incrementViews: () => { },
            incrementInquiries: () => { },
            incrementShares: () => { },
            exportProperties: () => { },
            formatPrice: (price) => price ? new Intl.NumberFormat('en-US', { style: 'currency', currency: price.currency }).format(price.amount) : '',
            formatArea: (area, unit) => `${area} ${unit}`,
            getPropertyStats: () => ({ total: properties.length, available: 1, sold: 0, rented: 0, pending: 0 })
        }}>
            {children}
        </PropertyContext.Provider>
    );
};
