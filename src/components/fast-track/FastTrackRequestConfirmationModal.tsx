'use client';

import { useEffect, useRef } from 'react';
import {
    BellRing,
    CheckCircle2,
    Clock3,
    FileCheck2,
    Home,
    ShieldCheck,
} from 'lucide-react';

import ActionSpinner from '@/components/ui/ActionSpinner';
import Modal from '@/components/ui/Modal';

interface FastTrackRequestConfirmationModalProps {
    open: boolean;
    propertyTitle: string;
    propertyLocation?: string;
    isSubmitting?: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
}

const steps = [
    {
        title: 'The manager is notified immediately',
        description: 'They receive your property request and the 10-minute response window begins.',
        icon: BellRing,
    },
    {
        title: 'The manager reviews your request',
        description: 'The 24-hour journey starts only after the manager approves and starts it.',
        icon: Clock3,
    },
    {
        title: 'You continue in one workspace',
        description: 'Documents, viewing, decision, agreement, and handover stay together.',
        icon: FileCheck2,
    },
];

const FastTrackRequestConfirmationModal = ({
    open,
    propertyTitle,
    propertyLocation,
    isSubmitting = false,
    onClose,
    onConfirm,
}: FastTrackRequestConfirmationModalProps) => {
    const previouslyFocusedElement = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (open) {
            previouslyFocusedElement.current = document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
            return;
        }

        const trigger = previouslyFocusedElement.current;
        previouslyFocusedElement.current = null;
        if (!trigger || !trigger.isConnected || trigger.matches(':disabled')) {
            return;
        }

        const frame = window.requestAnimationFrame(() => trigger.focus());
        return () => window.cancelAnimationFrame(frame);
    }, [open]);

    const close = () => {
        if (!isSubmitting) {
            onClose();
        }
    };

    return (
        <Modal
            isOpen={open}
            onClose={close}
            closeOnBackdrop={!isSubmitting}
            title="Request 24-Hour Fast Track?"
            size="md"
            footer={(
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        autoFocus
                        onClick={close}
                        disabled={isSubmitting}
                        className="inline-flex min-h-12 items-center justify-center rounded-xl border border-gray-200 bg-white px-5 text-sm font-semibold text-gray-800 transition-colors hover:border-orange-300 hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-100 dark:hover:border-orange-800 dark:hover:bg-orange-950/30 dark:focus-visible:ring-offset-zinc-900"
                    >
                        Not now
                    </button>
                    <button
                        type="button"
                        onClick={() => void onConfirm()}
                        disabled={isSubmitting}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 disabled:cursor-wait disabled:bg-orange-400 dark:focus-visible:ring-offset-zinc-900"
                    >
                        {isSubmitting ? (
                            <>
                                <ActionSpinner size={16} className="" />
                                Sending request...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={17} aria-hidden="true" />
                                Send Fast Track request
                            </>
                        )}
                    </button>
                </div>
            )}
        >
            <div className="space-y-5">
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900/60 dark:bg-orange-950/25">
                    <div className="flex items-start gap-3">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-orange-700 shadow-sm dark:bg-zinc-900 dark:text-orange-300">
                            <Home size={19} aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">
                                Manager approval required
                            </p>
                            <p className="mt-1 break-words font-semibold text-gray-950 dark:text-white">{propertyTitle}</p>
                            {propertyLocation ? (
                                <p className="mt-1 break-words text-sm leading-5 text-gray-600 dark:text-gray-300">{propertyLocation}</p>
                            ) : null}
                        </div>
                    </div>
                </div>

                <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                    This sends a priority request to the property manager. It does not reserve the property,
                    start the 24-hour countdown, or charge you now.
                </p>

                <ol className="space-y-3" aria-label="What happens after you request Fast Track">
                    {steps.map((step, index) => {
                        const Icon = step.icon;
                        return (
                            <li key={step.title} className="flex gap-3 rounded-2xl border border-gray-100 bg-gray-50 p-4 dark:border-zinc-800 dark:bg-zinc-950/60">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-orange-600 shadow-sm dark:bg-zinc-900 dark:text-orange-300">
                                    <Icon size={17} aria-hidden="true" />
                                </span>
                                <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-950 dark:text-white">
                                        <span className="sr-only">Step {index + 1}: </span>
                                        {step.title}
                                    </p>
                                    <p className="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-300">{step.description}</p>
                                </div>
                            </li>
                        );
                    })}
                </ol>

                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-100">
                    <ShieldCheck className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
                    <p>
                        If approved, documents shared inside Fast Track are reviewed by this property&apos;s manager.
                        Your separate Estospaces profile verification remains with the admin team.
                    </p>
                </div>
            </div>
        </Modal>
    );
};

export default FastTrackRequestConfirmationModal;
