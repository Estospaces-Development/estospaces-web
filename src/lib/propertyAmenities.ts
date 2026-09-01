const amenityGroups = [
  'interior',
  'exterior',
  'community',
  'security',
  'utilities',
] as const;

type PropertyAmenities = Partial<Record<(typeof amenityGroups)[number], readonly string[]>>;

export const flattenPropertyAmenities = (
  amenities?: PropertyAmenities | null,
): string[] => {
  const values = amenityGroups.flatMap((group) => amenities?.[group] ?? []);
  return [...new Set(values)];
};
