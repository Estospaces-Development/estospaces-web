'use client';

import { Link } from 'react-router-dom';
import BackButton from '@/components/ui/BackButton';

export default function UserFastTrackPage() {
    return (
        <div className="space-y-8 pb-16">
            <div className="space-y-4">
                <BackButton />
                <div className="rounded-3xl border border-orange-100 bg-gradient-to-br from-white via-orange-50/60 to-amber-50/40 p-8 shadow-sm dark:border-orange-500/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">Fast-track 24h</p>
                    <h1 className="mt-4 text-3xl font-black tracking-tight text-gray-950 dark:text-white">User fast-track workspace</h1>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-300">
                        This route is the user-facing landing point for active fast-track cases. Use it as the stable entry
                        back into your live case when you need help, documents, contracts, or messages without losing the
                        shared workflow context.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {[
                    {
                        title: 'Messages',
                        description: 'Open the live conversation linked to your journey.',
                        href: '/user/dashboard/messages',
                    },
                    {
                        title: 'Contracts',
                        description: 'Review agreement state, payments, and signed steps.',
                        href: '/user/dashboard/contracts',
                    },
                    {
                        title: 'Help & Support',
                        description: 'Escalate when a live case, document, or payment state looks wrong.',
                        href: '/user/dashboard/help',
                    },
                ].map((action) => (
                    <Link
                        key={action.href}
                        to={action.href}
                        className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-transform hover:-translate-y-0.5 hover:border-orange-200 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-orange-500/30"
                    >
                        <h2 className="text-xl font-black text-gray-950 dark:text-white">{action.title}</h2>
                        <p className="mt-3 text-sm leading-7 text-gray-600 dark:text-gray-300">{action.description}</p>
                    </Link>
                ))}
            </div>

            <div className="rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                <h2 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white">What to do here</h2>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-gray-700 dark:text-gray-300">
                    <li>Use this page as the stable workspace entry instead of guessing which companion page still owns the next step.</li>
                    <li>Return to Messages when you need a human response tied to the live case.</li>
                    <li>Return to Contracts when the agreement, payment, or handover state is the blocker.</li>
                    <li>Open Help &amp; Support if the case state, document lane, or amount shown in the app is wrong.</li>
                </ul>
            </div>
        </div>
    );
}
