import { Contract, ContractStatus } from '@/types/booking';

export const normalizeContractStatus = (status?: string): ContractStatus => {
    switch ((status || '').trim()) {
        case 'pending_user':
            return 'pending_user_signature';
        case 'pending_manager':
            return 'pending_manager_signature';
        case 'sent':
            return 'draft';
        case 'signed':
            return 'active';
        case 'expired':
            return 'terminated';
        case 'draft':
        case 'pending_user_signature':
        case 'pending_manager_signature':
        case 'active':
        case 'terminated':
            return status as ContractStatus;
        default:
            return (status || 'draft') as ContractStatus;
    }
};

export const normalizeContract = <T extends Contract>(contract: T): T => ({
    ...contract,
    status: normalizeContractStatus(contract.status),
});

export const isPendingUserSignature = (status?: string) => normalizeContractStatus(status) === 'pending_user_signature';

export const isPendingManagerSignature = (status?: string) => normalizeContractStatus(status) === 'pending_manager_signature';
