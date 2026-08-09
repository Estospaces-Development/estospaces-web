import { type ReactNode } from 'react';

export const PRODUCT_ANALYTICS_PREFERENCES_EVENT = 'estospaces:open-product-analytics-preferences';

export default function ProductAnalyticsProvider({ children }: { children: ReactNode }) {
    return <>{children}</>;
}
