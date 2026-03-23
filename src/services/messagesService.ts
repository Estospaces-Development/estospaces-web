/**
 * Messages Service
 * Handles live chat and support tickets via the messaging-service backend.
 */

import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

const MESSAGING_URL = () => getServiceUrl('messaging');

// ── Types ──────────────────────────────────────────────────────────────────

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    content: string;
    type: 'text' | 'image' | 'file';
    is_read: boolean;
    read_at?: string;
    created_at: string;
}

export interface Conversation {
    id: string;
    type: 'direct' | 'support' | 'group';
    title?: string;
    metadata: string | Record<string, unknown>;
    is_archived?: boolean;
    is_muted?: boolean;
    created_at: string;
    updated_at: string;
    messages?: Message[];
    last_message?: Message | null;
    unread_count?: number;
    counterpart_id?: string;
    counterpart_name?: string;
    counterpart_email?: string;
    counterpart_phone?: string;
    counterpart_agency?: string;
    property_id?: string;
    property_title?: string;
    property_address?: string;
    property_image?: string;
    listing_type?: string;
    property_price?: number;
}

export interface SupportTicket {
    id: string;
    user_id: string;
    conversation_id: string;
    subject: string;
    category: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    created_at: string;
    updated_at: string;
}

export interface SendMessageParams {
    conversationId?: string;
    recipientId?: string;
    content: string;
    type?: 'text' | 'image' | 'file';
    context?: ConversationContext;
}

export interface CreateTicketParams {
    subject: string;
    message: string;
    category?: string;
    priority?: string;
}

export interface ConversationContext {
    propertyId?: string;
    propertyTitle?: string;
    propertyAddress?: string;
    propertyImage?: string;
    listingType?: string;
    propertyPrice?: number;
    senderName?: string;
    senderEmail?: string;
    senderPhone?: string;
    senderAgency?: string;
    recipientName?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    recipientAgency?: string;
}

// ── API Functions ───────────────────────────────────────────────────────────

/**
 * Get all conversations for the current user
 */
export async function getConversations(): Promise<Conversation[]> {
    return apiFetch<Conversation[]>(`${MESSAGING_URL()}/api/v1/conversations`, {
        suppressErrorToast: true,
    });
}

/**
 * Get messages for a specific conversation
 */
export async function getMessages(conversationId: string, page = 1, limit = 50): Promise<Message[]> {
    return apiFetch<Message[]>(`${MESSAGING_URL()}/api/v1/conversations/${conversationId}/messages?page=${page}&limit=${limit}`);
}

/**
 * Send a message
 */
export async function sendMessage(params: SendMessageParams): Promise<Message> {
    return apiFetch<Message>(`${MESSAGING_URL()}/api/v1/messages`, {
        method: 'POST',
        body: JSON.stringify({
            conversation_id: params.conversationId,
            recipient_id: params.recipientId,
            content: params.content,
            type: params.type || 'text',
            context: params.context
                ? {
                    property_id: params.context.propertyId,
                    property_title: params.context.propertyTitle,
                    property_address: params.context.propertyAddress,
                    property_image: params.context.propertyImage,
                    listing_type: params.context.listingType,
                    property_price: params.context.propertyPrice,
                    sender_name: params.context.senderName,
                    sender_email: params.context.senderEmail,
                    sender_phone: params.context.senderPhone,
                    sender_agency: params.context.senderAgency,
                    recipient_name: params.context.recipientName,
                    recipient_email: params.context.recipientEmail,
                    recipient_phone: params.context.recipientPhone,
                    recipient_agency: params.context.recipientAgency,
                }
                : undefined,
        }),
    });
}

export async function upsertDirectConversation(
    recipientId: string,
    context?: ConversationContext,
): Promise<Conversation> {
    return apiFetch<Conversation>(`${MESSAGING_URL()}/api/v1/conversations/direct`, {
        method: 'POST',
        body: JSON.stringify({
            recipient_id: recipientId,
            context: context
                ? {
                    property_id: context.propertyId,
                    property_title: context.propertyTitle,
                    property_address: context.propertyAddress,
                    property_image: context.propertyImage,
                    listing_type: context.listingType,
                    property_price: context.propertyPrice,
                    sender_name: context.senderName,
                    sender_email: context.senderEmail,
                    sender_phone: context.senderPhone,
                    sender_agency: context.senderAgency,
                    recipient_name: context.recipientName,
                    recipient_email: context.recipientEmail,
                    recipient_phone: context.recipientPhone,
                    recipient_agency: context.recipientAgency,
                }
                : undefined,
        }),
    });
}

/**
 * Mark a conversation's messages as read
 */
export async function markAsRead(conversationId: string): Promise<void> {
    await apiFetch(`${MESSAGING_URL()}/api/v1/conversations/${conversationId}/read`, {
        method: 'PUT',
    });
}

export async function updateConversationPreferences(
    conversationId: string,
    preferences: { is_archived?: boolean; is_muted?: boolean },
): Promise<void> {
    await apiFetch(`${MESSAGING_URL()}/api/v1/conversations/${conversationId}/preferences`, {
        method: 'PUT',
        body: JSON.stringify(preferences),
    });
}

/**
 * Create a support ticket
 */
export async function createTicket(params: CreateTicketParams): Promise<SupportTicket> {
    return apiFetch<SupportTicket>(`${MESSAGING_URL()}/api/v1/tickets`, {
        method: 'POST',
        body: JSON.stringify(params),
    });
}

/**
 * Get all tickets for the current user
 */
export async function getTickets(): Promise<SupportTicket[]> {
    return apiFetch<SupportTicket[]>(`${MESSAGING_URL()}/api/v1/tickets`);
}

/**
 * Get a specific ticket by ID
 */
export async function getTicket(ticketId: string): Promise<SupportTicket> {
    return apiFetch<SupportTicket>(`${MESSAGING_URL()}/api/v1/tickets/${ticketId}`);
}

// ── Default Export ──────────────────────────────────────────────────────────

export const messagesService = {
    getConversations,
    getMessages,
    sendMessage,
    upsertDirectConversation,
    markAsRead,
    updateConversationPreferences,
    createTicket,
    getTickets,
    getTicket,
};
