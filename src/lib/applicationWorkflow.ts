import { Application as BackendApplication } from '@/services/applicationsService';
import { Viewing } from '@/services/bookingsService';

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
