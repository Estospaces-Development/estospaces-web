/**
 * Common Type Definitions
 */

export interface Property {
    id: string;
    title: string;
    address_line_1: string;
    address_line_2?: string;
    city: string;
    county?: string;
    postcode: string;
    country: string;
    price: number;
    property_type: string;
    listing_type: 'rent' | 'sale';
    bedrooms: number;
    bathrooms: number;
    description: string;
    features: string[];
    image_urls: string[];
    video_url?: string;
    virtual_tour_url?: string;
    status: 'online' | 'offline' | 'draft' | 'under_offer' | 'sold' | 'let';
    agent_id: string;
    agent_name?: string;
    agent_company?: string;
    created_at: string;
    updated_at: string;
}

export interface Booking {
    id: string;
    property_id: string;
    guest_id: string;
    host_id: string;
    start_date: string;
    end_date: string;
    total_price: number;
    status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
    payment_status: 'unpaid' | 'paid' | 'partially_paid' | 'refunded';
    guests_count: number;
    notes?: string;
    created_at: string;
    updated_at: string;
    property?: Property;
}

export interface User {
    id: string;
    email: string;
    full_name: string;
    role: 'user' | 'manager' | 'admin';
    phone?: string;
    avatar_url?: string;
    bio?: string;
    is_verified: boolean;
    created_at: string;
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    is_read: boolean;
    created_at: string;
}

export interface Conversation {
    id: string;
    participant_ids: string[];
    last_message?: Message;
    updated_at: string;
    other_participant?: User;
}

export interface AnalyticsSummary {
    total_users: number;
    total_properties: number;
    total_bookings: number;
    total_revenue: number;
    active_listings: number;
    pending_verifications: number;
    growth_rate: number;
    revenue_chart: { date: string; amount: number }[];
}

export interface APIResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: string;
}
