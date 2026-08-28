export type PaginationToken = number | 'ellipsis';

export interface PaginatedItems<T> {
    currentPage: number;
    totalPages: number;
    items: T[];
}

export const paginateItems = <T>(
    items: T[],
    requestedPage: number,
    pageSize: number,
): PaginatedItems<T> => {
    const safePageSize = Math.max(1, Math.floor(pageSize) || 1);
    const totalPages = Math.max(1, Math.ceil(items.length / safePageSize));
    const currentPage = Math.min(Math.max(Math.floor(requestedPage) || 1, 1), totalPages);
    const start = (currentPage - 1) * safePageSize;

    return {
        currentPage,
        totalPages,
        items: items.slice(start, start + safePageSize),
    };
};

export const getVisiblePageTokens = (currentPage: number, totalPages: number): PaginationToken[] => {
    if (totalPages <= 7) {
        return Array.from({ length: totalPages }, (_, index) => index + 1);
    }

    if (currentPage <= 4) {
        return [1, 2, 3, 4, 5, 'ellipsis', totalPages];
    }

    if (currentPage >= totalPages - 3) {
        return [1, 'ellipsis', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }

    return [1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages];
};

export const getPaginationRange = (
    currentPage: number,
    pageSize?: number,
    totalItems?: number,
    currentItemCount?: number,
) => {
    if (!pageSize || totalItems === undefined || totalItems <= 0) {
        return null;
    }

    const start = ((currentPage - 1) * pageSize) + 1;
    const end = Math.min(((currentPage - 1) * pageSize) + (currentItemCount ?? pageSize), totalItems);

    return {
        start,
        end,
    };
};

export const getPaginationNavigationState = (
    currentPage: number,
    totalPages: number,
    disabled = false,
) => {
    const lastPage = Math.max(totalPages, 1);
    const safeCurrentPage = Math.min(Math.max(currentPage, 1), lastPage);
    const canMoveBackward = !disabled && safeCurrentPage > 1;
    const canMoveForward = !disabled && safeCurrentPage < lastPage;

    return {
        safeCurrentPage,
        firstPage: 1,
        previousPage: Math.max(safeCurrentPage - 1, 1),
        nextPage: Math.min(safeCurrentPage + 1, lastPage),
        lastPage,
        canGoFirst: canMoveBackward,
        canGoPrevious: canMoveBackward,
        canGoNext: canMoveForward,
        canGoLast: canMoveForward,
    };
};
