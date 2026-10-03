import { getSavedPropertyLocationCity } from './savedPropertyState';

export type ApplicationPropertyOption = {
  id: string;
  label: string;
};

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

/** Builds "Title, City" picker options from saved-property records, skipping records without an ID. */
export function getApplicationPropertyOptions(savedProperties: readonly unknown[]): ApplicationPropertyOption[] {
  return savedProperties.flatMap((property: any) => {
    const id = text(property?.id);
    if (!id) {
      return [];
    }
    const title = text(property?.title) || 'Untitled home';
    const city = getSavedPropertyLocationCity(property);
    return [{ id, label: city ? `${title}, ${city}` : title }];
  });
}
