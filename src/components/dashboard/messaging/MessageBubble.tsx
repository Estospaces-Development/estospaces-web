'use client';

import React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { SupportAttachmentPreview } from '@/components/support/SupportAttachmentPreview';
import { useToast } from '@/contexts/ToastContext';
import {
    getConversationAttachmentAccessUrl,
    getSupportAttachmentAccessUrl,
    messagesService,
} from '@/services/messagesService';
import Avatar from '@/components/ui/Avatar';
import { createDuplicateSafeKeyResolver } from '@/lib/reactListKeys';

interface Attachment {
    id?: string;
    file_url: string;
    file_name: string;
    mime_type?: string;
    file_size?: number;
}

interface Message {
    text?: string;
    timestamp: string;
    read?: boolean;
    delivered?: boolean;
    attachments?: Attachment[];
}

interface MessageBubbleProps {
    message: Message;
    isUser: boolean;
    isSupportConversation?: boolean;
    showAvatar?: boolean;
    agentUserId?: string;
    agentName?: string;
    agentAvatar?: string;
}

const MessageBubble = ({ message, isUser, isSupportConversation = false, showAvatar, agentUserId, agentName = '', agentAvatar }: MessageBubbleProps) => {
    const toast = useToast();
    const attachmentKeyFor = createDuplicateSafeKeyResolver('message-attachment');

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const handleOpenAttachment = async (attachmentId: string) => {
        if (!attachmentId) {
            toast.error('Attachment is unavailable.');
            return;
        }

        try {
            if (isSupportConversation) {
                await messagesService.openSupportAttachment(attachmentId);
            } else {
                await messagesService.openConversationAttachment(attachmentId);
            }
        } catch {
            toast.error('Unable to open this attachment right now.');
        }
    };

    // Attachments are private files: previews and downloads always go through a
    // short-lived signed URL issued after a server-side participant check.
    const renderAttachment = (attachment: Attachment) => (
        <div className="mt-2">
            <SupportAttachmentPreview
                attachment={attachment}
                emphasized={isUser}
                getAccessUrl={isSupportConversation ? getSupportAttachmentAccessUrl : getConversationAttachmentAccessUrl}
                onOpenAttachment={(attachmentId) => void handleOpenAttachment(attachmentId)}
            />
        </div>
    );

    return (
        <div className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {/* Avatar (only for agent messages) */}
            {!isUser && showAvatar && (
                <div className="flex-shrink-0">
                    <Avatar
                        userId={isSupportConversation ? undefined : agentUserId}
                        src={agentAvatar}
                        name={agentName}
                        size="sm"
                    />
                </div>
            )}

            {/* Message Bubble */}
            <div
                className={`max-w-[70%] lg:max-w-[60%] rounded-lg px-4 py-2 ${isUser
                        ? 'bg-orange-500 text-white rounded-br-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm'
                    }`}
            >
                {/* Message Text */}
                {message.text && (
                    <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>
                )}

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                    <div>
                        {message.attachments.map((attachment, attachmentIndex) => (
                            <div key={attachmentKeyFor(attachment.id || attachment.file_url || attachment.file_name, attachmentIndex)}>{renderAttachment(attachment)}</div>
                        ))}
                    </div>
                )}

                {/* Timestamp and Status */}
                <div
                    className={`flex items-center gap-1.5 mt-1 ${isUser ? 'justify-end' : 'justify-start'
                        }`}
                >
                    <span
                        className={`text-xs ${isUser ? 'text-orange-100' : 'text-gray-500 dark:text-gray-400'
                            }`}
                    >
                        {formatTime(message.timestamp)}
                    </span>
                    {isUser && (
                        <span className="text-orange-100">
                            {message.read ? (
                                <CheckCheck size={14} className="text-blue-300" />
                            ) : message.delivered ? (
                                <CheckCheck size={14} />
                            ) : (
                                <Check size={14} />
                            )}
                        </span>
                    )}
                </div>
            </div>

            {/* Spacer for alignment when no avatar */}
            {!isUser && !showAvatar && <div className="w-8" />}
        </div>
    );
};

export default MessageBubble;
