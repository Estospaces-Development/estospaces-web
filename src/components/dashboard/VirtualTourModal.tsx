"use client";

import BrandLoader from '@/components/ui/BrandLoader';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Clock3, Maximize2, Send, Video, X } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { getVirtualTourByPropertyId, requestVirtualTour } from '@/services/virtualTourService';

interface VirtualTourModalProps {
    property: {
        id: string;
        title: string;
        virtual_tour_url?: string;
    };
    onClose: () => void;
}

const statusPresentation = {
    unavailable: {
        title: 'Request a virtual tour',
        description: 'This property does not have a live walkthrough yet. Ask the manager to prepare one for you.',
    },
    requested: {
        title: 'Tour requested',
        description: 'Your request is in the queue. The manager can now prepare the walkthrough for this property.',
    },
    processing: {
        title: 'Tour is being prepared',
        description: 'The manager has picked up this request and is preparing the final walkthrough link.',
    },
    ready: {
        title: '3D virtual tour',
        description: 'Explore the property in the live virtual-tour workspace below.',
    },
} as const;

const VirtualTourModal: React.FC<VirtualTourModalProps> = ({ property, onClose }) => {
    const toast = useToast();
    const closeButtonRef = useRef<HTMLButtonElement | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [requestNote, setRequestNote] = useState('');
    const [tourUrl, setTourUrl] = useState(property?.virtual_tour_url || '');
    const [status, setStatus] = useState<'unavailable' | 'requested' | 'processing' | 'ready'>(
        property?.virtual_tour_url ? 'ready' : 'unavailable',
    );
    const [requestSummary, setRequestSummary] = useState('');

    const loadVirtualTourState = useCallback(async () => {
        setLoading(true);
        const { data, error } = await getVirtualTourByPropertyId(property.id);
        if (error || !data) {
            toast.error(error || 'Unable to load virtual tour state.');
            setLoading(false);
            return;
        }

        setStatus(data.status);
        setTourUrl(data.virtual_tour_url || '');
        setRequestSummary(
            data.active_request?.request_note
                || data.active_request?.fulfillment_note
                || '',
        );
        setLoading(false);
    }, [property.id, toast]);

    useEffect(() => {
        void loadVirtualTourState();
    }, [loadVirtualTourState]);

    useEffect(() => {
        closeButtonRef.current?.focus();

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const handleRequest = async () => {
        setSubmitting(true);
        const { data, error } = await requestVirtualTour(property.id, {
            request_note: requestNote.trim(),
        });

        if (error) {
            toast.error(error);
            setSubmitting(false);
            return;
        }

        setStatus(data?.status || 'requested');
        setRequestSummary(data?.request_note || requestNote.trim());
        setRequestNote('');
        toast.success('Virtual tour request sent to the manager.');
        setSubmitting(false);
        await loadVirtualTourState();
    };

    const presentation = statusPresentation[status];

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="virtual-tour-modal-title"
                className="relative flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="flex items-center justify-between border-b border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                    <div>
                        <h3
                            id="virtual-tour-modal-title"
                            className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white"
                        >
                            <span className={`h-2 w-2 rounded-full ${status === 'ready' ? 'bg-green-500' : 'bg-orange-500'}`} />
                            {presentation.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{property?.title}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {tourUrl ? (
                            <button
                                type="button"
                                onClick={() => window.open(tourUrl, '_blank', 'noopener,noreferrer')}
                                className="hidden rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 sm:block"
                                aria-label="Open virtual tour in a new tab"
                                title="Open in new tab"
                            >
                                <Maximize2 size={20} className="text-gray-600 dark:text-gray-300" />
                            </button>
                        ) : null}
                        <button
                            ref={closeButtonRef}
                            type="button"
                            onClick={onClose}
                            aria-label="Close virtual tour"
                            title="Close virtual tour"
                            className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            <X size={24} className="text-gray-600 dark:text-gray-300" />
                        </button>
                    </div>
                </div>

                <div className="relative flex-1 bg-gray-100 dark:bg-black">
                    {loading ? (
                        <div className="flex h-full items-center justify-center gap-3 text-sm font-semibold text-gray-500 dark:text-gray-400">
                            <BrandLoader className="h-5 w-5 text-orange-500" />
                            Syncing virtual tour status...
                        </div>
                    ) : status === 'ready' && tourUrl ? (
                        <>
                            <iframe
                                src={tourUrl}
                                className="h-full w-full border-0"
                                allow="fullscreen"
                                title={`Virtual Tour of ${property?.title}`}
                                loading="lazy"
                            />
                            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
                                <p className="text-center text-sm font-medium text-white">
                                    Click and drag to look around. Open the full tour in a new tab if you want a larger view.
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-orange-50 text-orange-500 dark:bg-orange-950/30 dark:text-orange-300">
                                {status === 'processing' ? <Clock3 size={36} /> : <Video size={36} />}
                            </div>
                            <h4 className="text-2xl font-black text-gray-900 dark:text-white">{presentation.title}</h4>
                            <p className="mt-3 max-w-xl text-sm font-medium leading-6 text-gray-500 dark:text-gray-400">
                                {presentation.description}
                            </p>

                            {(status === 'requested' || status === 'processing') && requestSummary ? (
                                <div className="mt-6 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-left text-sm font-medium text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                        Latest update
                                    </p>
                                    <p className="mt-2 leading-6">{requestSummary}</p>
                                </div>
                            ) : null}

                            {status === 'unavailable' ? (
                                <div className="mt-8 w-full max-w-xl rounded-[2rem] border border-gray-200 bg-white p-6 text-left shadow-sm dark:border-gray-700 dark:bg-gray-900">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">
                                        Request note
                                    </label>
                                    <textarea
                                        rows={4}
                                        value={requestNote}
                                        onChange={(event) => setRequestNote(event.target.value)}
                                        placeholder="Tell the manager what kind of walkthrough would help you most."
                                        className="mt-3 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 text-sm font-medium text-gray-900 outline-none transition focus:border-orange-400 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                                    />
                                    <button
                                        type="button"
                                        disabled={submitting}
                                        onClick={() => void handleRequest()}
                                        className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {submitting ? <BrandLoader className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                                        Request virtual tour
                                    </button>
                                </div>
                            ) : null}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VirtualTourModal;
