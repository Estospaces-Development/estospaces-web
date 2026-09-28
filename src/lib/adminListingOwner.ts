export const ADMIN_LISTING_OWNER_NOT_SET_LABEL = 'Owner not set';

export type AdminListingOwnerSource = {
    managerName?: string | null;
    manager_name?: string | null;
    contactName?: string | null;
    agent_name?: string | null;
};

export type AdminListingOwner = {
    label: string;
    initials: string;
    isSet: boolean;
};

const cleanName = (value: string | null | undefined) => (typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '');

const toInitials = (name: string) => {
    const parts = name.split(' ').filter(Boolean);
    if (parts.length === 0) return '';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

/**
 * Resolves the admin "Listing Owner" label. The owning manager's account name
 * (core `manager_name`, admin reads only) wins; the optional listing contact
 * name is a fallback; otherwise the owner is plainly "not set" rather than
 * implying an unknown user.
 */
export const resolveAdminListingOwner = (property: AdminListingOwnerSource | null | undefined): AdminListingOwner => {
    const name = cleanName(property?.managerName ?? property?.manager_name)
        || cleanName(property?.contactName ?? property?.agent_name);

    if (!name) {
        return { label: ADMIN_LISTING_OWNER_NOT_SET_LABEL, initials: '--', isSet: false };
    }

    return { label: name, initials: toInitials(name), isSet: true };
};
