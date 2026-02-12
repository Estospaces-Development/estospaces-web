'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';

interface Broker {
    id: string;
    name: string;
    agency?: string;
    isOnline: boolean;
    lastMessage?: string;
    lastMessageTime?: string;
    unreadCount?: number;
}

interface ChatListProps {
    brokers: Broker[];
    selectedBroker: Broker | null;
    onSelectBroker: (broker: Broker) => void;
}

const ChatList = ({ brokers, selectedBroker, onSelectBroker }: ChatListProps) => {
    return (
        <div className="w-full md:w-80 border-r border-gray-200 bg-white flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Messages</h2>
            </div>

            {/* Chat List */}
            <div className="flex-1 overflow-y-auto">
                {brokers.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                        <MessageSquare size={48} className="mx-auto mb-2 text-gray-300" />
                        <p className="text-sm">No conversations yet</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {brokers.map((broker) => (
                            <button
                                key={broker.id}
                                onClick={() => onSelectBroker(broker)}
                                className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${selectedBroker?.id === broker.id ? 'bg-orange-50 border-l-4 border-orange-500' : ''
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Avatar */}
                                    <div className="relative flex-shrink-0">
                                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center text-white font-semibold">
                                            {broker.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div
                                            className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${broker.isOnline ? 'bg-green-500' : 'bg-gray-400'
                                                }`}
                                        />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h3 className="font-semibold text-gray-900 truncate">{broker.name}</h3>
                                            {broker.lastMessageTime && (
                                                <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                                                    {broker.lastMessageTime}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-gray-600 truncate">{broker.lastMessage}</p>
                                            {broker.unreadCount && broker.unreadCount > 0 && (
                                                <span className="flex-shrink-0 ml-2 bg-orange-500 text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
                                                    {broker.unreadCount}
                                                </span>
                                            )}
                                        </div>
                                        <div className="mt-1">
                                            <span className="text-xs text-gray-500">{broker.agency}</span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatList;
