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
