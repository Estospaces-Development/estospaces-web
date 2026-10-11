import { mergeUploadedUrlsInOrder } from './mediaOrder';

const reasonText = (reason: unknown): string => {
    const message = (reason as { message?: unknown } | null | undefined)?.message;
    return typeof message === 'string' ? message.trim() : '';
};

/**
 * Returns a saved URL for every entry: strings pass through, and each File is
 * uploaded once. `uploaded` remembers every success, so when one file fails the
 * others are not sent again by the next Save (QA MB-0937).
 *
 * All uploads settle before this throws, and the error names the failed files.
 */
export async function uploadPendingFiles(
    entries: readonly (File | string)[],
    uploaded: WeakMap<File, string>,
    upload: (files: File[]) => Promise<PromiseSettledResult<string>[]>,
    noun: 'image' | 'video',
): Promise<string[]> {
    const pending = entries.filter((entry): entry is File => typeof entry !== 'string' && !uploaded.has(entry));
    if (pending.length > 0) {
        const results = await upload(pending);
        const failures: { name: string; reason: string }[] = [];
        pending.forEach((file, index) => {
            const result = results[index];
            if (result?.status === 'fulfilled') {
                uploaded.set(file, result.value);
            } else {
                failures.push({ name: file.name, reason: reasonText(result?.reason) });
            }
        });
        if (failures.length > 0) {
            const kept = entries.filter((entry) => typeof entry !== 'string' && uploaded.has(entry)).length;
            const reason = failures[0].reason ? ` (${failures[0].reason})` : '';
            const keptNote = kept > 0 ? ` ${kept} other ${noun}${kept === 1 ? '' : 's'} uploaded already and will not be sent again.` : '';
            throw new Error(
                `${failures.map((failure) => failure.name).join(', ')} could not be uploaded${reason}.${keptNote} Save again to retry the failed ${noun}${failures.length === 1 ? '' : 's'}.`,
            );
        }
    }
    return mergeUploadedUrlsInOrder(
        entries,
        entries.filter((entry): entry is File => typeof entry !== 'string').map((file) => uploaded.get(file) as string),
    );
}
