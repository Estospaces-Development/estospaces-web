import React from 'react';
import { LifeBuoy, MessageSquareDashed } from 'lucide-react';
import type { Message } from '@/services/messagesService';

interface SupportTranscriptProps {
    messages: Message[];
    currentUserId?: string;
    otherLabel?: string;
    onOpenAttachment?: (attachmentId: string) => void;
}

export function SupportTranscript({ messages, currentUserId, otherLabel = 'Estospaces Support', onOpenAttachment }: SupportTranscriptProps) {
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

    return (
        <div className="space-y-4">
            {messages.map((message) => {
                const isMine = message.sender_id === currentUserId;
                return (
                    <div key={message.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[78%] rounded-[1.75rem] px-4 py-3 shadow-sm ${
                            isMine
                                ? 'bg-orange-500 text-white'
                                : 'border border-gray-100 bg-white text-gray-900 dark:border-gray-800 dark:bg-gray-900 dark:text-white'
                        }`}>
                            {!isMine && (
                                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-orange-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-orange-700 dark:bg-orange-500/15 dark:text-orange-200">
                                    <LifeBuoy className="h-3.5 w-3.5" />
                                    {otherLabel}
                                </div>
                            )}
                            <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                            {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {message.attachments.map((attachment) => (
                                        <button
                                            key={attachment.id || attachment.file_url}
                                            type="button"
                                            onClick={() => attachment.id && onOpenAttachment?.(attachment.id)}
                                            disabled={!attachment.id || !onOpenAttachment}
                                            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                                                isMine
                                                    ? 'bg-white/20 text-white'
                                                    : 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-200'
                                            } disabled:cursor-not-allowed disabled:opacity-70`}
                                        >
                                            {attachment.file_name}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <p className={`mt-2 text-xs ${isMine ? 'text-orange-100' : 'text-gray-400 dark:text-gray-500'}`}>
                                {new Date(message.created_at).toLocaleString()}
                            </p>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
