'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, MessageSquare } from 'lucide-react';

interface Message {
    id: string;
    senderId: string;
    text: string;
    timestamp: string;
}

interface Broker {
    name: string;
    isOnline: boolean;
}

interface MessageWindowProps {
    broker: Broker | null;
    messages: Message[];
    onSendMessage: (text: string) => void;
}

const MessageWindow = ({ broker, messages, onSendMessage }: MessageWindowProps) => {
    const [messageText, setMessageText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (messageText.trim()) {
            onSendMessage(messageText);
            setMessageText('');
        }
    };

    const formatTime = (timestamp: string) => {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    if (!broker) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <MessageSquare size={64} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-gray-500">Select a conversation to start messaging</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 flex flex-col bg-white">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold">
                            {broker.name.charAt(0).toUpperCase()}
                        </div>
                        <div
                            className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${broker.isOnline ? 'bg-green-500' : 'bg-gray-400'
                                }`}
                        />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{broker.name}</h3>
                        <p className="text-sm text-gray-500">
                            {broker.isOnline ? (
                                <span className="flex items-center gap-1">
                                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                    Online
                                </span>
                            ) : (
                                'Offline'
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((message, index) => {
                    const isUser = message.senderId === 'user';
                    const showTimestamp =
                        index === 0 ||
                        new Date(message.timestamp).getTime() - new Date(messages[index - 1].timestamp).getTime() > 300000; // 5 minutes

                    return (
                        <div key={message.id}>
                            {showTimestamp && (
                                <div className="text-center mb-4">
                                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                        {new Date(message.timestamp).toLocaleDateString()}
                                    </span>
                                </div>
                            )}
                            <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                                <div
                                    className={`max-w-[70%] rounded-lg px-4 py-2 ${isUser
                                            ? 'bg-orange-500 text-white'
                                            : 'bg-gray-100 text-gray-900'
                                        }`}
                                >
                                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                                    <span
                                        className={`text-xs mt-1 block ${isUser ? 'text-orange-100' : 'text-gray-500'
                                            }`}
                                    >
                                        {formatTime(message.timestamp)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
                <form onSubmit={handleSend} className="flex items-end gap-2">
                    <button
                        type="button"
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <Paperclip size={20} />
                    </button>
                    <input
                        type="text"
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <button
                        type="submit"
                        disabled={!messageText.trim()}
                        className="p-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default MessageWindow;
