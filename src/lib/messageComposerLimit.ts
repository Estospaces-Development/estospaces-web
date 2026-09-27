// Mirrors messaging-service: trimmed content may be at most 4,000 bytes (UTF-8).
export const MESSAGE_MAX_BYTES = 4000;
const COUNTER_THRESHOLD_BYTES = 3600;

export const getMessageByteLength = (text: string) => new TextEncoder().encode(text.trim()).length;

export const getMessageLengthState = (text: string) => {
    const bytes = getMessageByteLength(text);
    return {
        bytes,
        overLimit: bytes > MESSAGE_MAX_BYTES,
        showCounter: bytes >= COUNTER_THRESHOLD_BYTES,
    };
};

// The limit is in bytes, so non-Latin text reaches it sooner; the copy does not promise a character count.
export const MESSAGE_TOO_LONG_TEXT = 'This message is too long to send. Shorten it and try again.';

const MESSAGE_SEND_FALLBACK = 'Failed to send message. Please try again.';
const GENERIC_SEND_ERROR = /^(internal server error|api error\b|request timed out|failed to fetch|network ?error|load failed|\d{3}\b)/i;

// Keeps actionable server messages (length, empty, broker context) and hides transport noise.
export const getMessageSendFailureText = (error: unknown): string => {
    const message = error instanceof Error ? error.message.trim() : '';
    return message && !GENERIC_SEND_ERROR.test(message) ? message : MESSAGE_SEND_FALLBACK;
};
