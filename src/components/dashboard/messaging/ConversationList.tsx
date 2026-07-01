"use client";

import React from "react";
import { Home, LifeBuoy, MessageSquare, Search } from "lucide-react";
import { useMessages } from "@/contexts/MessagesContext";
import Avatar from "@/components/ui/Avatar";
import { createDuplicateSafeKeyResolver } from "@/lib/reactListKeys";

interface ConversationListProps {
  onSelectConversation: (id: string | null) => void;
  selectedConversationId: string | null;
}

type ConversationLike = {
  id: string;
  contactName?: string;
  agentAvatar?: string;
  agentId?: string;
  isOnline?: boolean;
  isSupportConversation?: boolean;
  unreadCount?: number;
  lastMessage?: string;
  lastMessageTime?: string;
  propertyTitle?: string;
  propertyAddress?: string;
  agentAgency?: string;
  isMuted?: boolean;
};

const groupDefinitions = [
  {
    id: "journeys",
    label: "Home journeys",
    hint: "Chats connected to a home or request",
    icon: Home,
  },
  {
    id: "agents",
    label: "Property agents",
    hint: "Direct agent conversations",
    icon: MessageSquare,
  },
  {
    id: "support",
    label: "Support",
    hint: "Help from Estospaces",
    icon: LifeBuoy,
  },
  {
    id: "other",
    label: "Other messages",
    hint: "Everything else",
    icon: MessageSquare,
  },
];

const getConversationGroup = (conversation: ConversationLike) => {
  if (conversation.isSupportConversation) return "support";
  if (conversation.propertyTitle || conversation.propertyAddress) return "journeys";
  if (conversation.agentAgency) return "agents";
  return "other";
};

const getDisplayTitle = (conversation: ConversationLike) => {
  if (conversation.propertyTitle) return conversation.propertyTitle;
  return conversation.contactName || "Message";
};

const getDisplaySubtitle = (conversation: ConversationLike) => {
  if (conversation.propertyTitle) {
    return conversation.contactName || "Property update";
  }

  if (conversation.agentAgency) return conversation.agentAgency;
  if (conversation.propertyAddress) return conversation.propertyAddress;
  if (conversation.isSupportConversation) return "Estospaces support";
  return "Journey update";
};

export default function ConversationList({
  onSelectConversation,
  selectedConversationId,
}: ConversationListProps) {
  const { conversations, searchQuery, setSearchQuery } = useMessages();
  const groupedConversations = groupDefinitions
    .map((group) => ({
      ...group,
      items: (conversations as ConversationLike[]).filter(
        (conversation) => getConversationGroup(conversation) === group.id,
      ),
    }))
    .filter((group) => group.items.length > 0);
  const conversationKeyFor = createDuplicateSafeKeyResolver("conversation");

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-800">
      <div className="border-b border-gray-100 p-4 dark:border-gray-700/70">
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search messages..."
            className="w-full rounded-2xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm text-gray-950 caret-gray-900 outline-none transition-all placeholder:text-gray-500 focus:border-orange-300 focus:bg-white focus:ring-4 focus:ring-orange-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:caret-white dark:placeholder:text-gray-500 dark:focus:border-orange-500/50 dark:focus:ring-orange-500/10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Messages are grouped by what they are about, so repeated names are easier to understand.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {groupedConversations.length > 0 ? (
          <div className="space-y-5">
            {groupedConversations.map((group) => {
              const GroupIcon = group.icon;

              return (
                <section key={group.id}>
                  <div className="mb-2 flex items-center gap-2 px-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-gray-100 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                      <GroupIcon size={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                        {group.label}
                      </p>
                      <p className="truncate text-xs text-gray-400 dark:text-gray-500">
                        {group.hint}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    {group.items.map((conversation, conversationIndex) => {
                      const selected = selectedConversationId === conversation.id;
                      const unreadCount = conversation.unreadCount || 0;
                      const title = getDisplayTitle(conversation);
                      const subtitle = getDisplaySubtitle(conversation);
                      const unreadLabel = unreadCount > 0 ? `${unreadCount} unread` : "Read";
                      const notificationLabel = conversation.isMuted ? "Muted" : "Notifications on";

                      return (
                        <button
                          key={conversationKeyFor(conversation.id, conversationIndex)}
                          type="button"
                          onClick={() => onSelectConversation(conversation.id)}
                          className={`w-full rounded-2xl border p-3 text-left transition-all ${
                            selected
                              ? "border-orange-200 bg-orange-50 shadow-[0_20px_40px_-30px_rgba(249,115,22,0.8)] dark:border-orange-500/40 dark:bg-orange-500/10"
                              : "border-transparent hover:border-gray-100 hover:bg-gray-50 dark:hover:border-gray-700 dark:hover:bg-gray-700/40"
                          }`}
                          aria-pressed={selected}
                          aria-label={`${title}. ${subtitle}. ${unreadLabel}. ${notificationLabel}. ${conversation.lastMessage || "No recent message"}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative flex-shrink-0">
                              <Avatar
                                userId={
                                  conversation.isSupportConversation
                                    ? undefined
                                    : conversation.agentId
                                }
                                src={conversation.agentAvatar}
                                name={conversation.contactName || title}
                                size="md"
                                status={
                                  conversation.isSupportConversation
                                    ? undefined
                                    : conversation.isOnline
                                      ? "online"
                                      : "offline"
                                }
                              />
                              {unreadCount > 0 && (
                                <div
                                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-orange-600 text-[10px] font-bold text-white dark:border-gray-800"
                                  aria-label={`Unread count: ${unreadCount}`}
                                  title={`${unreadCount} unread`}
                                >
                                  {unreadCount > 9 ? "9+" : unreadCount}
                                </div>
                              )}
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex items-center justify-between gap-3">
                                <p className="truncate text-sm font-bold text-gray-950 dark:text-white">
                                  {title}
                                </p>
                                {conversation.lastMessageTime && (
                                  <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                                    {conversation.lastMessageTime}
                                  </span>
                                )}
                              </div>
                              <p className="truncate text-xs font-medium text-gray-500 dark:text-gray-400">
                                {subtitle}
                              </p>
                              {unreadCount > 0 && (
                                <span className="mt-2 inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-semibold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                                  {unreadLabel}
                                </span>
                              )}
                              <span
                                className={`${unreadCount > 0 ? "ml-2" : ""} mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                  conversation.isMuted
                                    ? "bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900"
                                    : "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-300"
                                }`}
                              >
                                {notificationLabel}
                              </span>
                              {conversation.lastMessage && (
                                <p
                                  className={`mt-1 truncate text-sm ${
                                    unreadCount > 0
                                      ? "font-semibold text-gray-900 dark:text-white"
                                      : "text-gray-500 dark:text-gray-400"
                                  }`}
                                >
                                  {conversation.lastMessage}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-gray-900 dark:text-gray-500">
              <MessageSquare size={24} />
            </div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {searchQuery ? "No matching messages" : "No messages yet"}
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchQuery
                ? "Try a name, home, or agent."
                : "Chats will appear here when a home journey or enquiry starts."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
