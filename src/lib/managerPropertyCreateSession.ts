import { getErrorStatus } from '@/lib/apiUtils';

/**
 * Saves a new-property form (MB-0176). Every create from one form sends the
 * same Idempotency-Key, so a create retried after its response was lost gets
 * back the property core already made instead of a duplicate. Once core has
 * returned the form's property, the form saves onto it as edit mode would.
 */
export function createManagerPropertyCreateSession(idempotencyKey: string = crypto.randomUUID()) {
    let propertyId: string | null = null;
    let outcomeUnknown = false;

    return {
        async save<T extends { id: string }>(
            create: (idempotencyKey: string) => Promise<T | null>,
            update: (id: string) => Promise<T | null>,
        ): Promise<T | null> {
            if (propertyId) {
                return update(propertyId);
            }
            let created: T | null;
            try {
                created = await create(idempotencyKey);
            } catch (error) {
                // No response or a 5xx: core may have committed the create.
                const status = getErrorStatus(error);
                if (status === undefined || status >= 500) {
                    outcomeUnknown = true;
                }
                throw error;
            }
            if (!created) {
                return null;
            }
            propertyId = created.id;
            // The lost attempt may be the one that created it, with older
            // values, so save the current form onto it.
            return outcomeUnknown ? update(created.id) : created;
        },
    };
}
