interface ObjectURLProvider {
  createObjectURL: (file: Blob) => string;
  revokeObjectURL: (url: string) => void;
}

export const createManagerPropertyVideoPreview = (
  file: File,
  provider: ObjectURLProvider = URL,
) => provider.createObjectURL(file);

export const revokeManagerPropertyVideoPreview = (
  previewURL: string,
  ownedPreviewURLs: Set<string>,
  provider: ObjectURLProvider = URL,
) => {
  if (!ownedPreviewURLs.delete(previewURL)) {
    return false;
  }

  provider.revokeObjectURL(previewURL);
  return true;
};

export const revokeAllManagerPropertyVideoPreviews = (
  ownedPreviewURLs: Set<string>,
  provider: ObjectURLProvider = URL,
) => {
  for (const previewURL of ownedPreviewURLs) {
    provider.revokeObjectURL(previewURL);
  }
  ownedPreviewURLs.clear();
};
