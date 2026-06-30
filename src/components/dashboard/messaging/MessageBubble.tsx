'use client';

import React, { useState } from 'react';
import { Check, CheckCheck, FileText, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { messagesService } from '@/services/messagesService';
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
    const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);
    const attachmentKeyFor = createDuplicateSafeKeyResolver('message-attachment');

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const handleOpenSupportAttachment = async (attachment: Attachment) => {
        if (!attachment.id) {
            toast.error('Attachment is unavailable.');
            return;
        }

        try {
            setOpeningAttachmentId(attachment.id);
            await messagesService.openSupportAttachment(attachment.id);
        } catch {
            toast.error('Unable to open this support attachment right now.');
        } finally {
            setOpeningAttachmentId(null);
        }
    };

    const renderAttachment = (attachment: Attachment) => {
        if (isSupportConversation) {
            const isOpening = openingAttachmentId === attachment.id;
            return (
                <button
                    type="button"
                    onClick={() => void handleOpenSupportAttachment(attachment)}
                    className="mt-2 flex w-full items-center gap-2 rounded-lg border border-white/10 bg-black/10 p-3 text-left transition hover:border-orange-300 hover:bg-black/15 dark:border-white/10 dark:bg-white/5 dark:hover:border-orange-400"
                >
                    <FileText size={20} className={isUser ? 'text-orange-100' : 'text-gray-600 dark:text-gray-300'} />
                    <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm font-medium ${isUser ? 'text-white' : 'text-gray-900 dark:text-gray-100'}`}>
                            {attachment.file_name}
                        </p>
                        <p className={`text-xs ${isUser ? 'text-orange-100/80' : 'text-gray-500 dark:text-gray-400'}`}>
                            {attachment.file_size ? `${(attachment.file_size / 1024).toFixed(1)} KB` : 'Support attachment'}
                        </p>
                    </div>
                    {isOpening ? (
                        <Loader2 size={16} className={`animate-spin ${isUser ? 'text-orange-100' : 'text-gray-500 dark:text-gray-400'}`} />
                    ) : (
                        <Download size={16} className={isUser ? 'text-orange-100' : 'text-gray-600 dark:text-gray-400'} />
                    )}
                </button>
            );
        }

        if ((attachment.mime_type || '').startsWith('image/')) {
            return (
                <div className="mt-2 rounded-lg overflow-hidden">
                    <img
                        src={attachment.file_url}
                        alt={attachment.file_name}
                        className="max-w-full h-auto max-h-64 object-cover"
                    />
                </div>
            );
        } else if (attachment.mime_type === 'application/pdf') {
            return (
                <div className="mt-2 flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <FileText size={20} className="text-gray-600 dark:text-gray-400" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {attachment.file_name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {attachment.file_size ? `${(attachment.file_size / 1024).toFixed(1)} KB` : 'PDF Document'}
                        </p>
                    </div>
                    <a
                        href={attachment.file_url}
                        download={attachment.file_name}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                        <Download size={16} />
                    </a>
                </div>
            );
        } else {
            return (
                <div className="mt-2 flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <FileText size={20} className="text-gray-600 dark:text-gray-400" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {attachment.file_name}
                        </p>
                    </div>
                    <a
                        href={attachment.file_url}
                        download={attachment.file_name}
                        className="p-2 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                    >
                        <Download size={16} />
                    </a>
                </div>
            );
        }
    };

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
