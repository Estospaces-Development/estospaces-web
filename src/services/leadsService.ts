import { silentFetch } from '@/lib/apiUtils';

const CORE_SERVICE_URL = process.env.NEXT_PUBLIC_CORE_SERVICE_URL || 'http://localhost:8080';

export interface Lead {
    id: string;
    lead_number?: string;
    property_id?: string;
    user_id?: string;
    broker_id?: string;
    status: string;
    sla_start_time?: string;
    sla_deadline?: string;
    sla_status?: string;
    property?: {
        id: string;
        title: string;
        address_line_1: string;
        city: string;
        price: number;
        image_urls: string;
        property_type: string;
        agent_name: string;
    };
    // UI specific fields (mapped or from mock data)
    name: string;
    email: string;
    phone?: string;
    propertyInterested: string;
    score: number;
    budget: string;
    lastContact: string;

    created_at: string;
    updated_at: string;
}

export const MOCK_LEADS: Lead[] = [
    {
        id: 'lead-1',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+44 7700 900123',
        status: 'new',
        propertyInterested: 'Modern Luxury Apartment',
        score: 85,
        budget: '£3,000 - £4,000',
        lastContact: '2 hours ago',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        property: {
            id: 'prop-1',
            title: 'Modern Luxury Apartment',
            address_line_1: '123 Canary Wharf',
            city: 'London',
            price: 3500,
            image_urls: JSON.stringify(['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800']),
            property_type: 'rent',
            agent_name: 'Premium Estates'
        }
    },
    {
        id: 'lead-2',
        name: 'Jane Smith',
        email: 'jane@example.com',
        phone: '+44 7700 900456',
        status: 'contacted',
        propertyInterested: 'Executive Penthouse',
        score: 92,
        budget: '£1,000,000+',
        lastContact: '1 day ago',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        property: {
            id: 'prop-2',
            title: 'Executive Penthouse',
            address_line_1: '45 Victoria Street',
            city: 'London',
            price: 1250000,
            image_urls: JSON.stringify(['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800']),
            property_type: 'sale',
            agent_name: 'Luxury Living'
        }
    }
];

const getHeaders = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('esto_token') : '';
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

/**
 * Fetch leads for the logged-in user
 */
export const getUserLeads = async () => {
    return silentFetch<Lead[]>(
        `${CORE_SERVICE_URL}/api/v1/leads/mine`,
        { headers: getHeaders() },
        MOCK_LEADS,
        'leadsService'
    );
};

/**
 * Fetch leads for the logged-in broker
 */
export const getBrokerLeads = async (status?: string) => {
    try {
        const url = new URL(`${CORE_SERVICE_URL}/api/v1/leads/broker`);
        if (status) url.searchParams.append('status', status);

        const response = await fetch(url.toString(), {
            headers: getHeaders()
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch broker leads');
        }

        return { data: data.data as Lead[], error: null };
    } catch (error: any) {
        console.error('Error fetching broker leads:', error);
        return { data: null, error: error.message };
    }
};

/**
 * Fetch a single lead by ID
 */
export const getLeadById = async (leadId: string) => {
    try {
        const response = await fetch(`${CORE_SERVICE_URL}/api/v1/leads/${leadId}`, {
            headers: getHeaders()
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch lead');
        }

        return { data: data as Lead, error: null };
    } catch (error: any) {
        console.error('Error fetching lead details:', error);
        return { data: null, error: error.message };
    }
};

/**
 * Update lead status
 */
export const updateLeadStatus = async (leadId: string, status: string) => {
    try {
        const response = await fetch(`${CORE_SERVICE_URL}/api/v1/leads/${leadId}/status`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ status })
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to update lead status');
        }

        return { data, error: null };
    } catch (error: any) {
        console.error('Error updating lead status:', error);
        return { data: null, error: error.message };
    }
};
