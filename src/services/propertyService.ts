import { silentFetch } from '@/lib/apiUtils';

const CORE_SERVICE_URL = process.env.NEXT_PUBLIC_CORE_SERVICE_URL || 'http://localhost:8080';

export interface Property {
    id: string;
    title: string;
    address_line_1: string;
    city: string;
    postcode: string;
    price: number;
    bedrooms: number;
    bathrooms: number;
    area?: number;
    property_type: 'rent' | 'sale';
    image_urls?: string[];
    description?: string;
    view_count?: number;
    latitude?: string;
    longitude?: string;
    created_at?: string;
    has_virtual_tour?: boolean;
    virtual_tour_url?: string;
    agent_name?: string;
    is_applied?: boolean;
    application_status?: string;
}

export const MOCK_PROPERTIES: Property[] = [
    {
        id: 'prop-1',
        title: 'Modern Luxury Apartment',
        address_line_1: '123 Canary Wharf',
        city: 'London',
        postcode: 'E14 5AB',
        price: 3500,
        bedrooms: 2,
        bathrooms: 2,
        area: 950,
        property_type: 'rent',
        image_urls: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
        description: 'A stunning modern apartment with river views.',
        view_count: 124,
        latitude: '51.5054',
        longitude: '-0.0235',
        agent_name: 'Premium Estates',
        has_virtual_tour: true
    },
    {
        id: 'prop-2',
        title: 'Executive Penthouse',
        address_line_1: '45 Victoria Street',
        city: 'London',
        postcode: 'SW1E 6AS',
        price: 1250000,
        bedrooms: 3,
        bathrooms: 3,
        area: 2100,
        property_type: 'sale',
        image_urls: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800'],
        description: 'Exclusive penthouse with panoramic city views.',
        view_count: 89,
        latitude: '51.4984',
        longitude: '-0.1335',
        agent_name: 'Luxury Living',
        has_virtual_tour: true
    },
    {
        id: 'prop-3',
        title: 'Cozy Family Home',
        address_line_1: '78 Garden Road',
        city: 'Manchester',
        postcode: 'M14 6RF',
        price: 450000,
        bedrooms: 4,
        bathrooms: 2,
        area: 1650,
        property_type: 'sale',
        image_urls: ['https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?w=800'],
        description: 'Perfect family home with a large garden.',
        view_count: 56,
        latitude: '53.4808',
        longitude: '-2.2426',
        agent_name: 'North Homes'
    },
    {
        id: 'prop-4',
        title: 'Stylish Studio',
        address_line_1: '12 Creative Lane',
        city: 'Bristol',
        postcode: 'BS1 2EQ',
        price: 1200,
        bedrooms: 1,
        bathrooms: 1,
        area: 450,
        property_type: 'rent',
        image_urls: ['https://images.unsplash.com/photo-1536376074432-8d2a3d31707d?w=800'],
        description: 'Compact and stylish studio in the city heart.',
        view_count: 210,
        latitude: '51.4545',
        longitude: '-2.5879',
        agent_name: 'Urban Rentals'
    }
];

const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('esto_token') : '';
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export const getProperties = async (filters: any = {}) => {
    const url = new URL(`${CORE_SERVICE_URL}/api/v1/properties`);
    Object.keys(filters).forEach(key => {
        if (filters[key]) url.searchParams.append(key, filters[key]);
    });

    return silentFetch<Property[]>(
        url.toString(),
        { headers: getHeaders() },
        MOCK_PROPERTIES,
        'propertyService'
    );
};

export const getPropertyById = async (id: string) => {
    const mockProp = MOCK_PROPERTIES.find(p => p.id === id) || MOCK_PROPERTIES[0];

    return silentFetch<Property>(
        `${CORE_SERVICE_URL}/api/v1/properties/${id}`,
        { headers: getHeaders() },
        mockProp,
        'propertyService'
    );
};
