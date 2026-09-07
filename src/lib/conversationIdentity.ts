import { getApplicationPropertyDisplayTitle } from '@/lib/applicationDisplayTitle';

export interface ConversationIdentity {
  id: string;
  title: string;
  group: string;
  address?: string | null;
}

const comparisonKey = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase();

export const buildConversationIdentityDetails = (conversations: readonly ConversationIdentity[]) => {
  const groups = new Map<string, Array<{ id: string; address: string }>>();
  const distinctConversations = new Map(conversations.map((conversation) => [conversation.id, conversation]));
  for (const conversation of distinctConversations.values()) {
    const key = JSON.stringify([conversation.group, conversation.title].map(comparisonKey));
    const group = groups.get(key) || [];
    group.push({
      id: conversation.id,
      address: getApplicationPropertyDisplayTitle(null, conversation.address, ''),
    });
    groups.set(key, group);
  }

  const details = new Map<string, string>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const addressCounts = new Map<string, number>();
    for (const { address } of group) {
      const key = comparisonKey(address);
      addressCounts.set(key, (addressCounts.get(key) || 0) + 1);
    }
    for (const { id, address } of group) {
      details.set(id, address && addressCounts.get(comparisonKey(address)) === 1 ? address : `Chat ${id}`);
    }
  }
  return details;
};
