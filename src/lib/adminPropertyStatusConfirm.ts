export type AdminPropertyConfirmStatus = 'published' | 'suspended';

/** Copy for the confirm step before an admin publishes or suspends a listing (QA-E2E-20261014 A54). */
export function getAdminPropertyStatusConfirmCopy(status: AdminPropertyConfirmStatus, title?: string | null) {
    const name = title?.trim() || 'this listing';
    if (status === 'published') {
        return {
            title: 'Publish this listing?',
            message: `"${name}" will go live to users straight away. You can suspend it again afterwards.`,
            confirmText: 'Approve and publish',
            variant: 'default' as const,
        };
    }
    return {
        title: 'Suspend this listing?',
        message: `"${name}" will be hidden from users until it is published again.`,
        confirmText: 'Suspend listing',
        variant: 'warning' as const,
    };
}
