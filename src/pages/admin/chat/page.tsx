"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Send, Search, Loader2 } from 'lucide-react';
import Avatar from '../../../components/ui/Avatar';
import Badge from '../../../components/ui/Badge';
import { messagesService, type Conversation as APIConversation } from '../../../services/messagesService';
import { useToast } from '../../../contexts/ToastContext';
import { useAuth } from '../../../contexts/AuthContext';

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

const AdminChatPage = () => {
    const { user } = useAuth();
    const toast = useToast();
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);

    const parseMetadata = (metadata: APIConversation['metadata']) => {
        try {
            if (!metadata) return {};
            if (typeof metadata === 'string') {
                return JSON.parse(metadata);
            }
            return metadata;
        } catch {
            return {};
        }
    };

    const fetchConversations = useCallback(async () => {
        try {
            setIsLoading(true);
            const apiConvs = await messagesService.getConversations();
            
            const mappedConvs: Conversation[] = apiConvs.map(c => {
                const metadata = parseMetadata(c.metadata);
                const lastMessage = c.last_message?.content || 'No messages';
                const lastSenderId = c.last_message?.sender_id;
                return {
                    id: c.id,
                    userName: metadata.userName || metadata.full_name || metadata.email || c.title || 'Unknown User',
                    userRole: metadata.userRole || metadata.category || (c.type === 'support' ? 'Support Ticket' : 'User'),
                    lastMessage,
                    lastTime: new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    unread: c.last_message && !c.last_message.is_read && lastSenderId !== user?.id ? 1 : 0,
                    messages: [],
                };
            });

            setConversations(mappedConvs);
            if (mappedConvs.length > 0 && !selectedConvId) {
                setSelectedConvId(mappedConvs[0].id);
            }
        } catch (error: any) {
            toast.error('Failed to load conversations');
            console.error('[AdminChatPage] Load Error:', error);
        } finally {
            setIsLoading(false);
        }
    }, [toast, user?.id]);

    useEffect(() => {
        fetchConversations();
    }, [fetchConversations]);

    const fetchMessages = useCallback(async (conversationId: string) => {
        try {
            const apiMessages = await messagesService.getMessages(conversationId);
            const conversation = conversations.find((entry) => entry.id === conversationId);

            const mappedMessages: Message[] = apiMessages.map((message) => ({
                id: message.id,
                sender: message.sender_id === user?.id ? 'admin' : 'user',
                senderName: message.sender_id === user?.id ? 'Admin' : (conversation?.userName || 'User'),
                content: message.content,
                time: new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }));

            setConversations((prev) => prev.map((entry) =>
                entry.id === conversationId
                    ? {
                        ...entry,
                        unread: 0,
                        messages: mappedMessages,
                        lastMessage: mappedMessages[mappedMessages.length - 1]?.content || entry.lastMessage,
                    }
                    : entry,
            ));

            await messagesService.markAsRead(conversationId);
        } catch (error) {
            toast.error('Failed to load messages');
            console.error('[AdminChatPage] Message Load Error:', error);
        }
    }, [conversations, toast, user?.id]);

    useEffect(() => {
        if (!selectedConvId) return;

        const selectedConversation = conversations.find((conversation) => conversation.id === selectedConvId);
        if (selectedConversation && selectedConversation.messages.length > 0) {
            return;
        }

        fetchMessages(selectedConvId);
    }, [conversations, fetchMessages, selectedConvId]);

    const selectedConv = conversations.find(c => c.id === selectedConvId);

    const filteredConvs = conversations.filter(c =>
        c.userName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !selectedConvId || isSending) return;

        try {
            setIsSending(true);
            const sentMsg = await messagesService.sendMessage({
                conversationId: selectedConvId,
                content: newMessage,
                type: 'text'
            });

            // Update local state
            const mappedMsg: Message = {
                id: sentMsg.id,
                sender: 'admin',
                senderName: 'Admin',
                content: sentMsg.content,
                time: new Date(sentMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            setConversations(prev => prev.map(c => 
                c.id === selectedConvId 
                    ? { ...c, messages: [...c.messages, mappedMsg], lastMessage: mappedMsg.content, lastTime: mappedMsg.time }
                    : c
            ));
            
            setNewMessage('');
        } catch (error: any) {
            toast.error('Failed to send message');
            console.error('[AdminChatPage] Send Error:', error);
        } finally {
            setIsSending(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-4" />
                    <p className="text-gray-500">Loading conversations...</p>
                </div>
            </div>
        );
    }

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
                    {filteredConvs.length > 0 ? (
                        filteredConvs.map(conv => (
                            <button
                                key={conv.id}
                                onClick={() => setSelectedConvId(conv.id)}
                                className={`w-full flex items-start gap-3 p-4 text-left border-b border-gray-100 dark:border-zinc-900 transition-colors ${selectedConvId === conv.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-zinc-950'
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
                        ))
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            <p className="text-sm">No conversations found</p>
                        </div>
                    )}
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
                        {selectedConv.messages.length > 0 ? (
                            selectedConv.messages.map(msg => (
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
                            ))
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-gray-500">
                                <p>No messages in this conversation yet</p>
                            </div>
                        )}
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
                                disabled={isSending}
                            />
                            <button
                                type="submit"
                                disabled={!newMessage.trim() || isSending}
                                className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
