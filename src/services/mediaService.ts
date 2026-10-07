import { ApiRequestError, apiFetch, getServiceUrl } from '@/lib/apiUtils';

const MEDIA_URL = () => getServiceUrl('media');

export interface MediaFile {
    id: string;
    owner_id: string;
    entity_type: string;
    entity_id: string;
    file_name: string;
    original_name: string;
    file_url: string;
    mime_type: string;
    file_size: number;
    sort_order: number;
    is_public: boolean;
    alt_text?: string;
    storage_path: string;
    created_at: string;
    updated_at: string;
}

// The default 15 s budget aborted large photos on slower connections (MB-0234). Allow 15 s plus
// one second per 250 KB, which assumes an uplink of about 2 Mbit/s.
export const mediaUploadTimeoutMs = (bytes: number) => 15_000 + Math.ceil(Math.max(bytes, 0) / 250_000) * 1_000;

// Cloud Run refuses request bodies over 32 MiB, so larger files are sent to the media service in
// chunks (16 MB each, set by the server) and assembled there.
export const MEDIA_CHUNKED_UPLOAD_THRESHOLD_BYTES = 24_000_000;

export const usesChunkedMediaUpload = (size: number) => size > MEDIA_CHUNKED_UPLOAD_THRESHOLD_BYTES;

export interface MediaUploadChunk {
    index: number;
    start: number;
    end: number;
}

/** Splits a file of `size` bytes into consecutive `[start, end)` ranges of at most `chunkSize` bytes. */
export const planMediaUploadChunks = (size: number, chunkSize: number): MediaUploadChunk[] => {
    const chunks: MediaUploadChunk[] = [];
    if (chunkSize <= 0) return chunks;
    for (let start = 0; start < size; start += chunkSize) {
        chunks.push({ index: chunks.length, start, end: Math.min(start + chunkSize, size) });
    }
    return chunks;
};

interface MediaUploadSession {
    upload_id: string;
    chunk_size: number;
    total_chunks: number;
}

// Waits between retries when the server sends no Retry-After. Together they outlast one 60 s window
// of the media service's rate limiter.
export const MEDIA_RETRY_FALLBACK_DELAYS_MS = [5_000, 15_000, 30_000, 60_000];
const MEDIA_RETRY_MAX_DELAY_MS = 60_000;

/**
 * Repeats a media request while the server says it is busy: rate limited (429) or still completing
 * the same upload (409 upload_in_progress). Waits as long as Retry-After asks, else the fallback.
 */
export const retryWhileBusy = async <T>(send: () => Promise<T>): Promise<T> => {
    for (let attempt = 0; ; attempt += 1) {
        try {
            return await send();
        } catch (error) {
            const busy = error instanceof ApiRequestError && (error.status === 429 || error.code === 'upload_in_progress');
            if (!busy || attempt >= MEDIA_RETRY_FALLBACK_DELAYS_MS.length) throw error;
            const delay = Math.min(error.retryAfterMs ?? MEDIA_RETRY_FALLBACK_DELAYS_MS[attempt], MEDIA_RETRY_MAX_DELAY_MS);
            await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
};

/** Retries once after a network failure or 5xx; a 4xx means the server refused the request itself. */
const retryOnceAfterFailure = async <T>(send: () => Promise<T>): Promise<T> => {
    try {
        return await send();
    } catch (error) {
        const status = error instanceof ApiRequestError ? error.status : undefined;
        if (status !== undefined && status >= 400 && status < 500) throw error;
        return send();
    }
};

const uploadMediaFileInChunks = async (
    file: File,
    entityType: string,
    entityId: string,
    altText: string,
    isPublic: boolean,
): Promise<MediaFile> => {
    const uploadsUrl = `${MEDIA_URL()}/api/v1/media/uploads`;
    const session = await retryWhileBusy(() => apiFetch<MediaUploadSession>(uploadsUrl, {
        method: 'POST',
        suppressErrorToast: true,
        body: JSON.stringify({
            file_name: file.name,
            mime_type: file.type,
            file_size: file.size,
            entity_type: entityType,
            entity_id: entityId,
            alt_text: altText,
            is_public: isPublic,
        }),
    }));
    const chunks = planMediaUploadChunks(file.size, session.chunk_size);
    if (chunks.length !== session.total_chunks) {
        throw new Error('The upload could not be split into parts. Please try again.');
    }
    for (const chunk of chunks) {
        const body = file.slice(chunk.start, chunk.end);
        await retryOnceAfterFailure(() => retryWhileBusy(() => apiFetch(`${uploadsUrl}/${session.upload_id}/chunks/${chunk.index}`, {
            method: 'PUT',
            suppressErrorToast: true,
            headers: { 'Content-Type': 'application/octet-stream' },
            body,
            timeoutMs: mediaUploadTimeoutMs(body.size),
        })));
    }
    // Completing is idempotent on the server, so a lost response is safe to retry.
    return retryOnceAfterFailure(() => retryWhileBusy(() => apiFetch<MediaFile>(`${uploadsUrl}/${session.upload_id}/complete`, {
        method: 'POST',
        suppressErrorToast: true,
        timeoutMs: 60_000,
    })));
};

export const uploadMediaFile = async (
    file: File,
    entityType: string,
    entityId: string,
    altText = '',
    isPublic = true,
): Promise<MediaFile> => {
    if (usesChunkedMediaUpload(file.size)) {
        return uploadMediaFileInChunks(file, entityType, entityId, altText, isPublic);
    }

    const body = new FormData();
    body.append('file', file);
    body.append('entity_type', entityType);
    body.append('entity_id', entityId);
    body.append('alt_text', altText);
    body.append('is_public', String(isPublic));

    return retryWhileBusy(() => apiFetch<MediaFile>(`${MEDIA_URL()}/api/v1/media`, {
        method: 'POST',
        suppressErrorToast: true,
        body,
        timeoutMs: mediaUploadTimeoutMs(file.size),
    }));
};

/**
 * Uploads several files, at most `concurrency` at a time, so a batch of large photos does not
 * flood the media service's per-client rate limit. Results keep the order of `files`.
 */
export const uploadMediaFiles = async (
    files: File[],
    entityType: string,
    entityId: string,
    concurrency = 2,
): Promise<MediaFile[]> => {
    const results: MediaFile[] = new Array(files.length);
    let next = 0;
    const worker = async () => {
        while (next < files.length) {
            const index = next;
            next += 1;
            results[index] = await uploadMediaFile(files[index], entityType, entityId, files[index].name);
        }
    };
    await Promise.all(Array.from({ length: Math.min(Math.max(concurrency, 1), files.length) }, worker));
    return results;
};

export const reassignMediaEntity = async (
    fromEntityType: string,
    fromEntityId: string,
    toEntityType: string,
    toEntityId: string,
): Promise<void> => {
    await apiFetch(`${MEDIA_URL()}/api/v1/media/reassign`, {
        method: 'PUT',
        suppressErrorToast: true,
        body: JSON.stringify({
            from_entity_type: fromEntityType,
            from_entity_id: fromEntityId,
            to_entity_type: toEntityType,
            to_entity_id: toEntityId,
        }),
    });
};

export const getMyMediaFiles = async (limit = 50): Promise<MediaFile[]> => {
    return apiFetch<MediaFile[]>(`${MEDIA_URL()}/api/v1/media/mine?limit=${limit}`, {
        suppressErrorToast: true,
    });
};

export const deleteMediaFile = async (mediaId: string): Promise<void> => {
    await apiFetch(`${MEDIA_URL()}/api/v1/media/${mediaId}`, {
        method: 'DELETE',
        suppressErrorToast: true,
    });
};
