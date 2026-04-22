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
        return { url: data.access_url || null, error: null };
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
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
        });
        if (!response.ok) {
            return {
                url,
                blob: null,
                error: `Document preview request failed with status ${response.status}.`,
            };
        }

        return { url, blob: await response.blob(), error: null };
    } catch (fetchError: any) {
        return {
            url,
            blob: null,
            error: getErrorMessage(fetchError) || 'Unable to fetch the document preview.',
        };
    }
};

export const openDocumentAccessUrl = async (
    documentId: string,
): Promise<{ error: string | null }> => {
    const { url, error } = await getDocumentAccessUrl(documentId);
    if (error || !url) {
        return { error: error || 'Document access URL is unavailable.' };
    }

    window.open(url, '_blank', 'noopener,noreferrer');
    return { error: null };
};
