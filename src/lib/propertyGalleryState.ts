export interface PropertyGalleryDisplayState {
    hasImages: boolean;
    photoCountLabel: string;
    positionLabel: string;
}

export const getPropertyGalleryDisplayState = (
    imageCount: number,
    selectedIndex: number,
): PropertyGalleryDisplayState => {
    const count = Number.isFinite(imageCount) ? Math.max(0, Math.trunc(imageCount)) : 0;
    const hasImages = count > 0;
    const safeIndex = hasImages
        ? Math.min(Math.max(0, Math.trunc(selectedIndex)), count - 1)
        : 0;

    return {
        hasImages,
        photoCountLabel: hasImages ? `${count} photo${count === 1 ? '' : 's'}` : 'No photos',
        positionLabel: hasImages ? `${safeIndex + 1} / ${count}` : 'No photos',
    };
};
