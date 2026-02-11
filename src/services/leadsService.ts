const CORE_SERVICE_URL = 'http://localhost:8080';

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
    try {
        const response = await fetch(`${CORE_SERVICE_URL}/api/v1/leads/mine`, {
            headers: getHeaders()
        });
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch leads');
        }

        return { data: data.data as Lead[], error: null };
    } catch (error: any) {
        console.error('Error fetching user leads:', error);
        return { data: null, error: error.message };
    }
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
