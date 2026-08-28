"use client";

import React, { useMemo, useState } from 'react';
import { ArrowRight, Home, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import Modal from '@/components/ui/Modal';
import {
    buildDiscoverSearchPath,
    filterUserAppSearchDestinations,
    shouldOfferDiscoverSearch,
    USER_DISCOVER_PATH,
} from '@/lib/userAppSearch';

interface UserAppSearchDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

const UserAppSearchDialog = ({ isOpen, onClose }: UserAppSearchDialogProps) => {
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const trimmedQuery = query.trim();
    const destinations = useMemo(() => filterUserAppSearchDestinations(query), [query]);
    const offerDiscoverSearch = shouldOfferDiscoverSearch(trimmedQuery, destinations);
    const visibleDestinations = offerDiscoverSearch
        ? destinations.filter((destination) => destination.path !== USER_DISCOVER_PATH)
        : destinations;

    const openPath = (path: string) => {
        onClose();
        setQuery('');
        navigate(path);
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={() => {
                onClose();
                setQuery('');
            }}
            title="Search Estospaces"
            size="lg"
        >
            <p className="mb-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
                Find a page or continue one of your activities. Property searches open the full Find experience.
            </p>

            <label htmlFor="user-app-search" className="sr-only">Search pages and activities</label>
            <div className="relative">
                <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                />
                <input
                    id="user-app-search"
                    type="search"
                    autoFocus
                    autoComplete="off"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search pages, activity, or homes"
                    className="h-14 w-full rounded-2xl border border-gray-200 bg-gray-50 pl-12 pr-4 text-base text-gray-950 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100 dark:border-zinc-700 dark:bg-zinc-950 dark:text-white dark:focus:border-orange-500 dark:focus:bg-zinc-900 dark:focus:ring-orange-500/10"
                />
            </div>

            <div className="mt-5 space-y-2" aria-live="polite">
                {offerDiscoverSearch && (
                    <button
                        type="button"
                        onClick={() => openPath(buildDiscoverSearchPath(trimmedQuery))}
                        className="flex min-h-14 w-full items-center gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-left transition hover:border-orange-300 hover:bg-orange-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-orange-900/50 dark:bg-orange-950/30 dark:hover:bg-orange-950/50"
                    >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-600 text-white">
                            <Home size={19} aria-hidden="true" />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block truncate font-semibold text-gray-950 dark:text-white">
                                Find homes for “{trimmedQuery}”
                            </span>
                            <span className="mt-0.5 block text-sm text-gray-600 dark:text-gray-300">
                                Open advanced property search and filters
                            </span>
                        </span>
                        <ArrowRight size={18} className="shrink-0 text-orange-700 dark:text-orange-300" aria-hidden="true" />
                    </button>
                )}

                <p className="px-1 pt-2 text-xs font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                    {trimmedQuery ? 'Matching destinations' : 'Quick destinations'}
                </p>

                {visibleDestinations.length > 0 ? visibleDestinations.map((destination) => (
                    <button
                        key={destination.path}
                        type="button"
                        onClick={() => openPath(destination.path)}
                        className="flex min-h-14 w-full items-center justify-between gap-4 rounded-2xl px-4 py-3 text-left transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:hover:bg-zinc-800"
                    >
                        <span className="min-w-0">
                            <span className="block font-semibold text-gray-950 dark:text-white">{destination.label}</span>
                            <span className="mt-0.5 block text-sm text-gray-600 dark:text-gray-300">{destination.description}</span>
                        </span>
                        <ArrowRight size={18} className="shrink-0 text-gray-400" aria-hidden="true" />
                    </button>
                )) : !offerDiscoverSearch ? (
                    <div className="rounded-2xl border border-dashed border-gray-200 px-5 py-8 text-center dark:border-zinc-700">
                        <p className="font-semibold text-gray-950 dark:text-white">No page matches that wording</p>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                            Try “viewings”, “documents”, “messages”, or search homes above.
                        </p>
                    </div>
                ) : null}
            </div>
        </Modal>
    );
};

export default UserAppSearchDialog;
