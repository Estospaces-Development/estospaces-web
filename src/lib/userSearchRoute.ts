export const USER_SEARCH_PATH = '/user/dashboard/discover';

export const buildPreservedUserSearchRedirect = (search: string, hash: string) => (
    `${USER_SEARCH_PATH}${search}${hash}`
);
