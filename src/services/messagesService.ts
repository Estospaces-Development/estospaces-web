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
    metadata: string; // JSON string
    created_at: string;
    updated_at: string;
    messages?: Message[];
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
}

export interface CreateTicketParams {
    subject: string;
    message: string;
    category?: string;
    priority?: string;
}

// ── API Functions ───────────────────────────────────────────────────────────

/**
 * Get all conversations for the current user
 */
export async function getConversations(): Promise<Conversation[]> {
    return apiFetch<Conversation[]>(`${MESSAGING_URL()}/api/v1/conversations`);
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
    markAsRead,
    createTicket,
    getTickets,
    getTicket,
};
