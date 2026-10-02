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

// extraFields lets a page add text the contract payload lacks, such as the
// linked application's tenant name and property (web-app#638).
export function filterContractsWorkspace(
    contracts: Contract[],
    searchQuery: string,
    extraFields: (contract: Contract) => Array<string | undefined> = () => [],
): Contract[] {
    const needle = searchQuery.trim().toLowerCase();
    if (!needle) {
        return [...contracts];
    }

    return contracts.filter((contract) => [...contractSearchFields(contract), ...extraFields(contract)].some((field) =>
        String(field || '').toLowerCase().includes(needle),
    ));
}
