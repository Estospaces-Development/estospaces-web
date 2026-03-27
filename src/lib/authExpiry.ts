export const AUTH_EXPIRED_MESSAGE = 'Your session has expired. Please log in again.';

let expiredSessionToken: string | null = null;
let sessionExpiryHandled = false;

export const resetAuthExpiryState = () => {
    expiredSessionToken = null;
    sessionExpiryHandled = false;
};

export const syncAuthExpiryState = (token: string | null | undefined) => {
    if (!token) {
        return;
    }

    if (sessionExpiryHandled && expiredSessionToken && token !== expiredSessionToken) {
        resetAuthExpiryState();
    }
};

export const handleUnauthorizedSession = ({
    isBrowser,
    isAuthEndpoint,
    token,
    onExpire,
}: {
    isBrowser: boolean;
    isAuthEndpoint: boolean;
    token: string | null | undefined;
    onExpire: () => void;
}) => {
    if (!isBrowser || isAuthEndpoint) {
        return false;
    }

    if (sessionExpiryHandled) {
        if (!token || !expiredSessionToken || token === expiredSessionToken) {
            return true;
        }

        resetAuthExpiryState();
    }

    if (!token) {
        return false;
    }

    expiredSessionToken = token;
    sessionExpiryHandled = true;
    onExpire();
    return true;
};
