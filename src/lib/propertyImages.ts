import { getServiceUrl } from '@/lib/apiUtils';
import { resolveMediaUrl } from '@/lib/mediaUrls';

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const isNonEmptyString = (value: unknown): value is string =>
    typeof value === 'string' && value.trim().length > 0;

const normalizeImageValue = (value: unknown): string[] => {
    if (!value) {
        return [];
    }

    if (Array.isArray(value)) {
        return value.flatMap((item) => normalizeImageValue(item));
    }

    if (isNonEmptyString(value)) {
        const trimmed = value.trim();
        if (trimmed === '[]') {
            return [];
        }

        try {
            return normalizeImageValue(JSON.parse(trimmed));
        } catch {
            return [trimmed];
        }
    }

    if (isRecord(value)) {
        if (isNonEmptyString(value.url)) {
            return [value.url.trim()];
        }

        if (Array.isArray(value.images)) {
            return normalizeImageValue(value.images);
        }
    }

    return [];
};

const _isPrivateMediaBucketUrl = (image: string) => {
    try {
        const url = new URL(image);
        const isGoogleStorageHost = url.hostname === 'storage.googleapis.com' || url.hostname === 'storage.cloud.google.com';
        return isGoogleStorageHost && /^\/estospaces-media-[^/]+\//.test(url.pathname);
    } catch {
        return image.includes('storage.googleapis.com/estospaces-media-')
            || image.includes('storage.cloud.google.com/estospaces-media-');
    }
};

const MEDIA_ACCESS_RELATIVE_PATTERN = /^\/api\/v1\/media\//;
const PROPERTY_MEDIA_RELATIVE_PATTERN = /^\/api\/v1\/properties\//;

export const resolvePropertyImageUrl = (image: string): string => {
    const trimmed = image.trim();
    if (!trimmed) {
        return trimmed;
    }

    // Already absolute — no change needed
    if (/^https?:\/\//i.test(trimmed)) {
        return resolveMediaUrl(trimmed);
    }

    if (trimmed.startsWith('/uploads/')) {
        return resolveMediaUrl(trimmed);
    }

    // Relative media path (/api/v1/media/...) — resolve against media service base URL
    if (MEDIA_ACCESS_RELATIVE_PATTERN.test(trimmed)) {
        const mediaBase = getServiceUrl('media');
        const cleanMediaBase = mediaBase.replace(/\/$/, '');
        return `${cleanMediaBase}${trimmed}`;
    }

    // Relative property media path (/api/v1/properties/...) — resolve against core service base URL
    if (PROPERTY_MEDIA_RELATIVE_PATTERN.test(trimmed)) {
        const coreBase = getServiceUrl('core');
        const cleanCoreBase = coreBase.replace(/\/$/, '');
        return `${cleanCoreBase}${trimmed}`;
    }

    return trimmed;
};

const isPlaceholderUrl = (image: string) => {
    try {
        const url = new URL(image);
        return url.hostname === 'example.com';
    } catch {
        return false;
    }
};

const isUsableImage = (image: string) => {
    const trimmed = image.trim();
    return trimmed.length > 0
        && trimmed !== '[]'
        && !isPlaceholderUrl(trimmed);
};

const uniqueImages = (images: string[]) =>
    Array.from(new Set(images.map((image) => image.trim()).filter(isUsableImage)));

export const getPropertyImages = (property: unknown): string[] => {
    if (!isRecord(property)) {
        return [];
    }

    return uniqueImages([
        ...normalizeImageValue(property.image_urls).map(resolvePropertyImageUrl),
        ...normalizeImageValue(property.images).map(resolvePropertyImageUrl),
        ...normalizeImageValue(isRecord(property.media) ? property.media.images : undefined).map(resolvePropertyImageUrl),
        ...normalizeImageValue(property.image).map(resolvePropertyImageUrl),
        ...normalizeImageValue(property.image_url).map(resolvePropertyImageUrl),
        ...normalizeImageValue(property.thumbnail_url).map(resolvePropertyImageUrl),
        ...normalizeImageValue(property.photo).map(resolvePropertyImageUrl),
        ...normalizeImageValue(property.main_image).map(resolvePropertyImageUrl),
        ...normalizeImageValue(property.property_image).map(resolvePropertyImageUrl),
    ]);
};

export const getPropertyVideos = (property: unknown): string[] => {
    if (!isRecord(property)) {
        return [];
    }

    return uniqueImages([
        ...normalizeImageValue(property.video_urls).map(resolvePropertyImageUrl),
        ...normalizeImageValue(property.videos).map(resolvePropertyImageUrl),
        ...normalizeImageValue(isRecord(property.media) ? property.media.videos : undefined).map(resolvePropertyImageUrl),
        ...normalizeImageValue(property.video).map(resolvePropertyImageUrl),
        ...normalizeImageValue(property.video_url).map(resolvePropertyImageUrl),
    ]);
};

export const getPrimaryPropertyImage = (property: unknown, fallback?: string) => {
    const [image] = getPropertyImages(property);
    return image || fallback || null;
};
