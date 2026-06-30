export type PaginationToken = number | 'ellipsis';

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
