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

export const MESSAGE_TOO_LONG_TEXT = `This message is too long. Shorten it to ${MESSAGE_MAX_BYTES.toLocaleString('en-GB')} characters or fewer to send.`;
