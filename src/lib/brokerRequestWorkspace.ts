export const buildBrokerRequestWorkspacePath = (requestId?: string | null) => {
    const params = new URLSearchParams();
    params.set('workspace', 'broker-request');

    const trimmedRequestId = String(requestId || '').trim();
    if (trimmedRequestId) {
        params.set('request', trimmedRequestId);
    }

    return `/user/dashboard?${params.toString()}#broker-request-workspace`;
};

const BROKER_REQUEST_WORKSPACE_SELECTION_KEY = 'estospaces.activeBrokerRequestId';

export const BROKER_REQUEST_WORKSPACE_EVENT = 'broker-request:workspace-selection';

const normalizeRequestId = (requestId?: string | null) => {
    const trimmedRequestId = String(requestId || '').trim();
    return trimmedRequestId.length > 0 ? trimmedRequestId : null;
};

export const readBrokerRequestWorkspaceSelection = () => {
    if (typeof window === 'undefined') {
        return null;
    }

    return normalizeRequestId(window.sessionStorage.getItem(BROKER_REQUEST_WORKSPACE_SELECTION_KEY));
};

export const publishBrokerRequestWorkspaceSelection = (requestId?: string | null) => {
    if (typeof window === 'undefined') {
        return;
    }

    const normalizedRequestId = normalizeRequestId(requestId);

    if (normalizedRequestId) {
        window.sessionStorage.setItem(BROKER_REQUEST_WORKSPACE_SELECTION_KEY, normalizedRequestId);
    } else {
        window.sessionStorage.removeItem(BROKER_REQUEST_WORKSPACE_SELECTION_KEY);
    }

    window.dispatchEvent(new CustomEvent(BROKER_REQUEST_WORKSPACE_EVENT, {
        detail: {
            requestId: normalizedRequestId,
        },
    }));
};
