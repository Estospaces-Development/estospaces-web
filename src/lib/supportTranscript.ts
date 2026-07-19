export type SupportTranscriptPerspective = 'requester' | 'staff';

export interface SupportTranscriptPresentationInput {
    senderId: string;
    currentUserId?: string;
    requesterUserId?: string;
    perspective?: SupportTranscriptPerspective;
    senderRole?: string;
    staffUserIds?: string[];
}

export interface SupportTranscriptPresentation {
    participant: 'requester' | 'staff';
    alignsEnd: boolean;
    emphasized: boolean;
    showParticipantLabel: boolean;
}

const STAFF_ROLES = new Set(['admin', 'support', 'staff', 'agent']);
const REQUESTER_ROLES = new Set(['user', 'manager', 'broker', 'requester', 'customer']);
const MIN_VALID_SUPPORT_YEAR = 2000;

const normalizeText = (value: unknown) => String(value || '').trim();

function hasValue(value: string | undefined) {
    return Boolean(value && value.trim());
}

export function formatSupportTimestamp(...values: Array<string | undefined | null>): string {
    for (const value of values) {
        const normalizedValue = normalizeText(value);
        if (!normalizedValue) {
            continue;
        }

        const date = new Date(normalizedValue);
        if (!Number.isNaN(date.getTime()) && date.getUTCFullYear() >= MIN_VALID_SUPPORT_YEAR) {
            return date.toLocaleString();
        }
    }

    return 'Time unavailable';
}

export function resolveSupportTranscriptMessagePresentation({
    senderId,
    currentUserId,
    requesterUserId,
    perspective = 'requester',
    senderRole,
    staffUserIds = [],
}: SupportTranscriptPresentationInput): SupportTranscriptPresentation {
    const normalizedSenderId = normalizeText(senderId);
    const normalizedCurrentUserId = normalizeText(currentUserId);
    const normalizedRequesterUserId = normalizeText(requesterUserId);
    const normalizedSenderRole = normalizeText(senderRole).toLowerCase();
    const staffUserIdSet = new Set(staffUserIds.map(normalizeText).filter(hasValue));
    const senderIsKnownStaff = STAFF_ROLES.has(normalizedSenderRole)
        || staffUserIdSet.has(normalizedSenderId)
        || (perspective === 'staff' && normalizedSenderId === normalizedCurrentUserId);
    const senderIsKnownRequester = REQUESTER_ROLES.has(normalizedSenderRole)
        || (hasValue(normalizedRequesterUserId) && normalizedSenderId === normalizedRequesterUserId);
    const isRequesterMessage = senderIsKnownRequester
        || (!senderIsKnownStaff && hasValue(normalizedRequesterUserId) && normalizedSenderId === normalizedRequesterUserId);

    // Admin/staff messages may arrive without sender_role from the backend.
    // If the sender is the current user in staff perspective, override to staff
    // even if sender_role was missing or unreliable.
    const participant = (!isRequesterMessage && perspective === 'staff' && normalizedSenderId === normalizedCurrentUserId)
        ? 'staff'
        : (isRequesterMessage ? 'requester' : 'staff');
    const alignsEnd = perspective === 'staff' ? participant === 'staff' : normalizedSenderId === normalizedCurrentUserId;
    const showParticipantLabel = perspective === 'staff' || normalizedSenderId !== normalizedCurrentUserId;

    return {
        participant,
        alignsEnd,
        emphasized: alignsEnd,
        showParticipantLabel,
    };
}
