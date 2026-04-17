'use client';

import { Link } from 'react-router-dom';
import BackButton from '@/components/ui/BackButton';

export default function ManagerCaseFilesPage() {
    return (
        <div className="space-y-8 pb-16">
            <div className="space-y-4">
                <BackButton />
                <div className="rounded-3xl border border-orange-100 bg-gradient-to-br from-white via-orange-50/60 to-amber-50/40 p-8 shadow-sm dark:border-orange-500/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">Shared case file</p>
                    <h1 className="mt-4 text-3xl font-black tracking-tight text-gray-950 dark:text-white">Manager case files</h1>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-300">
                        Case file is support context. It is where managers review supporting material, confirm readiness,
                        and jump back into the live workflow workspace instead of splitting ownership across multiple pages.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {[
                    {
                        title: 'Open Fast-track',
                        description: 'Return to the live workflow workspace that owns progression.',
                        href: '/manager/fast-track',
                    },
                    {
                        title: 'Open Contracts',
                        description: 'Review linked agreements, payment readiness, and handover state.',
                        href: '/manager/contracts',
                    },
                    {
                        title: 'Open Manager Support',
                        description: 'Escalate platform issues, document integrity problems, or workflow mismatches.',
                        href: '/manager/help',
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
                <h2 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white">Case-file operating rule</h2>
                <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-7 text-gray-700 dark:text-gray-300">
                    <li>Use case file for reference, evidence, and support context.</li>
                    <li>Do not treat case file as a second workflow owner.</li>
                    <li>Move back to Fast-track when the next operational step must be taken.</li>
                </ul>
            </div>
        </div>
    );
}
