"use client";

import { createContext, useContext, useState, useEffect, useMemo, ReactNode, useCallback } from 'react';
import * as propertyService from '../services/propertyService';

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

    incrementViews: (id: string) => Promise<void>;
    incrementInquiries: (id: string) => Promise<void>;
    incrementShares: (id: string) => Promise<void>;
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

// Provider Implementation

export const PropertyProvider = ({ children }: { children: ReactNode }) => {
    const [properties, setProperties] = useState<Property[]>([]);
    const [selectedProperties, setSelectedProperties] = useState<string[]>([]);
    const [filters, setFiltersState] = useState<PropertyFilters>({});
    const [sort, setSort] = useState<SortOption>({ field: 'createdAt', order: 'desc' });
    const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 12, total: 0, totalPages: 1 });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Mappers
    const mapServiceToContextProperty = (p: propertyService.Property): Property => ({
        id: p.id,
        title: p.title,
        description: p.description,
        price: {
            amount: p.price || 0,
            currency: (p.currency as CurrencyCode) || 'GBP',
            negotiable: false
        },
        priceString: p.price ? new Intl.NumberFormat('en-GB', { style: 'currency', currency: p.currency || 'GBP' }).format(p.price) : 'POA',
        propertyType: (p.property_type as PropertyType) || 'house',
        listingType: (p.listing_type as ListingType) || 'rent',
        status: (p.status as PropertyStatus) || 'available',
        location: {
            addressLine1: p.address_line_1,
            addressLine2: p.address_line_2,
            city: p.city,
            postalCode: p.postcode,
            country: p.country || 'UK',
        },
        address: p.address_line_1,
        city: p.city,
        area: p.property_size_sqft,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        rooms: {
            bedrooms: p.bedrooms || 0,
            bathrooms: p.bathrooms || 0,
            parkingSpaces: p.parking_spaces || 0,
        },
        dimensions: {
            totalArea: p.property_size_sqft || 0,
            areaUnit: 'sqft',
        },
        amenities: {
            interior: [],
            exterior: [],
            community: [],
            security: [],
            utilities: [],
        },
        furnishing: p.furnished ? 'furnished' : 'unfurnished',
        condition: 'excellent',
        analytics: {
            views: p.views || 0,
            inquiries: p.inquiries || 0,
            favorites: p.favorites || 0,
            shares: 0,
        },
        media: {
            images: (p.image_urls || []).map((url, i) => ({ id: `${p.id}-img-${i}`, url, type: 'image', uploadedAt: new Date().toISOString() })),
            videos: (p.video_urls || []).map((url, i) => ({ id: `${p.id}-vid-${i}`, url, type: 'video', uploadedAt: new Date().toISOString() })),
            floorPlans: [],
        },
        images: p.image_urls || [],
        createdAt: p.created_at || new Date().toISOString(),
        updatedAt: p.updated_at || new Date().toISOString(),
        availableFrom: p.created_at || new Date().toISOString(),
        published: p.status === 'published',
        draft: p.status === 'draft',
    });

    const mapContextToServiceProperty = (p: Partial<Property>): Partial<propertyService.Property> => {
        const serviceProps: any = {};
        if (p.title) serviceProps.title = p.title;
        if (p.description) serviceProps.description = p.description;
        if (p.price?.amount) serviceProps.price = p.price.amount;
        if (p.location?.addressLine1) serviceProps.address_line_1 = p.location.addressLine1;
        if (p.location?.addressLine2) serviceProps.address_line_2 = p.location.addressLine2;
        if (p.location?.city) serviceProps.city = p.location.city;
        if (p.location?.postalCode) serviceProps.postcode = p.location.postalCode;
        if (p.propertyType) serviceProps.property_type = p.propertyType;
        if (p.listingType) serviceProps.listing_type = p.listingType;

        // Handle status mapping
        if (p.status) {
            serviceProps.status = p.status;
        } else if (p.published) {
            serviceProps.status = 'published';
        } else if (p.draft) {
            serviceProps.status = 'draft';
        }

        if (p.bedrooms) serviceProps.bedrooms = p.bedrooms;
        if (p.bathrooms) serviceProps.bathrooms = p.bathrooms;
        if (p.area) serviceProps.property_size_sqft = p.area;
        if (p.furnishing) serviceProps.furnished = p.furnishing === 'furnished';
        if (p.rooms?.parkingSpaces) serviceProps.parking_spaces = p.rooms.parkingSpaces;
        if (p.images) serviceProps.image_urls = p.images.filter(img => typeof img === 'string');
        return serviceProps;
    };

    const fetchProperties = async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await propertyService.getProperties(filters);
            if (result.error) {
                setError(result.error);
                setProperties([]);
            } else if (result.data) {
                setProperties(result.data.map(mapServiceToContextProperty));
                setPagination(prev => ({ ...prev, total: result.data?.length || 0 }));
            }
        } catch (err: any) {
            console.error('[PropertyContext] fetchProperties error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProperties();
    }, [filters]);

    const filteredProperties = properties;
    // Placeholder for actual filtering logic

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
            addProperty: async (propertyData: Partial<Property>) => {
                setLoading(true);
                try {
                    const mappedData = mapContextToServiceProperty(propertyData);
                    console.log('[PropertyContext] Adding property:', mappedData);
                    const { data, error } = await propertyService.createProperty(mappedData);
                    if (error) throw new Error(error);
                    if (data) {
                        const newProp = mapServiceToContextProperty(data);
                        setProperties(prev => [newProp, ...prev]);
                        return newProp;
                    }
                    return null;
                } catch (err: any) {
                    console.error('[PropertyContext] addProperty error:', err);
                    setError(err.message);
                    return null;
                } finally {
                    setLoading(false);
                }
            },
            updateProperty: async (id: string, propertyData: Partial<Property>) => {
                setLoading(true);
                try {
                    const mappedData = mapContextToServiceProperty(propertyData);
                    console.log('[PropertyContext] Updating property:', id, mappedData);
                    const { data, error } = await propertyService.updateProperty(id, mappedData);
                    if (error) throw new Error(error);
                    if (data) {
                        const updatedProp = mapServiceToContextProperty(data);
                        setProperties(prev => prev.map(p => p.id === id ? updatedProp : p));
                        return updatedProp;
                    }
                    return null;
                } catch (err: any) {
                    console.error('[PropertyContext] updateProperty error:', err);
                    setError(err.message);
                    return null;
                } finally {
                    setLoading(false);
                }
            },
            deleteProperty: async (id: string) => {
                setLoading(true);
                try {
                    const { error } = await propertyService.deleteProperty(id);
                    if (error) throw new Error(error);
                    setProperties(prev => prev.filter(p => p.id !== id));
                    setSelectedProperties(prev => prev.filter(pid => pid !== id));
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            },
            deleteProperties: async (ids: string[]) => {
                setLoading(true);
                try {
                    // Execute sequentially or parallel. Parallel is faster.
                    await Promise.all(ids.map(id => propertyService.deleteProperty(id)));
                    setProperties(prev => prev.filter(p => !ids.includes(p.id)));
                    setSelectedProperties([]);
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            },
            duplicateProperty: async (id: string) => {
                const propertyToDuplicate = properties.find(p => p.id === id);
                if (!propertyToDuplicate) return null;

                setLoading(true);
                try {
                    const { id: _, createdAt, updatedAt, ...rest } = propertyToDuplicate;
                    const newPropertyData = {
                        ...rest,
                        title: `${rest.title} (Copy)`,
                        status: 'draft' as PropertyStatus
                    };
                    const mappedData = mapContextToServiceProperty(newPropertyData);
                    const { data, error } = await propertyService.createProperty(mappedData);
                    if (error) throw new Error(error);
                    if (data) {
                        const newProp = mapServiceToContextProperty(data);
                        setProperties(prev => [newProp, ...prev]);
                        return newProp;
                    }
                    return null;
                } catch (err: any) {
                    setError(err.message);
                    return null;
                } finally {
                    setLoading(false);
                }
            },
            getProperty: (id) => properties.find(p => p.id === id),
            uploadImages: async () => [],
            uploadVideos: async () => [],
            selectProperty: (id) => setSelectedProperties(prev => [...prev, id]),
            deselectProperty: (id) => setSelectedProperties(prev => prev.filter(pId => pId !== id)),
            selectAllProperties: () => setSelectedProperties(properties.map(p => p.id)),
            clearSelection: () => setSelectedProperties([]),
            bulkUpdateStatus: async (ids: string[], status: PropertyStatus) => {
                setLoading(true);
                try {
                    await Promise.all(ids.map(id => propertyService.updateProperty(id, { status })));
                    setProperties(prev => prev.map(p => ids.includes(p.id) ? { ...p, status } : p));
                    setSelectedProperties([]);
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setLoading(false);
                }
            },
            setFilters: setFiltersState,
            clearFilters: () => setFiltersState({}),
            setSort,
            setPage: (page) => setPagination(prev => ({ ...prev, page })),
            setLimit: (limit) => setPagination(prev => ({ ...prev, limit })),
            incrementViews: async (id) => {
                // Currently just optimistic update, backend should handle real views
                setProperties(prev => prev.map(p => p.id === id ? { ...p, analytics: { ...p.analytics, views: (p.analytics?.views || 0) + 1 } } : p));
            },
            incrementInquiries: async (id) => {
                setProperties(prev => prev.map(p => p.id === id ? { ...p, analytics: { ...p.analytics, inquiries: (p.analytics?.inquiries || 0) + 1 } } : p));
            },
            incrementShares: async (id) => {
                setProperties(prev => prev.map(p => p.id === id ? { ...p, analytics: { ...p.analytics, shares: (p.analytics?.shares || 0) + 1 } } : p));
            },
            exportProperties: () => { },
            formatPrice: (price) => price ? new Intl.NumberFormat('en-US', { style: 'currency', currency: price.currency }).format(price.amount) : '',
            formatArea: (area, unit) => `${area} ${unit}`,
            getPropertyStats: () => ({
                total: properties.length,
                available: properties.filter(p => p.status === 'available' || p.status === 'active').length,
                sold: properties.filter(p => p.status === 'sold').length,
                rented: properties.filter(p => p.status === 'rented' || p.status === 'let').length,
                pending: properties.filter(p => p.status === 'pending' || p.status === 'under_offer').length
            })
        }
        } >
            {children}
        </PropertyContext.Provider >
    );
};
