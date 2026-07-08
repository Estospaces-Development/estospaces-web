import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

const MESSAGING_URL = () => getServiceUrl('messaging');

export interface MessageAttachment {
    id?: string;
    media_id?: string;
    file_url: string;
    file_name: string;
    mime_type?: string;
    file_size?: number;
    storage_path?: string;
}

export interface Message {
    id: string;
    conversation_id: string;
    sender_id: string;
    sender_role?: string;
    sender?: {
        role?: string;
    };
    content: string;
    type: 'text' | 'image' | 'file';
    attachments?: MessageAttachment[];
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
    fast_track_case_id?: string;
}

export interface SupportRequesterContext {
    role?: string;
    name?: string;
    email?: string;
    page?: string;
    module?: string;
}

export interface SupportConversationSummary {
    id: string;
    type: 'support' | 'direct' | 'group';
    title?: string;
    updated_at: string;
    unread_count: number;
    last_message?: Message | null;
    requester_context?: SupportRequesterContext | null;
}

export interface SupportTicketSummary {
    id: string;
    user_id: string;
    requester_role: 'user' | 'manager' | 'admin' | 'support' | string;
    conversation_id: string;
    subject: string;
    category: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'open' | 'in_progress' | 'resolved' | 'closed';
    assignee_id?: string;
    created_at: string;
    updated_at: string;
    last_message_at: string;
    resolved_at?: string | null;
    closed_at?: string | null;
    unread_count: number;
    last_message?: Message | null;
    requester_context?: SupportRequesterContext | null;
}

export interface SupportTicketDetail extends SupportTicketSummary {
    conversation: SupportConversationSummary;
}

export interface SendMessageParams {
    conversationId?: string;
    recipientId?: string;
    content: string;
    type?: 'text' | 'image' | 'file';
    attachments?: MessageAttachment[];
    context?: ConversationContext;
}

export interface CreateTicketParams {
    subject: string;
    message: string;
    category?: string;
    priority?: string;
    attachments?: MessageAttachment[];
    requester_context?: SupportRequesterContext;
}

export interface UpdateTicketParams {
    status?: SupportTicketSummary['status'];
    priority?: SupportTicketSummary['priority'];
    assignee_id?: string;
}

export interface GetTicketsParams {
    status?: string;
    priority?: string;
    requester_role?: string;
    assignee?: string;
    search?: string;
    page?: number;
    limit?: number;
}

export interface ConversationContext {
    propertyId?: string | null;
    propertyTitle?: string | null;
    propertyAddress?: string | null;
    propertyImage?: string | null;
    listingType?: string | null;
    propertyPrice?: number | null;
    fastTrackCaseId?: string | null;
    senderName?: string;
    senderEmail?: string;
    senderPhone?: string;
    senderAgency?: string;
    recipientName?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    recipientAgency?: string;
}

const mapConversationContext = (context?: ConversationContext) => (
    context
        ? {
            property_id: context.propertyId,
            property_title: context.propertyTitle,
            property_address: context.propertyAddress,
            property_image: context.propertyImage,
            listing_type: context.listingType,
            property_price: context.propertyPrice,
            fast_track_case_id: context.fastTrackCaseId,
            sender_name: context.senderName,
            sender_email: context.senderEmail,
            sender_phone: context.senderPhone,
            sender_agency: context.senderAgency,
            recipient_name: context.recipientName,
            recipient_email: context.recipientEmail,
            recipient_phone: context.recipientPhone,
            recipient_agency: context.recipientAgency,
        }
        : undefined
);

export async function getConversations(): Promise<Conversation[]> {
    return apiFetch<Conversation[]>(`${MESSAGING_URL()}/api/v1/conversations`, {
        suppressErrorToast: true,
    });
}

export async function getAdminUserDirectConversations(userId: string, limit = 10): Promise<Conversation[]> {
    const searchParams = new URLSearchParams({ limit: String(limit) });
    return apiFetch<Conversation[]>(`${MESSAGING_URL()}/api/v1/admin/users/${encodeURIComponent(userId)}/direct-conversations?${searchParams.toString()}`, {
        suppressErrorToast: true,
    });
}

export async function getMessages(conversationId: string, page = 1, limit = 50): Promise<Message[]> {
    return apiFetch<Message[]>(`${MESSAGING_URL()}/api/v1/conversations/${conversationId}/messages?page=${page}&limit=${limit}`, {
        suppressErrorToast: true,
    });
}

export async function sendMessage(params: SendMessageParams): Promise<Message> {
    return apiFetch<Message>(`${MESSAGING_URL()}/api/v1/messages`, {
        method: 'POST',
        suppressErrorToast: true,
        body: JSON.stringify({
            conversation_id: params.conversationId,
            recipient_id: params.recipientId,
            content: params.content,
            type: params.type || 'text',
            attachments: params.attachments || [],
            context: mapConversationContext(params.context),
        }),
    });
}

export async function upsertDirectConversation(
    recipientId: string,
    context?: ConversationContext,
): Promise<Conversation> {
    return apiFetch<Conversation>(`${MESSAGING_URL()}/api/v1/conversations/direct`, {
        method: 'POST',
        suppressErrorToast: true,
        body: JSON.stringify({
            recipient_id: recipientId,
            context: mapConversationContext(context),
        }),
    });
}

export async function markAsRead(conversationId: string): Promise<void> {
    await apiFetch(`${MESSAGING_URL()}/api/v1/conversations/${conversationId}/read`, {
        method: 'PUT',
        suppressErrorToast: true,
    });
}

export async function updateConversationPreferences(
    conversationId: string,
    preferences: { is_archived?: boolean; is_muted?: boolean },
): Promise<void> {
    await apiFetch(`${MESSAGING_URL()}/api/v1/conversations/${conversationId}/preferences`, {
        method: 'PUT',
        suppressErrorToast: true,
        body: JSON.stringify(preferences),
    });
}

export async function createTicket(params: CreateTicketParams): Promise<SupportTicketDetail> {
    return apiFetch<SupportTicketDetail>(`${MESSAGING_URL()}/api/v1/tickets`, {
        method: 'POST',
        suppressErrorToast: true,
        body: JSON.stringify(params),
    });
}

export async function getTickets(params: GetTicketsParams = {}): Promise<SupportTicketSummary[]> {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            searchParams.set(key, String(value));
        }
    });

    const queryString = searchParams.toString();
    return apiFetch<SupportTicketSummary[]>(`${MESSAGING_URL()}/api/v1/tickets${queryString ? `?${queryString}` : ''}`, {
        suppressErrorToast: true,
    });
}

export async function getTicket(ticketId: string): Promise<SupportTicketDetail> {
    return apiFetch<SupportTicketDetail>(`${MESSAGING_URL()}/api/v1/tickets/${ticketId}`, {
        suppressErrorToast: true,
    });
}

export async function updateTicket(ticketId: string, params: UpdateTicketParams): Promise<SupportTicketDetail> {
    return apiFetch<SupportTicketDetail>(`${MESSAGING_URL()}/api/v1/tickets/${ticketId}`, {
        method: 'PATCH',
        suppressErrorToast: true,
        body: JSON.stringify(params),
    });
}

export async function updateTicketStatus(
    ticketId: string,
    status: SupportTicketSummary['status'],
): Promise<SupportTicketDetail> {
    return apiFetch<SupportTicketDetail>(`${MESSAGING_URL()}/api/v1/tickets/${ticketId}/status`, {
        method: 'PUT',
        suppressErrorToast: true,
        body: JSON.stringify({ status }),
    });
}

export async function getSupportAttachmentAccessUrl(attachmentId: string): Promise<{ access_url: string; expires_at: string }> {
    return apiFetch<{ access_url: string; expires_at: string }>(`${MESSAGING_URL()}/api/v1/support/attachments/${attachmentId}/access-url`, {
        suppressErrorToast: true,
    });
}

export async function openSupportAttachment(attachmentId: string): Promise<void> {
    const data = await getSupportAttachmentAccessUrl(attachmentId);
    if (!data.access_url) {
        throw new Error('Attachment access URL is unavailable.');
    }
    window.open(data.access_url, '_blank', 'noopener,noreferrer');
}

export const messagesService = {
    getConversations,
    getAdminUserDirectConversations,
    getMessages,
    sendMessage,
    upsertDirectConversation,
    markAsRead,
    updateConversationPreferences,
    createTicket,
    getTickets,
    getTicket,
    updateTicket,
    updateTicketStatus,
    getSupportAttachmentAccessUrl,
    openSupportAttachment,
};
