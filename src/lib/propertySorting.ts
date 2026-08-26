import { convertCurrency, type CurrencyCode } from '@/lib/utils/currency';

export interface SortableProperty {
  price?: { amount?: number | null; currency?: string | null };
  priceString?: string | null;
  title?: string | null;
  area?: number | null;
  bedrooms?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  status?: string | null;
  analytics?: { views?: number | null };
}

const SORTABLE_CURRENCIES = new Set<CurrencyCode>([
  'GBP',
  'EUR',
  'USD',
  'AED',
  'INR',
  'AUD',
  'CAD',
  'CHF',
]);

export const getSortablePropertyPrice = (property: SortableProperty): number => {
  const amount = Number(property.price?.amount);
  if (Number.isFinite(amount)) {
    const currency = String(property.price?.currency || '').toUpperCase() as CurrencyCode;
    return SORTABLE_CURRENCIES.has(currency)
      ? convertCurrency(amount, currency, 'GBP')
      : amount;
  }

  const parsed = Number.parseFloat(String(property.priceString ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

export const sortProperties = <T extends SortableProperty>(
  properties: T[],
  field: 'price' | 'area' | 'bedrooms' | 'views' | 'title' | 'createdAt' | 'updatedAt' | 'status',
  order: 'asc' | 'desc',
): T[] => {
  const direction = order === 'asc' ? 1 : -1;

  return [...properties].sort((left, right) => {
    let difference = 0;

    switch (field) {
      case 'price':
        difference = getSortablePropertyPrice(left) - getSortablePropertyPrice(right);
        break;
      case 'area':
        difference = Number(left.area ?? 0) - Number(right.area ?? 0);
        break;
      case 'bedrooms':
        difference = Number(left.bedrooms ?? 0) - Number(right.bedrooms ?? 0);
        break;
      case 'views':
        difference = Number(left.analytics?.views ?? 0) - Number(right.analytics?.views ?? 0);
        break;
      case 'title':
      case 'status':
        difference = String(left[field] ?? '').localeCompare(String(right[field] ?? ''));
        break;
      case 'createdAt':
      case 'updatedAt':
        difference = new Date(String(left[field] ?? 0)).getTime() - new Date(String(right[field] ?? 0)).getTime();
        break;
    }

    return (Number.isFinite(difference) ? difference : 0) * direction;
  });
};
