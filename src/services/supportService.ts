import { deleteMediaFile, uploadMediaFile, reassignMediaEntity } from '@/services/mediaService';
import { messagesService, type CreateTicketParams, type GetTicketsParams, type MessageAttachment, type SupportTicketDetail, type SupportTicketSummary, type UpdateTicketParams } from '@/services/messagesService';
import { userService } from '@/services/userService';
import type { User } from '@/types';

const SUPPORT_DRAFT_ENTITY = 'support_ticket_draft';
const SUPPORT_TICKET_ENTITY = 'support_ticket';

export interface SupportAttachmentDraft extends MessageAttachment {
    local_id: string;
}

export interface UploadSupportAttachmentsResult {
    attachments: SupportAttachmentDraft[];
    draftId: string;
}

export const supportService = {
    async getTickets(params: GetTicketsParams = {}) {
        return messagesService.getTickets(params);
    },

    async getTicket(ticketId: string) {
        return messagesService.getTicket(ticketId);
    },

    async createTicket(params: CreateTicketParams) {
        return messagesService.createTicket(params);
    },

    async updateTicket(ticketId: string, params: UpdateTicketParams) {
        return messagesService.updateTicket(ticketId, params);
    },

    async getTranscript(conversationId: string) {
        return messagesService.getMessages(conversationId);
    },

    async sendReply(conversationId: string, content: string, attachments: MessageAttachment[] = []) {
        return messagesService.sendMessage({
            conversationId,
            content,
            attachments,
            type: attachments.length > 0 && !content.trim() ? 'file' : 'text',
        });
    },

    async uploadAttachments(files: File[], draftId = crypto.randomUUID()): Promise<UploadSupportAttachmentsResult> {
        const attachments = await Promise.all(files.map(async (file) => {
            const uploaded = await uploadMediaFile(file, SUPPORT_DRAFT_ENTITY, draftId, '', false);
            return {
                local_id: uploaded.id,
                file_url: uploaded.file_url,
                file_name: uploaded.original_name || uploaded.file_name,
                mime_type: uploaded.mime_type,
                file_size: uploaded.file_size,
                storage_path: uploaded.storage_path,
            };
        }));

        return { attachments, draftId };
    },

    async finalizeDraftAttachments(draftId: string, ticketId: string) {
        if (!draftId || !ticketId) {
            return;
        }

        await reassignMediaEntity(SUPPORT_DRAFT_ENTITY, draftId, SUPPORT_TICKET_ENTITY, ticketId);
    },

    async removeDraftAttachment(attachmentId: string) {
        if (!attachmentId) {
            return;
        }

        await deleteMediaFile(attachmentId);
    },

    async getSupportAgents(): Promise<User[]> {
        const { data } = await userService.getAllUsers(1, 100);
        return data.filter((user) => user.role === 'admin' || user.role === 'support');
    },

    async findResumableTicket(params: { requesterRole?: string } = {}): Promise<SupportTicketSummary | null> {
        const tickets = await messagesService.getTickets({
            requester_role: params.requesterRole,
            limit: 20,
        });

        return tickets.find((ticket) => ticket.status === 'open' || ticket.status === 'in_progress') || null;
    },

    async refreshTicket(ticketId?: string): Promise<SupportTicketDetail | null> {
        if (!ticketId) {
            return null;
        }
        return messagesService.getTicket(ticketId);
    },

    async openAttachment(attachmentId: string) {
        return messagesService.openSupportAttachment(attachmentId);
    },
};
