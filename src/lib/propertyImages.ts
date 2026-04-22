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

const uniqueImages = (images: string[]) =>
    Array.from(new Set(images.filter((image) => image.trim().length > 0 && image !== '[]')));

export const getPropertyImages = (property: unknown): string[] => {
    if (!isRecord(property)) {
        return [];
    }

    return uniqueImages([
        ...normalizeImageValue(property.image_urls),
        ...normalizeImageValue(property.images),
        ...normalizeImageValue(isRecord(property.media) ? property.media.images : undefined),
        ...normalizeImageValue(property.image),
        ...normalizeImageValue(property.image_url),
        ...normalizeImageValue(property.thumbnail_url),
        ...normalizeImageValue(property.photo),
        ...normalizeImageValue(property.main_image),
        ...normalizeImageValue(property.property_image),
    ]);
};

export const getPrimaryPropertyImage = (property: unknown, fallback?: string) => {
    const [image] = getPropertyImages(property);
    return image || fallback || null;
};
