'use client';

import React from 'react';
import { Check, CheckCheck, FileText, Download } from 'lucide-react';

interface Attachment {
    id: string;
    type: string;
    url: string;
    name: string;
    size?: number;
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
    showAvatar?: boolean;
    agentName?: string;
    agentAvatar?: string;
}

const MessageBubble = ({ message, isUser, showAvatar, agentName = '', agentAvatar }: MessageBubbleProps) => {
    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
        });
    };

    const renderAttachment = (attachment: Attachment) => {
        if (attachment.type.startsWith('image/')) {
            return (
                <div className="mt-2 rounded-lg overflow-hidden">
                    <img
                        src={attachment.url}
                        alt={attachment.name}
                        className="max-w-full h-auto max-h-64 object-cover"
                    />
                </div>
            );
        } else if (attachment.type === 'application/pdf') {
            return (
                <div className="mt-2 flex items-center gap-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <FileText size={20} className="text-gray-600 dark:text-gray-400" />
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {attachment.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {attachment.size ? `${(attachment.size / 1024).toFixed(1)} KB` : 'PDF Document'}
                        </p>
                    </div>
                    <a
                        href={attachment.url}
                        download={attachment.name}
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
                            {attachment.name}
                        </p>
                    </div>
                    <a
                        href={attachment.url}
                        download={attachment.name}
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
                    {agentAvatar ? (
                        <img
                            src={agentAvatar}
                            alt={agentName}
                            className="w-8 h-8 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                            {agentName.charAt(0).toUpperCase()}
                        </div>
                    )}
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
                        {message.attachments.map((attachment) => (
                            <div key={attachment.id}>{renderAttachment(attachment)}</div>
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
