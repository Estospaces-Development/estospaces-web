import type { Contract } from '@/types/booking';

const contractSearchFields = (contract: Contract): Array<string | undefined> => [
    contract.id,
    contract.booking_id,
    contract.application_id,
    contract.broker_request_id,
    contract.lead_id,
    contract.fast_track_case_id,
    contract.property_id,
    contract.title,
    contract.contract_type,
    contract.name,
    contract.property,
    contract.type,
    contract.status,
];

export function filterContractsWorkspace(contracts: Contract[], searchQuery: string): Contract[] {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) {
        return [...contracts];
    }

    return contracts.filter((contract) => contractSearchFields(contract).some((field) =>
        String(field || '').toLowerCase().includes(needle),
    ));
}
