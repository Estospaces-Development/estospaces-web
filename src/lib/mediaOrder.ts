/** Returns a copy of `list` with the item at `from` moved to index `to`. Out-of-range moves return an unchanged copy. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  const next = [...list];
  if (from === to || from < 0 || to < 0 || from >= next.length || to >= next.length) {
    return next;
  }
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Replaces each non-string entry (a pending upload) with the next uploaded URL,
 * so mixed saved/new media keep the order the manager chose.
 */
export function mergeUploadedUrlsInOrder(
  entries: readonly unknown[],
  uploadedUrls: readonly string[],
): string[] {
  let nextUpload = 0;
  return entries.map((entry) =>
    typeof entry === "string" ? entry : uploadedUrls[nextUpload++],
  );
}
