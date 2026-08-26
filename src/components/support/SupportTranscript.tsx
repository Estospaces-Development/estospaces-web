import React from 'react';
import { LifeBuoy, MessageSquareDashed } from 'lucide-react';
import { SupportAttachmentPreview } from '@/components/support/SupportAttachmentPreview';
import type { Message } from '@/services/messagesService';
import { createDuplicateSafeKeyResolver } from '@/lib/reactListKeys';
import { formatSupportTimestamp, resolveSupportTranscriptMessagePresentation, type SupportTranscriptPerspective } from '@/lib/supportTranscript';

interface SupportTranscriptProps {
    messages: Message[];
    currentUserId?: string;
    requesterUserId?: string;
    requesterLabel?: string;
    supportLabel?: string;
    staffUserIds?: string[];
    perspective?: SupportTranscriptPerspective;
    otherLabel?: string;
    onOpenAttachment?: (attachmentId: string) => void;
}

export function SupportTranscript({
    messages,
    currentUserId,
    requesterUserId,
    requesterLabel = 'Requester',
    supportLabel,
    staffUserIds,
    perspective = 'requester',
    otherLabel = 'Estospaces Support',
    onOpenAttachment,
}: SupportTranscriptProps) {
    if (messages.length === 0) {
        return (
            <div className="flex min-h-[280px] flex-col items-center justify-center rounded-[2rem] border border-dashed border-orange-200 bg-white/70 px-6 text-center dark:border-orange-500/20 dark:bg-gray-900/60">
                <MessageSquareDashed className="mb-4 h-10 w-10 text-orange-400" />
                <p className="text-base font-semibold text-gray-900 dark:text-white">No messages yet</p>
                <p className="mt-2 max-w-sm text-sm text-gray-500 dark:text-gray-400">
                    Start the conversation here and the transcript will stay attached to this support ticket.
                </p>
            </div>
        );
    }

    const messageKeyFor = createDuplicateSafeKeyResolver('support-message');

    return (
        <div className="space-y-4">
            {messages.map((message, messageIndex) => {
                const presentation = resolveSupportTranscriptMessagePresentation({
                    senderId: message.sender_id,
                    currentUserId,
                    requesterUserId,
                    perspective,
                    senderRole: message.sender_role || message.sender?.role,
                    staffUserIds,
                });
                const participantLabel = presentation.participant === 'requester'
                    ? requesterLabel
                    : (supportLabel || otherLabel);
                const messageKey = messageKeyFor(message.id, messageIndex);
                const attachmentKeyFor = createDuplicateSafeKeyResolver(`support-attachment-${messageKey}`);
                return (
                    <div key={messageKey} className={`flex ${presentation.alignsEnd ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] rounded-[1.75rem] px-4 py-3 shadow-sm ${
                            presentation.emphasized
                                ? 'bg-orange-700 text-white'
                                : 'border border-gray-100 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white'
                        }`}>
                            {presentation.showParticipantLabel && (
                                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-orange-700 dark:bg-orange-500/15 dark:text-orange-200">
                                    <LifeBuoy className="h-3.5 w-3.5" />
                                    {participantLabel}
                                </div>
                            )}
                            <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                            {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
                                    {message.attachments.map((attachment, attachmentIndex) => (
                                        <SupportAttachmentPreview
                                            key={attachmentKeyFor(attachment.id || attachment.file_url || attachment.file_name, attachmentIndex)}
                                            attachment={attachment}
                                            emphasized={presentation.emphasized}
                                            onOpenAttachment={onOpenAttachment}
                                        />
                                    ))}
                                </div>
                            )}
                            <p className={`mt-2 text-xs ${presentation.emphasized ? 'text-orange-50' : 'text-gray-500 dark:text-gray-300'}`}>
                                {formatSupportTimestamp(message.created_at)}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
