export const buildBrokerRequestWorkspacePath = (requestId?: string | null) => {
    const params = new URLSearchParams();
    params.set('workspace', 'broker-request');

    const trimmedRequestId = String(requestId || '').trim();
    if (trimmedRequestId) {
        params.set('request', trimmedRequestId);
    }

    return `/user/dashboard?${params.toString()}#broker-request-workspace`;
};
