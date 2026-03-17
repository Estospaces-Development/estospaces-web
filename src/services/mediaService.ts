import { apiFetch, getServiceUrl } from '@/lib/apiUtils';

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

export const uploadMediaFile = async (
    file: File,
    entityType: string,
    entityId: string,
    altText = '',
    isPublic = true,
): Promise<MediaFile> => {
    const body = new FormData();
    body.append('file', file);
    body.append('entity_type', entityType);
    body.append('entity_id', entityId);
    body.append('alt_text', altText);
    body.append('is_public', String(isPublic));

    return apiFetch<MediaFile>(`${MEDIA_URL()}/api/v1/media`, {
        method: 'POST',
        body,
    });
};

export const reassignMediaEntity = async (
    fromEntityType: string,
    fromEntityId: string,
    toEntityType: string,
    toEntityId: string,
): Promise<void> => {
    await apiFetch(`${MEDIA_URL()}/api/v1/media/reassign`, {
        method: 'PUT',
        body: JSON.stringify({
            from_entity_type: fromEntityType,
            from_entity_id: fromEntityId,
            to_entity_type: toEntityType,
            to_entity_id: toEntityId,
        }),
    });
};
