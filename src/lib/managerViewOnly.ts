/**
 * Owner decision (10 Oct 2026): a manager whose verification was rejected or
 * revoked can open every existing Fast Track case, appointment, application and
 * contract but cannot change them until an admin re-approves. Managers who are
 * only waiting for (re-)review keep working. Booking enforces this on every
 * write; the web only reflects it.
 *
 * Core stores an admin revoke as `rejected`, so `rejected` is the one status
 * the web sees for both.
 */
export const isManagerViewOnly = (status: string | null | undefined): boolean => status === 'rejected';

/**
 * A rejected manager who fixes their documents and resubmits shows as pending
 * review, yet stays read-only until an admin approves again. Core reports that
 * on the manager's own profile as `booking_read_only`, so the web combines both.
 */
export const resolveManagerViewOnly = (
    status: string | null | undefined,
    bookingReadOnly: boolean | null | undefined,
): boolean => isManagerViewOnly(status) || bookingReadOnly === true;

/** Error codes booking sends with its manager verification refusals. */
export const MANAGER_READ_ONLY_ERROR_CODE = 'manager_read_only';
export const MANAGER_VERIFICATION_UNAVAILABLE_ERROR_CODE = 'manager_verification_unavailable';

/** Same wording as booking's 403, so a blocked click and a refused request read alike. */
export const MANAGER_VIEW_ONLY_REASON = 'Your manager verification was rejected or revoked. You can view your cases but cannot make changes until an admin re-approves you.';

/** Short form for a disabled button's title or a small inline note. */
export const MANAGER_VIEW_ONLY_HINT = 'View only until an admin re-approves you.';

/** Booking's own refusals carry a message the user should read as sent. */
export const isManagerVerificationGuardErrorCode = (code: string | null | undefined): boolean => (
    code === MANAGER_READ_ONLY_ERROR_CODE || code === MANAGER_VERIFICATION_UNAVAILABLE_ERROR_CODE
);
