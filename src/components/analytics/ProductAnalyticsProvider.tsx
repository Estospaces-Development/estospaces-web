import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import {
    classifyProductRoute,
    getProductAnalyticsConsent,
    resetProductAnalyticsIdentity,
    setProductAnalyticsConsent,
    setProductAnalyticsIdentity,
    startAxiosProductAnalytics,
    startProductAnalytics,
    trackProductEvent,
} from '@/lib/productAnalytics';

export const PRODUCT_ANALYTICS_PREFERENCES_EVENT = 'estospaces:open-product-analytics-preferences';

export default function ProductAnalyticsProvider({ children }: { children: ReactNode }) {
    const location = useLocation();
    const { user } = useAuth();
    const [preference, setPreference] = useState<'accepted' | 'loading' | 'rejected' | 'unset'>('loading');
    const identityKeyRef = useRef('');

    useEffect(() => {
        const stored = getProductAnalyticsConsent();
        setPreference(stored === 'accepted' || stored === 'rejected' ? stored : 'unset');
        const reopen = () => setPreference('unset');
        window.addEventListener(PRODUCT_ANALYTICS_PREFERENCES_EVENT, reopen);
        return () => window.removeEventListener(PRODUCT_ANALYTICS_PREFERENCES_EVENT, reopen);
    }, []);

    useEffect(() => {
        if (preference !== 'accepted') return;
        startAxiosProductAnalytics();
        startProductAnalytics();
        trackProductEvent('product_route_viewed', {
            area: classifyProductRoute(location.pathname),
            role: user?.role || 'anonymous',
        });
    }, [location.pathname, preference, user?.role]);

    useEffect(() => {
        if (preference !== 'accepted') return;
        if (!user?.id || !user.email) {
            if (identityKeyRef.current) {
                resetProductAnalyticsIdentity();
                identityKeyRef.current = '';
            }
            return;
        }

        const identityKey = `${user.id}:${user.email}:${user.role}`;
        setProductAnalyticsIdentity({
            email: user.email,
            firstName: user.first_name || user.name.split(' ')[0] || '',
            id: user.id,
            lastName: user.last_name || user.name.split(' ').slice(1).join(' '),
            role: user.role,
        });
        if (identityKeyRef.current !== identityKey) {
            trackProductEvent('user_identified', { role: user.role });
            identityKeyRef.current = identityKey;
        }
    }, [preference, user]);

    const choose = (value: 'accepted' | 'rejected') => {
        const wasAccepted = preference === 'accepted';
        setProductAnalyticsConsent(value);
        setPreference(value);
        if (value === 'accepted') startProductAnalytics();
        if (wasAccepted && value === 'rejected') window.location.reload();
    };

    return (
        <>
            {children}
            {preference === 'unset' ? (
                <section
                    aria-label="Cookie preferences"
                    className="fixed inset-x-4 bottom-4 z-[100] mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-950 sm:p-6"
                >
                    <h2 className="text-lg font-bold text-gray-950 dark:text-white">Choose optional analytics and live support</h2>
                    <p className="mt-2 leading-6 text-gray-600 dark:text-gray-300">
                        With your permission, Zoho SalesIQ records page areas and completed product actions so our team can improve the property journey and support you. We never send passwords, search text, messages, documents, payment details, or form contents.
                    </p>
                    <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            className="min-h-11 rounded-xl border border-gray-300 px-5 font-semibold text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-200 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-900"
                            onClick={() => choose('rejected')}
                            type="button"
                        >
                            Reject optional tools
                        </button>
                        <button
                            className="min-h-11 rounded-xl bg-primary px-5 font-semibold text-white hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-orange-200"
                            onClick={() => choose('accepted')}
                            type="button"
                        >
                            Allow analytics &amp; chat
                        </button>
                    </div>
                </section>
            ) : null}
        </>
    );
}
