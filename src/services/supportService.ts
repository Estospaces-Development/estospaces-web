import { deleteMediaFile, uploadMediaFile, reassignMediaEntity } from '@/services/mediaService';
import { messagesService, type CreateTicketParams, type GetTicketsParams, type MessageAttachment, type SupportTicketDetail, type SupportTicketSummary, type UpdateTicketParams } from '@/services/messagesService';
import { userService } from '@/services/userService';
import type { User } from '@/types';

const SUPPORT_DRAFT_ENTITY = 'support_ticket_draft';
const SUPPORT_TICKET_ENTITY = 'support_ticket';
const SUPPORT_TRANSCRIPT_PAGE_SIZE = 50;
const SUPPORT_AGENT_PAGE_SIZE = 100;
const SUPPORT_TICKET_PAGE_SIZE = 100;
const MAX_SUPPORT_PAGES = 25;

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

    async getAllTickets(params: GetTicketsParams = {}) {
        const tickets: SupportTicketSummary[] = [];
        const pageSize = params.limit || SUPPORT_TICKET_PAGE_SIZE;

        for (let page = 1; page <= MAX_SUPPORT_PAGES; page += 1) {
            const pageData = await messagesService.getTickets({
                ...params,
                page,
                limit: pageSize,
            });
            tickets.push(...pageData);

            if (pageData.length < pageSize) {
                break;
            }
        }

        return tickets;
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
        const transcript: Awaited<ReturnType<typeof messagesService.getMessages>> = [];

        for (let page = 1; page <= MAX_SUPPORT_PAGES; page += 1) {
            const pageMessages = await messagesService.getMessages(conversationId, page, SUPPORT_TRANSCRIPT_PAGE_SIZE);
            transcript.push(...pageMessages);

            if (pageMessages.length < SUPPORT_TRANSCRIPT_PAGE_SIZE) {
                break;
            }
        }

        return transcript;
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
        const agents: User[] = [];
        const seen = new Set<string>();

        for (let page = 1; page <= MAX_SUPPORT_PAGES; page += 1) {
            const { data, pagination } = await userService.getAllUsers(page, SUPPORT_AGENT_PAGE_SIZE);
            for (const user of data) {
                if ((user.role === 'admin' || user.role === 'support') && !seen.has(user.id)) {
                    seen.add(user.id);
                    agents.push(user);
                }
            }

            const totalPages = Number(pagination?.total_pages || 0);
            if (totalPages > 0 && page >= totalPages) {
                break;
            }
            if (data.length < SUPPORT_AGENT_PAGE_SIZE) {
                break;
            }
        }

        return agents;
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
