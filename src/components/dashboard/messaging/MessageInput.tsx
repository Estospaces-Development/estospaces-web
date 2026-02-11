"use client";

import React, { useState } from 'react';
import { Send, Paperclip, Smile } from 'lucide-react';
import { useMessages } from '@/contexts/MessagesContext';

interface MessageInputProps {
    conversationId: string;
    onSend?: (id: string, text: string, attachments: any[]) => void;
}

export default function MessageInput({ conversationId, onSend }: MessageInputProps) {
    const [message, setMessage] = useState('');
    const { sendMessage } = useMessages();

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        if (onSend) {
            onSend(conversationId, message, []);
        } else {
            await sendMessage(conversationId, message, []);
        }
        setMessage('');
    };

    return (
        <div className="p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
            <form onSubmit={handleSend} className="flex items-center gap-2">
                <button
                    type="button"
                    className="p-2 text-gray-400 hover:text-orange-500 transition-colors"
                >
                    <Paperclip size={20} />
                </button>

                <div className="flex-1 relative">
                    <input
                        type="text"
                        placeholder="Type your message..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="w-full pl-4 pr-10 py-2.5 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all text-sm text-gray-900 dark:text-white"
                    />
                    <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-500"
                    >
                        <Smile size={18} />
                    </button>
                </div>

                <button
                    type="submit"
                    disabled={!message.trim()}
                    className="p-2.5 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 disabled:opacity-50 disabled:shadow-none transition-all active:scale-95"
                >
                    <Send size={20} />
                </button>
            </form>
        </div>
    );
}
