import type { AdminBrokerOption } from '@/services/leadsService';

export function deduplicateAdminBrokers(brokers: AdminBrokerOption[]): AdminBrokerOption[] {
    const seen = new Set<string>();
    return brokers.filter((broker) => {
        const userId = String(broker.user_id || '').trim();
        if (!userId || seen.has(userId)) {
            return false;
        }
        seen.add(userId);
        return true;
    });
}
