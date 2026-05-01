const maxSavedSearchNameLength = 80;
const savedSearchNamePattern = /^[\p{L}\p{N}][\p{L}\p{N} _'&/,.()-]*$/u;

export const normalizeSavedSearchName = (value: string) =>
    value.trim().replace(/\s+/g, ' ');

export const getSavedSearchNameError = (value: string) => {
    const name = normalizeSavedSearchName(value);
    if (!name) {
        return 'Search name is required.';
    }
    if (name.length > maxSavedSearchNameLength) {
        return 'Search name must be 80 characters or fewer.';
    }
    if (!savedSearchNamePattern.test(name)) {
        return 'Search name can use letters, numbers, spaces, and - _ \' & / , . ( ).';
    }

    return '';
};
