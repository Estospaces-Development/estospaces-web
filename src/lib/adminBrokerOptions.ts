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

function getBrokerBaseLabel(broker: AdminBrokerOption): string {
    return String(broker.company_name || broker.branch_name || broker.user_id).trim();
}

function getBrokerDisambiguator(broker: AdminBrokerOption): string {
    const branchName = String(broker.branch_name || '').trim();
    const baseLabel = getBrokerBaseLabel(broker);
    if (branchName && branchName !== baseLabel) {
        return branchName;
    }

    const userId = String(broker.user_id || '').trim();
    return userId ? `Account ending ${userId.slice(-6)}` : 'Account';
}

export function buildAdminBrokerDisplayLabels(brokers: AdminBrokerOption[]): Map<string, string> {
    const baseLabelCounts = new Map<string, number>();
    for (const broker of brokers) {
        const baseLabel = getBrokerBaseLabel(broker);
        baseLabelCounts.set(baseLabel, (baseLabelCounts.get(baseLabel) || 0) + 1);
    }

    return new Map(brokers.map((broker) => {
        const userId = String(broker.user_id || '').trim();
        const baseLabel = getBrokerBaseLabel(broker);
        const displayLabel = (baseLabelCounts.get(baseLabel) || 0) > 1
            ? `${baseLabel} · ${getBrokerDisambiguator(broker)}`
            : baseLabel;
        return [userId, displayLabel];
    }));
}
