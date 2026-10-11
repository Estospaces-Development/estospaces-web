// Saved gallery images are URL strings with no file name or size, so a file the
// manager picks again cannot be matched against them directly. The media library
// records the original name and size of every upload; a picked file with the same
// name and size as an upload whose URL is still on the listing is the same image.
export interface UploadedImageRecord {
    name: string;
    size: number;
    url: string;
}

// The media layer may add a cache-version or signature query to a stored URL.
const urlKey = (url: string) => url.trim().split(/[?#]/)[0];

/**
 * The saved URL a picked file duplicates, or undefined. Only uploads still on the
 * listing count, so an image the manager removed can be added again.
 */
export function findDuplicateListingImage(
    file: { name: string; size: number },
    uploaded: readonly UploadedImageRecord[],
    listingImages: readonly unknown[],
): string | undefined {
    const onListing = new Set(
        listingImages
            .filter((entry): entry is string => typeof entry === 'string')
            .map(urlKey),
    );
    return uploaded.find(
        (record) => record.name === file.name && record.size === file.size && onListing.has(urlKey(record.url)),
    )?.url;
}
