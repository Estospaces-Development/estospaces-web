"use client";

import { useDeferredValue, useEffect, useRef, useState } from 'react';
import {
    ArrowRight,
    BookOpen,
    ChevronDown,
    Clock3,
    Compass,
    Layers3,
    LifeBuoy,
    Search,
    Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { RoleDocsConfig, RoleDocsDocument } from '@/lib/roleDocs';
import { getSectionPreview, getWordCount } from '@/lib/roleDocsPreview';
import { normalizeSearchQueryInput } from '@/lib/propertySearchControls';
import DocsMarkdown from './DocsMarkdown';

interface RoleDocsPageProps {
    config: RoleDocsConfig;
    docsDocument: RoleDocsDocument;
}

const AVERAGE_READING_SPEED = 210;
const MAX_DOCS_SEARCH_LENGTH = 120;

const matchesQuery = (query: string, value: string) => value.toLowerCase().includes(query);

export default function RoleDocsPage({ config, docsDocument }: RoleDocsPageProps) {
    const [query, setQuery] = useState('');
    const [openFaq, setOpenFaq] = useState('');
    const [activeSection, setActiveSection] = useState(docsDocument.sections[0]?.slug ?? '');
    const pageRootRef = useRef<HTMLDivElement | null>(null);
    const rawQuery = query.trim();
    const queryTooLong = rawQuery.length > MAX_DOCS_SEARCH_LENGTH;
    const normalizedQuery = queryTooLong ? '' : normalizeSearchQueryInput(query).toLocaleLowerCase();
    const deferredQuery = useDeferredValue(normalizedQuery);

    useEffect(() => {
        const pageRoot = pageRootRef.current;
        const scrollHost = pageRoot?.closest('main');
        if (!(scrollHost instanceof HTMLElement)) {
            return;
        }

        const previousOverflowX = scrollHost.style.overflowX;
        const previousOverflowY = scrollHost.style.overflowY;

        scrollHost.style.overflowX = 'hidden';
        scrollHost.style.overflowY = 'visible';

        return () => {
            scrollHost.style.overflowX = previousOverflowX;
            scrollHost.style.overflowY = previousOverflowY;
        };
    }, []);

    useEffect(() => {
        const scrollToHash = () => {
            const hash = window.location.hash.replace('#', '');
            if (!hash) {
                return;
            }

            const decodedHash = decodeURIComponent(hash);
            const target = document.getElementById(decodedHash);
            if (!target) {
                return;
            }

            if (docsDocument.sections.some((section) => section.slug === decodedHash)) {
                setActiveSection(decodedHash);
            }

            window.requestAnimationFrame(() => {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        };

        scrollToHash();
        window.addEventListener('hashchange', scrollToHash);

        return () => window.removeEventListener('hashchange', scrollToHash);
    }, [docsDocument.sections]);

    const visibleSections = queryTooLong
        ? []
        : deferredQuery
        ? docsDocument.sections.filter((section) =>
              matchesQuery(deferredQuery, `${section.title}\n${section.body}`),
          )
        : docsDocument.sections;

    const tocSections = visibleSections;
    const hasResults = visibleSections.length > 0;
    const noResultsMessage = queryTooLong
        ? `Search text must be ${MAX_DOCS_SEARCH_LENGTH} characters or fewer.`
        : 'Search by the goal you are working on, like "fast-track", "contracts", "verification", or "share properties".';

    useEffect(() => {
        if (tocSections.length === 0) {
            setActiveSection('');
            return;
        }

        if (!tocSections.some((section) => section.slug === activeSection)) {
            setActiveSection(tocSections[0].slug);
        }

        const observer = new IntersectionObserver(
            (entries) => {
                const visibleEntries = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((entryA, entryB) => {
                        if (entryB.intersectionRatio !== entryA.intersectionRatio) {
                            return entryB.intersectionRatio - entryA.intersectionRatio;
                        }

                        return Math.abs(entryA.boundingClientRect.top) - Math.abs(entryB.boundingClientRect.top);
                    });

                const nextActiveSection = visibleEntries[0]?.target.id;
                if (nextActiveSection) {
                    setActiveSection(nextActiveSection);
                }
            },
            {
                rootMargin: '-16% 0px -58% 0px',
                threshold: [0.1, 0.2, 0.35, 0.5, 0.7],
            },
        );

        tocSections.forEach((section) => {
            const element = document.getElementById(section.slug);
            if (element) {
                observer.observe(element);
            }
        });

        return () => observer.disconnect();
    }, [activeSection, tocSections]);

    const guideWordCount = getWordCount(
        `${docsDocument.intro}\n${docsDocument.sections
            .map((section) => `${section.title}\n${section.body}`)
            .join('\n')}`,
    );
    const readingMinutes = Math.max(6, Math.ceil(guideWordCount / AVERAGE_READING_SPEED));
    const activeSectionIndex = Math.max(
        tocSections.findIndex((section) => section.slug === activeSection),
        0,
    );
    const activeSectionData = tocSections[activeSectionIndex] ?? tocSections[0];
    const guideProgress = tocSections.length
        ? Math.round(((activeSectionIndex + 1) / tocSections.length) * 100)
        : 0;

    return (
        <div
            ref={pageRootRef}
            className="relative overflow-x-hidden bg-[linear-gradient(180deg,#fff8f2_0%,#fffdfb_24%,#f8fafc_100%)] pb-24 dark:bg-[linear-gradient(180deg,#09090b_0%,#111827_28%,#030712_100%)]"
        >
            <div className="pointer-events-none absolute inset-x-0 top-0 h-[32rem] bg-[radial-gradient(circle_at_top_left,rgba(255,107,53,0.16),transparent_34%),radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_36%)]" />
            <div className="pointer-events-none absolute inset-x-0 top-60 h-64 bg-[linear-gradient(180deg,rgba(255,107,53,0.06),transparent)]" />

            <div className="relative mx-auto w-full max-w-[1480px] min-w-0 px-3 py-6 sm:px-6 sm:py-8 lg:px-8">
                <section className="overflow-hidden rounded-[2rem] border border-orange-100/90 bg-white/95 shadow-[0_30px_90px_-48px_rgba(255,107,53,0.45)] backdrop-blur dark:border-orange-500/10 dark:bg-gray-950/95">
                    <div className="relative overflow-hidden border-b border-orange-100/80 bg-[linear-gradient(135deg,rgba(255,107,53,0.1),rgba(255,255,255,0.98),rgba(251,191,36,0.08))] px-4 py-5 dark:border-orange-500/10 dark:bg-[linear-gradient(135deg,rgba(255,107,53,0.12),rgba(17,24,39,0.96),rgba(3,7,18,0.98))] sm:px-8 sm:py-8 lg:px-10 lg:py-10">
                        <div className="absolute inset-y-0 right-0 hidden w-[34%] bg-[radial-gradient(circle_at_top_right,rgba(255,107,53,0.18),transparent_60%)] xl:block" />
                        <div className="relative grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(340px,392px)] xl:items-start 2xl:grid-cols-[minmax(0,1.05fr)_420px]">
                            <div className="min-w-0 max-w-4xl">
                                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/90 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-orange-600 shadow-sm dark:border-orange-500/20 dark:bg-gray-950/80 dark:text-orange-300 sm:mb-5 sm:px-4 sm:text-xs sm:tracking-[0.22em]">
                                    <Sparkles className="h-4 w-4" />
                                    {config.label}
                                </div>
                                <h1 className="max-w-4xl break-words text-2xl font-black leading-tight tracking-tight text-gray-950 [overflow-wrap:anywhere] dark:text-white sm:text-display-xl">
                                    {config.title}
                                </h1>
                                <p className="mt-3 line-clamp-4 max-w-3xl text-sm leading-6 text-gray-700 dark:text-gray-300 sm:mt-5 sm:line-clamp-none sm:text-body-lg">
                                    {config.subtitle}
                                </p>

                                <div className="mt-4 flex gap-2 overflow-x-auto pb-1 sm:mt-7 sm:flex-wrap sm:gap-3">
                                    {config.audience.map((item) => (
                                        <span
                                            key={item}
                                            className="shrink-0 rounded-full border border-orange-100 bg-white/90 px-3 py-2 text-xs font-semibold text-orange-700 shadow-sm dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200 sm:px-4 sm:text-sm"
                                        >
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="hidden gap-4 sm:grid">
                                <div className="rounded-[1.85rem] border border-white/70 bg-white/90 p-6 shadow-[0_24px_60px_-32px_rgba(255,107,53,0.55)] backdrop-blur dark:border-orange-500/10 dark:bg-gray-950/90">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-500">
                                                Guide pulse
                                            </p>
                                            <h2 className="mt-3 text-3xl font-black tracking-tight text-gray-950 dark:text-white">
                                                {guideProgress}% mapped
                                            </h2>
                                            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                                                Use the guide rail to stay anchored while you move through long journeys, approvals, and document-heavy steps.
                                            </p>
                                        </div>
                                        <div className="rounded-[1.4rem] bg-orange-50 p-3 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300">
                                            <Compass className="h-6 w-6" />
                                        </div>
                                    </div>

                                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-orange-100 dark:bg-orange-500/10">
                                        <div
                                            className="h-full rounded-full bg-[linear-gradient(90deg,#ff6b35_0%,#f59e0b_100%)] transition-all"
                                            style={{ width: `${guideProgress}%` }}
                                        />
                                    </div>

                                    <div className="mt-5 grid gap-3 md:grid-cols-3 xl:grid-cols-1">
                                        <div className="rounded-[1.35rem] border border-orange-100 bg-[linear-gradient(180deg,#ffffff_0%,#fff8f1_100%)] p-4 dark:border-orange-500/10 dark:bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)]">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-2xl bg-orange-50 p-2.5 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300">
                                                    <Clock3 className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-500">
                                                        Estimated read
                                                    </p>
                                                    <p className="mt-1 text-sm font-black text-gray-950 dark:text-white">
                                                        {readingMinutes} minute guide
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-[1.35rem] border border-orange-100 bg-[linear-gradient(180deg,#ffffff_0%,#fff8f1_100%)] p-4 dark:border-orange-500/10 dark:bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)]">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-2xl bg-orange-50 p-2.5 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300">
                                                    <Layers3 className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-500">
                                                        Coverage
                                                    </p>
                                                    <p className="mt-1 text-sm font-black text-gray-950 dark:text-white">
                                                        {docsDocument.sections.length} guide sections
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-[1.35rem] border border-orange-100 bg-[linear-gradient(180deg,#ffffff_0%,#fff8f1_100%)] p-4 dark:border-orange-500/10 dark:bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)]">
                                            <div className="flex items-center gap-3">
                                                <div className="rounded-2xl bg-orange-50 p-2.5 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300">
                                                    <Compass className="h-4 w-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-orange-500">
                                                        Perspective
                                                    </p>
                                                    <p className="mt-1 text-sm font-black text-gray-950 dark:text-white">
                                                        {config.role === 'user' ? 'User-first guidance' : 'Manager-first guidance'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="rounded-[1.85rem] border border-orange-100 bg-gray-950 p-6 text-white shadow-[0_24px_60px_-32px_rgba(17,24,39,0.8)] dark:border-orange-500/10">
                                    <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-300">
                                        Need action, not just guidance?
                                    </p>
                                    <h2 className="mt-3 text-2xl font-black tracking-tight text-white">
                                        {config.supportTitle}
                                    </h2>
                                    <p className="mt-3 text-sm leading-6 text-white/75">
                                        {config.supportDescription}
                                    </p>
                                    <Link
                                        to={config.supportHref}
                                        className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-gray-950 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                                    >
                                        {config.supportCta}
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-orange-100 bg-white/95 px-4 py-5 dark:border-orange-500/10 dark:bg-gray-950/95 sm:px-8 sm:py-6 lg:px-10">
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-500">
                                    Start here
                                </p>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                                    Jump into the right dashboard area first, then keep this guide open as your operating map for timing, preparation, approvals, and next actions.
                                </p>
                            </div>

                            <div className="flex w-full flex-col gap-3 xl:max-w-xl">
                                <div className="relative">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-400" />
                                    <input
                                        aria-label={`Search ${config.label}`}
                                        aria-invalid={queryTooLong}
                                        aria-describedby={queryTooLong ? `${config.role}-docs-search-error` : undefined}
                                        type="text"
                                        value={query}
                                        onChange={(event) => setQuery(event.target.value)}
                                        placeholder={config.searchPlaceholder}
                                        className="input-field h-12 rounded-2xl border-orange-100 bg-orange-50/70 pl-11 pr-28 focus:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:border-orange-500/10 dark:bg-gray-900 dark:focus-visible:ring-offset-gray-950"
                                    />
                                    {query ? (
                                        <button
                                            type="button"
                                            onClick={() => setQuery('')}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs font-bold text-orange-600 transition-colors hover:bg-orange-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:border-orange-500/20 dark:bg-gray-950 dark:text-orange-200 dark:focus-visible:ring-offset-gray-950"
                                        >
                                            Clear
                                        </button>
                                    ) : null}
                                </div>
                                {queryTooLong ? (
                                    <p id={`${config.role}-docs-search-error`} role="alert" className="text-sm font-semibold text-red-600 dark:text-red-300">
                                        {noResultsMessage}
                                    </p>
                                ) : null}

                                <div className="flex flex-wrap items-center gap-3">
                                    <span className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-orange-600 shadow-sm dark:border-orange-500/20 dark:bg-gray-950 dark:text-orange-200">
                                        <Layers3 className="h-3.5 w-3.5" />
                                        {deferredQuery
                                            ? `${visibleSections.length} sections match`
                                            : `${docsDocument.sections.length} complete sections`}
                                    </span>
                                    <span className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-white px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-gray-600 shadow-sm dark:border-orange-500/20 dark:bg-gray-950 dark:text-gray-300">
                                        <Clock3 className="h-3.5 w-3.5 text-orange-500" />
                                        {readingMinutes} minute guide
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-2 xl:mt-6 xl:grid-cols-4 xl:gap-4">
                            {config.quickActions.map((action) => (
                                <Link
                                    key={action.title}
                                    to={action.href}
                                    className="group min-w-0 rounded-2xl border border-orange-100 bg-[linear-gradient(180deg,#ffffff_0%,#fff7ef_100%)] p-4 transition-all hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_20px_40px_-24px_rgba(255,107,53,0.55)] dark:border-orange-500/10 dark:bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)] sm:rounded-[1.75rem] sm:p-5"
                                >
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
                                        {action.eyebrow}
                                    </p>
                                    <h3 className="mt-3 text-lg font-black tracking-tight text-gray-950 dark:text-white">
                                        {action.title}
                                    </h3>
                                    <p className="mt-2 hidden text-sm leading-6 text-gray-600 dark:text-gray-300 sm:block">
                                        {action.description}
                                    </p>
                                    <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-orange-600 transition-transform group-hover:translate-x-1 dark:text-orange-300">
                                        Open
                                        <ArrowRight className="h-4 w-4" />
                                    </span>
                                </Link>
                            ))}
                        </div>
                    </div>
                </section>

                <div className="mt-8 xl:hidden">
                    <details className="rounded-[1.5rem] border border-orange-100 bg-white/95 p-5 shadow-sm dark:border-orange-500/10 dark:bg-gray-950/95">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                            <span className="flex items-center gap-3">
                                <span className="rounded-2xl bg-orange-50 p-3 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300">
                                    <BookOpen className="h-5 w-5" />
                                </span>
                                <span>
                                    <span className="block text-xs font-black uppercase tracking-[0.2em] text-orange-500">
                                        On this page
                                    </span>
                                    <span className="mt-1 block text-sm font-semibold text-gray-600 dark:text-gray-300">
                                        {tocSections.length} sections, FAQ, and glossary
                                    </span>
                                </span>
                            </span>
                            <ChevronDown className="h-5 w-5 text-orange-500" />
                        </summary>

                        <div className="mt-5 space-y-2 border-t border-orange-100 pt-5 dark:border-orange-500/10">
                            {tocSections.map((section, index) => (
                                <a
                                    key={section.slug}
                                    href={`#${section.slug}`}
                                    className="flex items-start gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-700 dark:text-gray-300 dark:hover:bg-orange-500/5 dark:hover:text-orange-200"
                                >
                                    <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-orange-100 text-[11px] font-black text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
                                        {index + 1}
                                    </span>
                                    <span>{section.title}</span>
                                </a>
                            ))}
                            <div className="grid gap-2 pt-2">
                                <a
                                    href="#faq"
                                    className="inline-flex items-center justify-between rounded-2xl border border-orange-100 bg-orange-50/70 px-4 py-3 text-sm font-semibold text-orange-700 dark:border-orange-500/10 dark:bg-orange-500/10 dark:text-orange-200"
                                >
                                    Jump to FAQ
                                    <ArrowRight className="h-4 w-4" />
                                </a>
                                <a
                                    href="#glossary"
                                    className="inline-flex items-center justify-between rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm font-semibold text-gray-700 dark:border-orange-500/10 dark:bg-gray-950 dark:text-gray-200"
                                >
                                    Jump to glossary
                                    <ArrowRight className="h-4 w-4" />
                                </a>
                            </div>
                        </div>
                    </details>
                </div>

                <div className="mt-8 grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start 2xl:grid-cols-[minmax(0,1fr)_340px]">
                    <main className="min-w-0 space-y-8">
                        <section className="relative overflow-hidden rounded-[1.75rem] border border-orange-100 bg-white/95 p-6 shadow-sm dark:border-orange-500/10 dark:bg-gray-950/95 sm:p-8">
                            <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#ff6b35_0%,#f59e0b_50%,#fed7aa_100%)]" />
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="max-w-3xl">
                                    <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-500">
                                        Orientation
                                    </p>
                                    <h2 className="mt-2 text-2xl font-black tracking-tight text-gray-950 dark:text-white">
                                        How to use this guide
                                    </h2>
                                </div>
                                <div className="inline-flex self-start rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200">
                                    {deferredQuery ? `${visibleSections.length} matching sections` : 'Complete role guide'}
                                </div>
                            </div>

                            <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                                <div className="min-w-0">
                                    <DocsMarkdown content={docsDocument.intro} />
                                </div>

                                <div className="rounded-[1.4rem] border border-orange-100 bg-[linear-gradient(180deg,#fff9f3_0%,#ffffff_100%)] p-5 dark:border-orange-500/10 dark:bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)]">
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
                                        Best used when
                                    </p>
                                    <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-700 dark:text-gray-300">
                                        <li className="rounded-2xl bg-white/90 px-4 py-3 dark:bg-gray-950/80">
                                            You are starting a new journey and want the best next step first.
                                        </li>
                                        <li className="rounded-2xl bg-white/90 px-4 py-3 dark:bg-gray-950/80">
                                            A milestone is stalled and you need to confirm what should happen next.
                                        </li>
                                        <li className="rounded-2xl bg-white/90 px-4 py-3 dark:bg-gray-950/80">
                                            You want to know what the Estospaces Team may review before progression continues.
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </section>

                        {!hasResults && (deferredQuery || queryTooLong) ? (
                            <section className="rounded-[1.75rem] border border-orange-100 bg-white p-8 text-center shadow-sm dark:border-orange-500/10 dark:bg-gray-950">
                                <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-500">
                                    No direct match
                                </p>
                                <h2 className="mt-3 text-2xl font-black tracking-tight text-gray-950 dark:text-white">
                                    Try a simpler search phrase
                                </h2>
                                <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                                    {noResultsMessage}
                                </p>
                            </section>
                        ) : (
                            visibleSections.map((section, index) => (
                                <section
                                    key={section.slug}
                                    id={section.slug}
                                    className="scroll-mt-28 rounded-[1.75rem] border border-orange-100 bg-white/95 p-6 shadow-sm transition-colors dark:border-orange-500/10 dark:bg-gray-950/95 sm:p-8"
                                >
                                    <div className="flex flex-col gap-4 border-b border-orange-100 pb-6 dark:border-orange-500/10 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="max-w-4xl">
                                            <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">
                                                Section {index + 1}
                                            </p>
                                            <h2 className="mt-2 text-[28px] font-black tracking-tight text-gray-950 dark:text-white">
                                                {section.title}
                                            </h2>
                                            <p className="mt-4 max-w-3xl text-sm leading-6 text-gray-600 dark:text-gray-300">
                                                {getSectionPreview(section.body)}
                                            </p>
                                        </div>
                                        <a
                                            href={`#${section.slug}`}
                                            className="inline-flex items-center gap-2 self-start rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-orange-600 transition-colors hover:bg-orange-100 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-200"
                                        >
                                            Link to section
                                        </a>
                                    </div>

                                    <div className="mt-7">
                                        <DocsMarkdown content={section.body} />
                                    </div>
                                </section>
                            ))
                        )}

                        <section
                            id="faq"
                            className="scroll-mt-28 rounded-[1.75rem] border border-orange-100 bg-white/95 p-6 shadow-sm dark:border-orange-500/10 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.96),rgba(3,7,18,0.98))] sm:p-8"
                        >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-500">
                                        Frequently asked
                                    </p>
                                    <h2 className="mt-2 text-[28px] font-black tracking-tight text-gray-950 dark:text-white">
                                        Questions people usually ask next
                                    </h2>
                                </div>
                                <p className="max-w-xl text-sm text-gray-600 dark:text-gray-300">
                                    Clear answers for the points where journeys most often slow down.
                                </p>
                            </div>

                            <div className="mt-6 space-y-3">
                                {config.faqs.map((faq, index) => {
                                    const isOpen = openFaq === faq.question;
                                    const answerId = `faq-answer-${config.role}-${index + 1}`;

                                    return (
                                        <div
                                            key={faq.question}
                                            className={`overflow-hidden rounded-[1.45rem] border transition-all duration-200 ${
                                                isOpen
                                                    ? 'border-orange-200 bg-[linear-gradient(180deg,#fff8f1_0%,#ffffff_100%)] shadow-[0_18px_36px_-30px_rgba(255,107,53,0.45)] dark:border-orange-500/20 dark:bg-[linear-gradient(180deg,rgba(249,115,22,0.12),rgba(17,24,39,0.88)_20%,rgba(2,6,23,0.98)_100%)]'
                                                    : 'border-orange-100 bg-orange-50/35 dark:border-orange-500/10 dark:bg-[linear-gradient(180deg,rgba(148,163,184,0.08),rgba(15,23,42,0.92))]'
                                            }`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => setOpenFaq(isOpen ? '' : faq.question)}
                                                aria-expanded={isOpen}
                                                aria-controls={answerId}
                                                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors dark:hover:bg-white/[0.02]"
                                            >
                                                <span className="flex items-start gap-3">
                                                    <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-orange-100 text-[11px] font-black text-orange-600 dark:bg-orange-500/10 dark:text-orange-300">
                                                        {index + 1}
                                                    </span>
                                                    <span className="pt-0.5 text-base font-bold text-gray-950 dark:text-white">
                                                        {faq.question}
                                                    </span>
                                                </span>
                                                <ChevronDown
                                                    className={`h-5 w-5 shrink-0 text-orange-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                                                />
                                            </button>
                                            <div
                                                id={answerId}
                                                className={`grid transition-[grid-template-rows] duration-200 ${
                                                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                                                }`}
                                            >
                                                <div className="overflow-hidden">
                                                    <div className="border-t border-orange-100 px-5 py-4 dark:border-orange-500/10 dark:bg-white/[0.02]">
                                                        <p className="text-sm leading-7 text-gray-700 dark:text-gray-300">
                                                            {faq.answer}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                        <section
                            id="glossary"
                            className="scroll-mt-28 rounded-[1.75rem] border border-orange-100 bg-white/95 p-6 shadow-sm dark:border-orange-500/10 dark:bg-gray-950/95 sm:p-8"
                        >
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                                <div>
                                    <p className="text-xs font-black uppercase tracking-[0.24em] text-orange-500">
                                        Glossary
                                    </p>
                                    <h2 className="mt-2 text-[28px] font-black tracking-tight text-gray-950 dark:text-white">
                                        Plain-language meanings
                                    </h2>
                                </div>
                                <p className="max-w-xl text-sm text-gray-600 dark:text-gray-300">
                                    Keep these definitions nearby while you move through the app.
                                </p>
                            </div>

                            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
                                {config.glossary.map((item) => (
                                    <div
                                        key={item.term}
                                        className="rounded-[1.4rem] border border-orange-100 bg-[linear-gradient(180deg,#ffffff_0%,#fff9f3_100%)] p-5 transition-transform duration-200 hover:-translate-y-0.5 dark:border-orange-500/10 dark:bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)]"
                                    >
                                        <h3 className="text-lg font-black tracking-tight text-gray-950 dark:text-white">
                                            {item.term}
                                        </h3>
                                        <p className="mt-2 text-sm leading-6 text-gray-700 dark:text-gray-300">
                                            {item.definition}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </main>

                    <aside className="hidden xl:block xl:min-w-0">
                        <div className="sticky top-24 space-y-5">
                            <div className="rounded-[1.55rem] border border-orange-100 bg-[linear-gradient(180deg,#ffffff_0%,#fff8f2_100%)] p-5 shadow-[0_18px_42px_-30px_rgba(255,107,53,0.3)] dark:border-orange-500/10 dark:bg-[linear-gradient(180deg,#111827_0%,#0f172a_100%)]">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
                                            Reading guide
                                        </p>
                                        <p className="mt-2 text-2xl font-black tracking-tight text-gray-950 dark:text-white">
                                            {guideProgress}% through
                                        </p>
                                        <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                                            {activeSectionData
                                                ? `You are currently in "${activeSectionData.title}".`
                                                : 'Use the guide rail to move section by section.'}
                                        </p>
                                    </div>
                                    <div className="rounded-[1.1rem] bg-orange-50 p-3 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300">
                                        <BookOpen className="h-5 w-5" />
                                    </div>
                                </div>

                                <div className="mt-5 h-2 overflow-hidden rounded-full bg-orange-100 dark:bg-orange-500/10">
                                    <div
                                        className="h-full rounded-full bg-[linear-gradient(90deg,#ff6b35_0%,#f59e0b_100%)] transition-all duration-300"
                                        style={{ width: `${guideProgress}%` }}
                                    />
                                </div>

                                <div className="mt-5 grid gap-3">
                                    <div className="rounded-[1.1rem] border border-orange-100 bg-white/90 px-4 py-3 dark:border-orange-500/10 dark:bg-gray-950/80">
                                        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-500">
                                            Current section
                                        </p>
                                        <p className="mt-2 text-sm font-bold leading-6 text-gray-950 dark:text-white">
                                            {activeSectionData?.title ?? 'Guide overview'}
                                        </p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-[1.1rem] border border-orange-100 bg-white/90 px-4 py-3 dark:border-orange-500/10 dark:bg-gray-950/80">
                                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-500">
                                                Remaining
                                            </p>
                                            <p className="mt-2 text-sm font-bold leading-6 text-gray-950 dark:text-white">
                                                {Math.max(tocSections.length - activeSectionIndex - 1, 0)} sections
                                            </p>
                                        </div>
                                        <div className="rounded-[1.1rem] border border-orange-100 bg-white/90 px-4 py-3 dark:border-orange-500/10 dark:bg-gray-950/80">
                                            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-500">
                                                Search state
                                            </p>
                                            <p className="mt-2 text-sm font-bold leading-6 text-gray-950 dark:text-white">
                                                {deferredQuery ? 'Focused view' : 'Full guide'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-[1.55rem] border border-orange-100 bg-white/95 p-5 shadow-sm dark:border-orange-500/10 dark:bg-gray-950/95">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-2xl bg-orange-50 p-3 text-orange-500 dark:bg-orange-500/10 dark:text-orange-300">
                                        <Layers3 className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
                                            On this page
                                        </p>
                                        <p className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                                            {tocSections.length} sections
                                        </p>
                                    </div>
                                </div>

                                <nav className="mt-5 space-y-2">
                                    {tocSections.map((section, index) => {
                                        const isActive = section.slug === activeSection;

                                        return (
                                            <a
                                                key={section.slug}
                                                href={`#${section.slug}`}
                                                aria-current={isActive ? 'location' : undefined}
                                                className={`group flex items-start gap-3 rounded-[1.2rem] border px-3.5 py-3 text-sm transition-all duration-200 ${
                                                    isActive
                                                        ? 'border-orange-200 bg-[linear-gradient(135deg,#fff6ef_0%,#ffffff_100%)] shadow-[0_16px_30px_-26px_rgba(255,107,53,0.45)] dark:border-orange-500/20 dark:bg-[linear-gradient(135deg,rgba(249,115,22,0.14),rgba(15,23,42,0.96))]'
                                                        : 'border-transparent hover:border-orange-100 hover:bg-orange-50 dark:hover:border-orange-500/10 dark:hover:bg-[linear-gradient(135deg,rgba(249,115,22,0.06),rgba(15,23,42,0.82))]'
                                                }`}
                                            >
                                                <span
                                                    className={`mt-0.5 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full text-[11px] font-black transition-colors ${
                                                        isActive
                                                            ? 'bg-[linear-gradient(135deg,#ff6b35_0%,#f59e0b_100%)] text-white'
                                                            : 'bg-orange-100 text-orange-600 dark:bg-orange-500/10 dark:text-orange-300'
                                                    }`}
                                                >
                                                    {index + 1}
                                                </span>
                                                <span className="min-w-0">
                                                    <span
                                                        className={`block leading-6 ${
                                                            isActive
                                                                ? 'font-bold text-gray-950 dark:text-white'
                                                                : 'font-semibold text-gray-700 group-hover:text-orange-700 dark:text-gray-300 dark:group-hover:text-orange-200'
                                                        }`}
                                                    >
                                                        {section.title}
                                                    </span>
                                                    <span className="mt-1 block text-xs leading-5 text-gray-500 dark:text-gray-400">
                                                        {getSectionPreview(section.body)}
                                                    </span>
                                                </span>
                                            </a>
                                        );
                                    })}
                                </nav>

                                <div className="mt-5 grid gap-2">
                                    <a
                                        href="#faq"
                                        className="inline-flex items-center justify-between rounded-2xl border border-orange-100 bg-orange-50/70 px-4 py-3 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-100 dark:border-orange-500/10 dark:bg-orange-500/10 dark:text-orange-200"
                                    >
                                        Jump to FAQ
                                        <ArrowRight className="h-4 w-4" />
                                    </a>
                                    <a
                                        href="#glossary"
                                        className="inline-flex items-center justify-between rounded-2xl border border-orange-100 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-orange-50 dark:border-orange-500/10 dark:bg-gray-950 dark:text-gray-200 dark:hover:bg-orange-500/5"
                                    >
                                        Jump to glossary
                                        <ArrowRight className="h-4 w-4" />
                                    </a>
                                </div>
                            </div>

                            <div className="rounded-[1.55rem] border border-orange-100 bg-gray-950 p-5 text-white shadow-[0_20px_45px_-30px_rgba(17,24,39,0.8)] dark:border-orange-500/10">
                                <div className="flex items-center gap-3">
                                    <div className="rounded-2xl bg-white/10 p-3 text-orange-200">
                                        <LifeBuoy className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-black text-white">
                                            Need a case-specific answer?
                                        </p>
                                        <p className="text-sm leading-6 text-white/70">
                                            The docs explain the flow. Support helps when your live case needs intervention.
                                        </p>
                                    </div>
                                </div>
                                <Link
                                    to={config.supportHref}
                                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-gray-950 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                                >
                                    {config.supportCta}
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </div>
    );
}

