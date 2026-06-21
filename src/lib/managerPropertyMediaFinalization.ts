type DraftMediaFile = {
    entity_type?: string;
    entity_id?: string;
};

type DraftPropertyMediaFinalizationInput = {
    existingPropertyId?: string | null;
    draftEntityId: string;
    createdPropertyId: string;
    imageEntries: readonly unknown[];
    videoEntries: readonly unknown[];
    mediaFiles: readonly DraftMediaFile[];
};

function hasSelectedUpload(entries: readonly unknown[]) {
    return entries.some((entry) => typeof entry !== 'string');
}

export function shouldReassignDraftPropertyMedia({
    existingPropertyId,
    draftEntityId,
    createdPropertyId,
    imageEntries,
    videoEntries,
    mediaFiles,
}: DraftPropertyMediaFinalizationInput) {
    if (existingPropertyId || draftEntityId === createdPropertyId) {
        return false;
    }

    if (hasSelectedUpload(imageEntries) || hasSelectedUpload(videoEntries)) {
        return true;
    }

    return mediaFiles.some(
        (file) => file.entity_type === 'property' && file.entity_id === draftEntityId,
    );
}

