const formatTitleCase = (value: string) =>
    value.replace(/\b\w/g, (char) => char.toUpperCase());

const normalizeInteger = (value?: number | null) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return 0;
    }
    return Math.max(0, Math.trunc(value));
};

export const getPropertyInventoryState = (totalFloors?: number | null, occupiedUnits?: number | null) => {
    const rawTotalFloors = normalizeInteger(totalFloors);
    const hasMultipleUnits = rawTotalFloors > 1;
    const totalUnits = hasMultipleUnits ? rawTotalFloors : 1;
    const occupied = Math.min(normalizeInteger(occupiedUnits), totalUnits);
    const available = Math.max(totalUnits - occupied, 0);

    return {
        totalUnits,
        occupiedUnits: occupied,
        availableUnits: available,
        hasMultipleUnits,
        isPartiallyOccupied: occupied > 0 && occupied < totalUnits,
        isFullyOccupied: occupied >= totalUnits,
    };
};

export const formatPropertyInventoryCaption = (totalFloors?: number | null, occupiedUnits?: number | null) => {
    const inventory = getPropertyInventoryState(totalFloors, occupiedUnits);
    if (!inventory.hasMultipleUnits) {
        return null;
    }
    if (inventory.isFullyOccupied) {
        return `Fully occupied across ${inventory.totalUnits} floors`;
    }
    if (inventory.isPartiallyOccupied) {
        return `${inventory.occupiedUnits} of ${inventory.totalUnits} floors occupied`;
    }
    return `${inventory.totalUnits} floors available`;
};

// Property types whose floors are rentable units tracked by `occupied_units`.
// Every other type is a single unit (a flat, a house) inside a building.
const MULTI_UNIT_PROPERTY_TYPES: ReadonlySet<string> = new Set([
    'commercial',
    'industrial',
    'office',
]);

export interface PropertyFloorCaptionInput {
    propertyType?: string | null;
    property_type?: string | null;
    floor_number?: number | null;
    total_floors?: number | null;
    occupied_units?: number | null;
    dimensions?: {
        floorNumber?: number | null;
        totalFloors?: number | null;
        occupiedUnits?: number | null;
    } | null;
}

/**
 * Floor caption for a manager property card or row.
 *
 * Commercial, industrial and office listings keep the whole-building occupancy
 * caption. Land has no floors. Every other type (residential, and a missing
 * type, which the create form treats as residential) is one unit, so it shows
 * its position in the building rather than "N floors available".
 */
export const formatPropertyFloorCaption = (property: PropertyFloorCaptionInput) => {
    const propertyType = (property.propertyType ?? property.property_type ?? '').trim().toLowerCase();
    const totalFloors = property.dimensions?.totalFloors ?? property.total_floors;

    if (MULTI_UNIT_PROPERTY_TYPES.has(propertyType)) {
        return formatPropertyInventoryCaption(
            totalFloors,
            property.dimensions?.occupiedUnits ?? property.occupied_units,
        );
    }
    if (propertyType === 'land') {
        return null;
    }

    // The API and the property context both default unknown values to 0 or 1,
    // so a single-storey building and floor 0 carry no usable information.
    // Floor 0 cannot be shown as "Ground floor": core stores floor_number as a
    // non-null int with default 0 (Property.FloorNumber `gorm:"default:0"
    // json:"floor_number"`), the create request is an `omitempty` int, and the
    // form omits an empty field, so "ground floor" and "not provided" both come
    // back as 0. Showing "Ground floor of Y" needs a nullable floor number in
    // core first.
    const total = normalizeInteger(totalFloors);
    if (total <= 1) {
        return null;
    }
    const floor = normalizeInteger(property.dimensions?.floorNumber ?? property.floor_number);
    if (floor >= 1 && floor <= total) {
        return `Floor ${floor} of ${total}`;
    }
    return `${total}-floor building`;
};

export const formatPropertyStatusLabel = (status?: string) => {
    const normalizedStatus = status?.trim().toLowerCase();

    if (normalizedStatus === 'pending_approval') {
        return 'Admin Approval Pending';
    }
    if (normalizedStatus === 'published' || normalizedStatus === 'online' || normalizedStatus === 'active' || normalizedStatus === 'available') {
        return 'Available';
    }
    if (normalizedStatus === 'let' || normalizedStatus === 'rented') {
        return 'Rented';
    }

    const normalized = (status || 'draft').trim().replace(/_/g, ' ');
    return formatTitleCase(normalized);
};

export const getManagerPropertyStatusBadge = (status?: string) => {
    const normalizedStatus = status?.trim().toLowerCase() || 'draft';

    switch (normalizedStatus) {
        case 'published':
        case 'online':
        case 'active':
        case 'available':
            return {
                label: formatPropertyStatusLabel(status),
                badgeClassName: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300',
                dotClassName: 'bg-emerald-500',
            };
        case 'pending':
        case 'pending_approval':
        case 'under_offer':
        case 'under_contract':
            return {
                label: formatPropertyStatusLabel(status),
                badgeClassName: 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300',
                dotClassName: 'bg-amber-500',
            };
        case 'rejected':
            return {
                label: formatPropertyStatusLabel(status),
                badgeClassName: 'bg-red-500/10 text-red-700 ring-red-500/20 dark:text-red-300',
                dotClassName: 'bg-red-500',
            };
        case 'suspended':
            return {
                label: formatPropertyStatusLabel(status),
                badgeClassName: 'bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300',
                dotClassName: 'bg-rose-500',
            };
        case 'sold':
            return {
                label: formatPropertyStatusLabel(status),
                badgeClassName: 'bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:text-blue-300',
                dotClassName: 'bg-blue-500',
            };
        case 'let':
        case 'rented':
            return {
                label: formatPropertyStatusLabel(status),
                badgeClassName: 'bg-violet-500/10 text-violet-700 ring-violet-500/20 dark:text-violet-300',
                dotClassName: 'bg-violet-500',
            };
        case 'coming_soon':
            return {
                label: formatPropertyStatusLabel(status),
                badgeClassName: 'bg-indigo-500/10 text-indigo-700 ring-indigo-500/20 dark:text-indigo-300',
                dotClassName: 'bg-indigo-500',
            };
        case 'off_market':
        case 'offline':
            return {
                label: formatPropertyStatusLabel(status),
                badgeClassName: 'bg-zinc-500/10 text-zinc-700 ring-zinc-500/20 dark:text-zinc-300',
                dotClassName: 'bg-zinc-500',
            };
        case 'draft':
        default:
            return {
                label: formatPropertyStatusLabel(status),
                badgeClassName: 'bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300',
                dotClassName: 'bg-slate-500',
            };
    }
};
