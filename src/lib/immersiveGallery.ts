export type ImmersiveGalleryZoomPoint = {
    x: number;
    y: number;
};

export type ImmersiveGalleryRect = {
    left: number;
    top: number;
    width: number;
    height: number;
};

export const IMMERSIVE_GALLERY_DEFAULT_ZOOM_POINT: ImmersiveGalleryZoomPoint = {
    x: 50,
    y: 50,
};

const clampPercentage = (value: number) => Math.min(100, Math.max(0, value));

export const resolveImmersiveGalleryZoomPoint = (
    clientX: number,
    clientY: number,
    rect: ImmersiveGalleryRect,
): ImmersiveGalleryZoomPoint => {
    if (rect.width <= 0 || rect.height <= 0) {
        return IMMERSIVE_GALLERY_DEFAULT_ZOOM_POINT;
    }

    return {
        x: clampPercentage(((clientX - rect.left) / rect.width) * 100),
        y: clampPercentage(((clientY - rect.top) / rect.height) * 100),
    };
};

export const formatImmersiveGalleryTransformOrigin = (point: ImmersiveGalleryZoomPoint) =>
    `${point.x}% ${point.y}%`;
