// After a deploy, an open tab still asks for lazy chunks from the previous build, and those files are gone.
// Reload once per location onto the new build; if the chunk is still missing after that, give up so it
// can never reload forever (MB-1009, MB-0933).
export const CHUNK_RELOAD_KEY = 'estospaces:lazy-route-reload';

type ChunkReloadWindow = Pick<Window, 'location' | 'sessionStorage'> & {
    __estospacesChunkReload?: 'reloading' | 'gave-up';
};

export const isChunkLoadError = (error: unknown) => {
    if (!(error instanceof Error)) {
        return false;
    }

    return [
        'Failed to fetch dynamically imported module',
        'Importing a module script failed',
        'ChunkLoadError',
        'error loading dynamically imported module',
        // Vite's preload helper when a lazy route's CSS file is missing after a deploy.
        'Unable to preload CSS',
    ].some((message) => error.message.includes(message));
};

/** Returns true while the one reload for this location is in flight, false once it already failed here. */
export function reloadOnceForMissingChunk(win: ChunkReloadWindow = window): boolean {
    // Both the vite:preloadError listener and lazyPage report the same failure; decide once per page load.
    if (win.__estospacesChunkReload) {
        return win.__estospacesChunkReload === 'reloading';
    }

    try {
        const here = `${win.location.pathname}${win.location.search}${win.location.hash}`;
        if (win.sessionStorage.getItem(CHUNK_RELOAD_KEY) === here) {
            win.sessionStorage.removeItem(CHUNK_RELOAD_KEY);
            win.__estospacesChunkReload = 'gave-up';
            return false;
        }
        win.sessionStorage.setItem(CHUNK_RELOAD_KEY, here);
    } catch {
        // Without storage there is no loop guard, so never reload.
        win.__estospacesChunkReload = 'gave-up';
        return false;
    }

    win.__estospacesChunkReload = 'reloading';
    win.location.reload();
    return true;
}
