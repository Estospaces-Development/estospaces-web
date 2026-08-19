import { getServiceUrl } from '@/lib/apiUtils';

export const PUBLIC_MEDIA_CACHE_VERSION = 'read-context-v2';

const PUBLIC_UPLOAD_PATH_PATTERN = /^\/uploads\//;
const MEDIA_API_PATH_PATTERN = /^\/api\/v1\/media\//;

const isEstospacesMediaHost = (hostname: string) => (
    hostname.startsWith('estospaces-media-service-') && hostname.endsWith('.a.run.app')
);

const isGoogleStorageHost = (hostname: string) => (
    hostname === 'storage.googleapis.com' || hostname === 'storage.cloud.google.com'
);

const getEstospacesBucketObjectPath = (url: URL) => {
    if (!isGoogleStorageHost(url.hostname)) {
        return '';
    }

    const [, bucketName, objectPath] = url.pathname.match(/^\/(estospaces-media-[^/]+)\/(.+)$/) || [];
    return bucketName && objectPath ? objectPath : '';
};

const getConfiguredMediaUploadPrefix = (mediaBaseUrl: URL) => (
    `${mediaBaseUrl.pathname.replace(/\/$/, '')}/uploads/`.replace(/^\/\//, '/')
);

const addPublicMediaCacheVersion = (url: URL, mediaBaseUrl: URL) => {
    const isConfiguredMediaUpload = url.origin === mediaBaseUrl.origin
        && url.pathname.startsWith(getConfiguredMediaUploadPrefix(mediaBaseUrl));
    if (!PUBLIC_UPLOAD_PATH_PATTERN.test(url.pathname) && !isConfiguredMediaUpload) {
        return url.toString();
    }

    url.searchParams.set('esto_media', PUBLIC_MEDIA_CACHE_VERSION);
    return url.toString();
};

const getMediaBase = () => getServiceUrl('media').replace(/\/$/, '');

export const resolveMediaUrlForBase = (
    value: string | null | undefined,
    mediaBase: string,
    browserOrigin = 'http://localhost',
): string => {
    const trimmed = String(value || '').trim();
    if (!trimmed) {
        return '';
    }

    const normalizedMediaBase = mediaBase.replace(/\/$/, '');
    const mediaBaseUrl = new URL(normalizedMediaBase || '/', browserOrigin);

    if (PUBLIC_UPLOAD_PATH_PATTERN.test(trimmed)) {
        const absoluteBase = /^https?:\/\//i.test(normalizedMediaBase)
            ? normalizedMediaBase
            : `${browserOrigin}${normalizedMediaBase}`;
        return addPublicMediaCacheVersion(new URL(`${absoluteBase}${trimmed}`), mediaBaseUrl);
    }

    if (MEDIA_API_PATH_PATTERN.test(trimmed)) {
        return `${normalizedMediaBase}${trimmed}`;
    }

    if (!/^https?:\/\//i.test(trimmed)) {
        return trimmed;
    }

    try {
        const url = new URL(trimmed);
        const bucketObjectPath = getEstospacesBucketObjectPath(url);
        if (bucketObjectPath) {
            const absoluteBase = /^https?:\/\//i.test(normalizedMediaBase)
                ? normalizedMediaBase
                : `${browserOrigin}${normalizedMediaBase}`;
            return addPublicMediaCacheVersion(
                new URL(`${absoluteBase}/uploads/${bucketObjectPath}`),
                mediaBaseUrl,
            );
        }
        if (url.origin === mediaBaseUrl.origin || isEstospacesMediaHost(url.hostname)) {
            return addPublicMediaCacheVersion(url, mediaBaseUrl);
        }
    } catch {
        return trimmed;
    }

    return trimmed;
};

export const resolveMediaUrl = (value?: string | null): string => resolveMediaUrlForBase(
    value,
    getMediaBase(),
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost',
);
