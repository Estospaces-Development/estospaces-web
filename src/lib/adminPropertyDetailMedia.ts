import { getPropertyImages } from './propertyImages';

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const getPropertyTitle = (property: unknown) => {
    if (!isRecord(property) || typeof property.title !== 'string' || property.title.trim().length === 0) {
        return 'this listing';
    }

    return property.title.trim();
};

export const getAdminPropertyDetailMedia = (property: unknown) => {
    const imageUrls = getPropertyImages(property);
    const title = getPropertyTitle(property);

    return {
        imageUrls,
        primaryImageUrl: imageUrls[0] || null,
        hasImages: imageUrls.length > 0,
        fallbackTitle: 'No property images uploaded',
        fallbackDescription: 'Continue review with the listing details while the manager adds property photos.',
        fallbackAriaLabel: `No property images uploaded for ${title}`,
    };
};
