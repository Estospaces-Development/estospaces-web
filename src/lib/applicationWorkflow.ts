import { Application as BackendApplication } from '@/services/applicationsService';
import { Viewing } from '@/services/bookingsService';

type ApplicationPropertySnapshotSource = {
    title?: string | null;
    address_line_1?: string | null;
    city?: string | null;
    postcode?: string | null;
    image_urls?: string[] | string | null;
    property_type?: string | null;
    listing_type?: string | null;
    price?: number | null;
    agent_name?: string | null;
    agent_email?: string | null;
    agent_phone?: string | null;
    agent_company?: string | null;
};

const normalizeText = (value?: string | null) => {
    const normalized = value?.trim();
    return normalized || undefined;
};

const firstPropertyImage = (imageUrls?: string[] | string | null) => {
    if (Array.isArray(imageUrls)) {
        return normalizeText(imageUrls[0]);
    }

    const value = normalizeText(imageUrls);
    if (!value) {
        return undefined;
    }

    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
            return normalizeText(parsed.find((item) => typeof item === 'string'));
        }
    } catch {
        return value;
    }

    return value;
};

export const buildApplicationPropertySnapshot = (property: ApplicationPropertySnapshotSource | null | undefined) => {
    if (!property) {
        return {};
    }

    return {
        property_title: normalizeText(property.title),
        property_address: normalizeText(property.address_line_1)
            || [property.city, property.postcode].map(normalizeText).filter(Boolean).join(', ')
            || undefined,
        property_image: firstPropertyImage(property.image_urls),
        property_type: normalizeText(property.property_type),
        listing_type: normalizeText(property.listing_type),
        property_price: property.price ?? undefined,
        agent_name: normalizeText(property.agent_name),
        agent_email: normalizeText(property.agent_email),
        agent_phone: normalizeText(property.agent_phone),
        agent_agency: normalizeText(property.agent_company),
    };
};

const compareViewings = (left: Viewing, right: Viewing) => (
    new Date(right.scheduled_at).getTime() - new Date(left.scheduled_at).getTime()
);

export const findRelatedViewing = (
    application: BackendApplication,
    viewings: Viewing[],
) => {
    const directMatch = viewings
        .filter((viewing) => viewing.application_id === application.id && viewing.status !== 'cancelled')
        .sort(compareViewings)[0];

    if (directMatch) {
        return directMatch;
    }

    return viewings
        .filter((viewing) =>
            viewing.property_id === application.property_id &&
            viewing.user_id === application.user_id &&
            viewing.status !== 'cancelled',
        )
        .sort(compareViewings)[0];
};
