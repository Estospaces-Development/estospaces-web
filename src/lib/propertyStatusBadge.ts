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
