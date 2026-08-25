const PROPERTY_SEARCH_RETURN_CACHE_PREFIX = 'estospaces:property-search-return:v1';
export const PROPERTY_SEARCH_RETURN_CACHE_TTL_MS = 30 * 60 * 1000;

interface BrowserStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PropertySearchReturnState {
  pathname: string;
  search: string;
  scrollY: number;
  savedAt: number;
}

interface SavePropertySearchReturnStateInput {
  pathname: string;
  search: string;
  scrollY: number;
}

const normalizePathname = (pathname: string) => {
  const normalized = String(pathname || '').trim();
  return normalized.startsWith('/') && !/[?#]/.test(normalized) && normalized.length <= 256
    ? normalized
    : '';
};

const normalizeSearch = (search: string) => {
  const normalized = String(search || '').trim();
  if (!normalized) return '';
  const withPrefix = normalized.startsWith('?') ? normalized : `?${normalized}`;
  return withPrefix.length <= 2048 ? withPrefix : '';
};

const getCacheKey = (pathname: string) => (
  `${PROPERTY_SEARCH_RETURN_CACHE_PREFIX}:${pathname}`
);

export function savePropertySearchReturnState(
  storage: BrowserStorageLike | null | undefined,
  input: SavePropertySearchReturnStateInput,
  now = Date.now(),
) {
  const pathname = normalizePathname(input.pathname);
  const search = normalizeSearch(input.search);
  if (!storage || !pathname || !search) return false;

  const scrollY = Number.isFinite(input.scrollY) ? Math.max(0, Math.round(input.scrollY)) : 0;
  const savedAt = Number.isFinite(now) ? now : Date.now();

  try {
    storage.setItem(getCacheKey(pathname), JSON.stringify({
      pathname,
      search,
      scrollY,
      savedAt,
    } satisfies PropertySearchReturnState));
    return true;
  } catch {
    return false;
  }
}

export function readPropertySearchReturnState(
  storage: BrowserStorageLike | null | undefined,
  pathnameInput: string,
  now = Date.now(),
): PropertySearchReturnState | null {
  const pathname = normalizePathname(pathnameInput);
  if (!storage || !pathname) return null;

  const key = getCacheKey(pathname);
  try {
    const rawValue = storage.getItem(key);
    if (!rawValue) return null;

    const parsed = JSON.parse(rawValue) as Partial<PropertySearchReturnState>;
    const search = normalizeSearch(parsed.search || '');
    const savedAt = Number(parsed.savedAt);
    const scrollY = Number(parsed.scrollY);
    const isExpired = !Number.isFinite(savedAt)
      || savedAt > now + 60_000
      || now - savedAt > PROPERTY_SEARCH_RETURN_CACHE_TTL_MS;

    if (
      normalizePathname(parsed.pathname || '') !== pathname
      || !search
      || !Number.isFinite(scrollY)
      || scrollY < 0
      || isExpired
    ) {
      storage.removeItem(key);
      return null;
    }

    return {
      pathname,
      search,
      scrollY: Math.round(scrollY),
      savedAt,
    };
  } catch {
    try {
      storage.removeItem(key);
    } catch {
      // Storage can be unavailable in privacy-restricted browsers.
    }
    return null;
  }
}

export function clearPropertySearchReturnState(
  storage: BrowserStorageLike | null | undefined,
  pathnameInput: string,
) {
  const pathname = normalizePathname(pathnameInput);
  if (!storage || !pathname) return;

  try {
    storage.removeItem(getCacheKey(pathname));
  } catch {
    // Clearing cached UI state should never block the search flow.
  }
}

