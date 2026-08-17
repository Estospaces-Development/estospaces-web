interface FastTrackRequestStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

const inMemoryPendingRequests = new Map<string, FastTrackRequestPendingMarker>();

export interface FastTrackRequestPendingMarker {
  requestedAt: number;
}

export const FAST_TRACK_REQUEST_PENDING_TTL_MS = 24 * 60 * 60 * 1000;

export const getFastTrackRequestPendingDelay = (
  marker: FastTrackRequestPendingMarker,
  now: number = Date.now(),
) => Math.max(0, marker.requestedAt + FAST_TRACK_REQUEST_PENDING_TTL_MS - now);

export const resolveFastTrackDeepLinkAction = ({
  fastTrackQuery,
  hasActiveCase,
}: {
  fastTrackQuery: string | null;
  hasActiveCase: boolean;
}): 'open_active_case' | 'show_request_control' => (
  fastTrackQuery === '1' && hasActiveCase
    ? 'open_active_case'
    : 'show_request_control'
);

export const getFastTrackDeepLinkOpenKey = ({
  fastTrackQuery,
  hasActiveCase,
  propertyID,
}: {
  fastTrackQuery: string | null;
  hasActiveCase: boolean;
  propertyID: string;
}) => (
  resolveFastTrackDeepLinkAction({ fastTrackQuery, hasActiveCase }) === 'open_active_case'
    ? `${propertyID}:fast-track=1`
    : null
);

export const resolveFastTrackRequestControlState = ({
  isStarting,
  isLookupPending,
  isApprovalPending,
}: {
  isStarting: boolean;
  isLookupPending: boolean;
  isApprovalPending: boolean;
}) => {
  const isBusy = isStarting || isLookupPending;
  return {
    isBusy,
    isDisabled: isBusy || isApprovalPending,
  };
};

export const getFastTrackRequestPendingKey = (userID: string, propertyID: string) => (
  `estospaces:fast-track-request:${userID}:${propertyID}`
);

export const readFastTrackRequestPending = (
  storage: FastTrackRequestStorage,
  key: string,
  now: number = Date.now(),
): FastTrackRequestPendingMarker | null => {
  const readMemoryMarker = () => {
    const marker = inMemoryPendingRequests.get(key) || null;
    if (marker && now - marker.requestedAt >= FAST_TRACK_REQUEST_PENDING_TTL_MS) {
      clearFastTrackRequestPending(storage, key);
      return null;
    }
    return marker;
  };
  let value: string | null = null;
  try {
    value = storage.getItem(key);
  } catch {
    return readMemoryMarker();
  }
  if (!value) return readMemoryMarker();
  if (value === 'pending') {
    clearFastTrackRequestPending(storage, key);
    return null;
  }

  try {
    const requestedAt = Date.parse(JSON.parse(value)?.requestedAt || '');
    if (!Number.isFinite(requestedAt)) {
      clearFastTrackRequestPending(storage, key);
      return null;
    }
    if (now - requestedAt >= FAST_TRACK_REQUEST_PENDING_TTL_MS) {
      clearFastTrackRequestPending(storage, key);
      return null;
    }
    const marker = { requestedAt };
    inMemoryPendingRequests.set(key, marker);
    return marker;
  } catch {
    clearFastTrackRequestPending(storage, key);
    return null;
  }
};

export const clearFastTrackRequestPending = (
  storage: FastTrackRequestStorage,
  key: string,
) => {
  inMemoryPendingRequests.delete(key);
  try {
    storage.removeItem(key);
  } catch {
    // In-memory state is authoritative when browser storage is unavailable.
  }
};

export const writeFastTrackRequestPending = (
  storage: FastTrackRequestStorage,
  key: string,
  requestedAt: string,
): FastTrackRequestPendingMarker => {
  const parsed = Date.parse(requestedAt);
  if (!Number.isFinite(parsed)) {
    throw new Error('Fast Track request time is invalid');
  }
  const marker = { requestedAt: parsed };
  inMemoryPendingRequests.set(key, marker);
  try {
    storage.setItem(key, JSON.stringify({ requestedAt: new Date(parsed).toISOString() }));
  } catch {
    // The accepted server request remains pending in memory for this session.
  }
  return marker;
};

export const shouldClearFastTrackRequestPending = (
  marker: FastTrackRequestPendingMarker | null,
  fastTrackCase: { propertyId?: string | null; submittedAt?: string | null } | null | undefined,
  propertyID: string,
) => {
  if (!marker || !fastTrackCase || fastTrackCase.propertyId !== propertyID) return false;

  const submittedAt = Date.parse(fastTrackCase.submittedAt || '');
  return Number.isFinite(submittedAt) && submittedAt >= marker.requestedAt;
};
