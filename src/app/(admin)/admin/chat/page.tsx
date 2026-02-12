"use client";

import React, { useState } from 'react';
import { MessageSquare, Send, Search, User, Clock } from 'lucide-react';
import Avatar from '../../../../components/ui/Avatar';
import Badge from '../../../../components/ui/Badge';

interface Message {
    id: string;
    sender: 'admin' | 'user';
    senderName: string;
    content: string;
    time: string;
}

interface Conversation {
    id: string;
    userName: string;
    userRole: string;
    lastMessage: string;
    lastTime: string;
    unread: number;
    messages: Message[];
}

const mockConversations: Conversation[] = [
    {
        id: 'conv-1', userName: 'James Thompson', userRole: 'User',
        lastMessage: 'I need help with my property verification', lastTime: '2 min ago', unread: 2,
        messages: [
            { id: 'm1', sender: 'user', senderName: 'James Thompson', content: 'Hello, I submitted my verification documents but haven\'t heard back.', time: '10:15 AM' },
            { id: 'm2', sender: 'admin', senderName: 'Admin', content: 'Hi James, let me check your submission status.', time: '10:18 AM' },
            { id: 'm3', sender: 'user', senderName: 'James Thompson', content: 'I need help with my property verification', time: '10:20 AM' },
        ],
    },
    {
        id: 'conv-2', userName: 'Olivia Williams', userRole: 'Broker',
        lastMessage: 'Commission payment query for last month', lastTime: '15 min ago', unread: 0,
        messages: [
            { id: 'm4', sender: 'user', senderName: 'Olivia Williams', content: 'Hi, I have a question about my commission for the deal closed last week.', time: '9:45 AM' },
            { id: 'm5', sender: 'admin', senderName: 'Admin', content: 'Sure, which deal are you referring to?', time: '9:50 AM' },
            { id: 'm6', sender: 'user', senderName: 'Olivia Williams', content: 'Commission payment query for last month', time: '9:55 AM' },
        ],
    },
    {
        id: 'conv-3', userName: 'Sophia Martinez', userRole: 'Manager',
        lastMessage: 'Need access to analytics dashboard', lastTime: '1 hour ago', unread: 1,
        messages: [
            { id: 'm7', sender: 'user', senderName: 'Sophia Martinez', content: 'Need access to analytics dashboard', time: '9:00 AM' },
        ],
    },
];

const AdminChatPage = () => {
    const [selectedConv, setSelectedConv] = useState<Conversation | null>(mockConversations[0]);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const filteredConvs = mockConversations.filter(c =>
        c.userName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConv) return;
        // In production, send via API
        setNewMessage('');
    };

    return (
        <div className="flex h-[calc(100vh-100px)] bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden animate-in fade-in duration-500">
            {/* Conversation List */}
            <div className="w-80 border-r border-gray-200 dark:border-zinc-800 flex flex-col">
                <div className="p-4 border-b border-gray-200 dark:border-zinc-800">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Support Chat</h2>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search conversations..."
                            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {filteredConvs.map(conv => (
                        <button
                            key={conv.id}
                            onClick={() => setSelectedConv(conv)}
                            className={`w-full flex items-start gap-3 p-4 text-left border-b border-gray-100 dark:border-zinc-900 transition-colors ${selectedConv?.id === conv.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-zinc-950'
                                }`}
                        >
                            <Avatar name={conv.userName} size="sm" status="online" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between mb-0.5">
                                    <span className="font-medium text-sm text-gray-900 dark:text-white truncate">{conv.userName}</span>
                                    <span className="text-[10px] text-gray-500 flex-shrink-0">{conv.lastTime}</span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{conv.lastMessage}</p>
                            </div>
                            {conv.unread > 0 && (
                                <span className="flex-shrink-0 w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                    {conv.unread}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Chat Area */}
            {selectedConv ? (
                <div className="flex-1 flex flex-col">
                    {/* Chat Header */}
                    <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-zinc-800">
                        <Avatar name={selectedConv.userName} size="sm" status="online" />
                        <div>
                            <h3 className="font-semibold text-gray-900 dark:text-white">{selectedConv.userName}</h3>
                            <Badge variant="info" size="sm">{selectedConv.userRole}</Badge>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {selectedConv.messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.sender === 'admin' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${msg.sender === 'admin'
                                        ? 'bg-indigo-600 text-white rounded-br-sm'
                                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white rounded-bl-sm'
                                    }`}>
                                    <p className="text-sm">{msg.content}</p>
                                    <span className={`text-[10px] mt-1 block ${msg.sender === 'admin' ? 'text-indigo-200' : 'text-gray-500 dark:text-gray-400'}`}>
                                        {msg.time}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="p-4 border-t border-gray-200 dark:border-zinc-800">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                placeholder="Type a message..."
                                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim()}
                                className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </form>
                </div>
            ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                    <div className="text-center">
                        <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>Select a conversation to start chatting</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminChatPage;
