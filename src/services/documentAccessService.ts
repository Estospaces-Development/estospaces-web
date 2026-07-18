import { apiFetch, getErrorMessage, getServiceUrl } from '@/lib/apiUtils';

const CORE_URL = () => getServiceUrl('core');

interface DocumentAccessURLResponse {
    access_url: string;
    expires_at: string;
}

export const getDocumentAccessUrl = async (
    documentId: string,
): Promise<{ url: string | null; error: string | null }> => {
    try {
        const data = await apiFetch<DocumentAccessURLResponse>(
            `${CORE_URL()}/api/v1/documents/${documentId}/access-url`,
        );
        if (!data.access_url) {
            return { url: null, error: 'No preview URL returned for this document.' };
        }
        return { url: data.access_url, error: null };
    } catch (error: any) {
        return { url: null, error: getErrorMessage(error) };
    }
};

export const getDocumentAccessBlob = async (
    documentId: string,
): Promise<{ url: string | null; blob: Blob | null; error: string | null }> => {
    const { url, error } = await getDocumentAccessUrl(documentId);
    if (error || !url) {
        return { url: null, blob: null, error: error || 'Document access URL is unavailable.' };
    }

    try {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 10000);
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            signal: controller.signal,
        });
        window.clearTimeout(timeoutId);
        if (!response.ok) {
            return {
                url,
                blob: null,
                error: `Document preview failed with status ${response.status}. The file may not be available for preview.`,
            };
        }

        return { url, blob: await response.blob(), error: null };
    } catch (fetchError: any) {
        if (fetchError?.name === 'AbortError') {
            return {
                url,
                blob: null,
                error: 'Document preview timed out after 10 seconds. The file may be too large or the service is slow. Please try downloading the file instead.',
            };
        }
        return {
            url,
            blob: null,
            error: getErrorMessage(fetchError) || 'Unable to fetch the document preview.',
        };
    }
};

const reserveDocumentWindow = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    const reservedWindow = window.open('about:blank', '_blank');
    if (!reservedWindow) {
        return null;
    }

    try {
        reservedWindow.opener = null;
        reservedWindow.document.write('<!doctype html><title>Opening document...</title><body>Opening document...</body>');
        reservedWindow.document.close();
    } catch {
        // Cross-browser popup handles can become write-protected; navigation below is the critical action.
    }

    return reservedWindow;
};

const closeReservedDocumentWindow = (reservedWindow: Window | null) => {
    if (!reservedWindow || reservedWindow.closed) {
        return;
    }

    try {
        reservedWindow.close();
    } catch {
        // Best-effort cleanup only.
    }
};

const openResolvedDocumentUrl = (reservedWindow: Window | null, url: string) => {
    if (reservedWindow && !reservedWindow.closed) {
        reservedWindow.location.href = url;
        return true;
    }

    if (typeof window === 'undefined') {
        return false;
    }

    return Boolean(window.open(url, '_blank', 'noopener,noreferrer'));
};

export const openDocumentAccessUrl = async (
    documentId: string,
): Promise<{ error: string | null }> => {
    const reservedWindow = reserveDocumentWindow();
    const { url, error } = await getDocumentAccessUrl(documentId);
    if (error || !url) {
        closeReservedDocumentWindow(reservedWindow);
        return { error: error || 'Document access URL is unavailable.' };
    }

    if (!openResolvedDocumentUrl(reservedWindow, url)) {
        return { error: 'Document viewer was blocked. Allow pop-ups for Estospaces and try again.' };
    }

    return { error: null };
};
