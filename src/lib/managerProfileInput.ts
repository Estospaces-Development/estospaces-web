export function normalizeManagerBranchNameInput(value: string): string {
    return value.replace(/\s{2,}/g, ' ');
}
