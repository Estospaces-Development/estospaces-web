export type SupportTranscriptPerspective = 'requester' | 'staff';

export interface SupportTranscriptPresentationInput {
    senderId: string;
    currentUserId?: string;
    requesterUserId?: string;
    perspective?: SupportTranscriptPerspective;
}

export interface SupportTranscriptPresentation {
    participant: 'requester' | 'staff';
    alignsEnd: boolean;
    emphasized: boolean;
    showParticipantLabel: boolean;
}

export function resolveSupportTranscriptMessagePresentation({
    senderId,
    currentUserId,
    requesterUserId,
    perspective = 'requester',
}: SupportTranscriptPresentationInput): SupportTranscriptPresentation {
    const isRequesterMessage = requesterUserId ? senderId === requesterUserId : senderId !== currentUserId;
    const participant = isRequesterMessage ? 'requester' : 'staff';
    const alignsEnd = perspective === 'staff' ? participant === 'staff' : senderId === currentUserId;
    const showParticipantLabel = perspective === 'staff' || senderId !== currentUserId;

    return {
        participant,
        alignsEnd,
        emphasized: alignsEnd,
        showParticipantLabel,
    };
}
