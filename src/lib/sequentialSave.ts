/**
 * Runs saves one at a time, in call order, so an older request can never land
 * on the server after a newer one. Each result reports whether it came from the
 * most recent call; callers should only apply the server response to local
 * state when it did, otherwise a slow older save overwrites newer edits.
 */
export function createSequentialSaver<T, R>(save: (value: T) => Promise<R>) {
    let chain: Promise<unknown> = Promise.resolve();
    let latestCallId = 0;

    return (value: T): Promise<{ result: R; isLatest: boolean }> => {
        const callId = ++latestCallId;
        const run = chain
            .then(() => save(value))
            .then((result) => ({ result, isLatest: callId === latestCallId }));
        chain = run.catch(() => undefined);
        return run;
    };
}
