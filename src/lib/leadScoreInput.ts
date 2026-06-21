export type LeadScoreInputValue = number | '';

export const normalizeLeadScoreInitialValue = (score?: number | null): LeadScoreInputValue => (
    typeof score === 'number' && Number.isFinite(score) ? score : ''
);

export const normalizeLeadScoreInputValue = (value: string): LeadScoreInputValue => {
    const trimmed = value.trim();
    if (!trimmed) {
        return '';
    }

    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : '';
};

export const serializeLeadScoreInputValue = (value: LeadScoreInputValue): number => (
    typeof value === 'number' && Number.isFinite(value) ? value : 0
);
