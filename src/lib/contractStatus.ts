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
    journeyState: contract.journey_state || contract.journeyState || null,
    jurisdictionProfile: contract.jurisdiction_profile || contract.jurisdictionProfile || contract.journey_state?.jurisdiction_profile,
    liveStage: contract.live_stage || contract.liveStage || contract.journey_state?.live_stage,
    stageGroup: contract.stage_group || contract.stageGroup || contract.journey_state?.stage_group,
    journeyStatusReason: contract.journey_status_reason || contract.journeyStatusReason || contract.journey_state?.journey_status_reason,
    blockers: contract.blockers || contract.journey_state?.blockers || [],
    deadlines: contract.deadlines || contract.journey_state?.deadlines || [],
    requiredEvidence: contract.required_evidence || contract.requiredEvidence || contract.journey_state?.required_evidence || [],
    nextActions: contract.next_actions || contract.nextActions || contract.journey_state?.next_actions || [],
});

export const isPendingUserSignature = (status?: string) => normalizeContractStatus(status) === 'pending_user_signature';

export const isPendingManagerSignature = (status?: string) => normalizeContractStatus(status) === 'pending_manager_signature';

export const canUserSignContract = (
    status?: string,
    userSignedAt?: string | null,
) => !userSignedAt && ['draft', 'pending_user_signature'].includes(normalizeContractStatus(status));
