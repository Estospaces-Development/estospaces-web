// Client-side checks that mirror media-service: the leading bytes must match
// the declared image type, videos must be a real MP4/MOV or WebM container,
// and empty files are refused before any upload starts.

export const EMPTY_FILE_MESSAGE = 'This file is empty. Choose a file with content and try again.';
const MISMATCH_MESSAGE = 'The file contents do not match its type. Choose the original file and try again.';

const startsWith = (head: Uint8Array, bytes: readonly number[], offset = 0) =>
    head.length >= offset + bytes.length && bytes.every((byte, index) => head[offset + index] === byte);

const ascii = (head: Uint8Array, start: number, end: number) =>
    String.fromCharCode(...Array.from(head.slice(start, end)));

export const detectImageType = (head: Uint8Array): string | null => {
    if (startsWith(head, [0xff, 0xd8, 0xff])) return 'image/jpeg';
    if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
    if (ascii(head, 0, 6) === 'GIF87a' || ascii(head, 0, 6) === 'GIF89a') return 'image/gif';
    if (ascii(head, 0, 4) === 'RIFF' && ascii(head, 8, 12) === 'WEBP') return 'image/webp';
    return null;
};

const ISO_BASE_MEDIA_BOXES = new Set(['ftyp', 'moov', 'mdat', 'free', 'skip', 'wide', 'pnot']);

export const isVideoContainer = (head: Uint8Array): boolean =>
    (head.length >= 8 && ISO_BASE_MEDIA_BOXES.has(ascii(head, 4, 8)))
    || startsWith(head, [0x1a, 0x45, 0xdf, 0xa3]);

export const readFileHead = async (file: Blob, length = 16): Promise<Uint8Array> =>
    new Uint8Array(await file.slice(0, length).arrayBuffer());

export const UNREADABLE_FILE_MESSAGE = 'This file could not be read. Download it to this device and choose it again.';

// Unreadable files (for example cloud placeholders) resolve to null instead of throwing.
export const readFileHeadSafely = async (file: Blob, length = 16): Promise<Uint8Array | null> => {
    try {
        return await readFileHead(file, length);
    } catch {
        return null;
    }
};

const normalizeImageType = (type: string) => (type.toLowerCase() === 'image/jpg' ? 'image/jpeg' : type.toLowerCase());

// Returns a user-facing problem, or null when the image bytes are acceptable.
export const getImageFileProblem = (file: { size: number; type: string }, head: Uint8Array): string | null => {
    if (file.size === 0) return EMPTY_FILE_MESSAGE;
    const detected = detectImageType(head);
    return detected && detected === normalizeImageType(file.type) ? null : MISMATCH_MESSAGE;
};

export const getVideoFileProblem = (file: { size: number }, head: Uint8Array): string | null => {
    if (file.size === 0) return EMPTY_FILE_MESSAGE;
    return isVideoContainer(head) ? null : MISMATCH_MESSAGE;
};

// Same selected file (name, size and modified time) is added only once.
export const getLocalFileFingerprint = (file: File) => `${file.name}|${file.size}|${file.lastModified}`;

// Magic bytes only prove the header; a file with a valid header and broken data was saved as a
// blank gallery item or a silent broken player (MB-0228, MB-0246). These ask the browser to decode it.
export const canDecodeImageFile = async (file: File): Promise<boolean> => {
    if (typeof createImageBitmap !== 'function') {
        return true;
    }
    try {
        const bitmap = await createImageBitmap(file);
        bitmap.close();
        return true;
    } catch {
        return false;
    }
};

export const canPlayVideoFile = (file: File, timeoutMs = 10_000): Promise<boolean> => new Promise((resolve) => {
    if (typeof document === 'undefined' || typeof URL.createObjectURL !== 'function') {
        resolve(true);
        return;
    }
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    let settled = false;
    const finish = (playable: boolean) => {
        if (settled) {
            return;
        }
        settled = true;
        window.clearTimeout(timer);
        video.removeAttribute('src');
        video.load();
        URL.revokeObjectURL(url);
        resolve(playable);
    };
    // A slow device should not block a good file, so a timeout counts as playable.
    const timer = window.setTimeout(() => finish(true), timeoutMs);
    video.preload = 'auto';
    video.muted = true;
    video.onloadeddata = () => finish(true);
    video.onerror = () => finish(false);
    video.src = url;
});

