'use client';

import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import BackButton from '@/components/ui/BackButton';

interface SimpleDocsPageProps {
    label: string;
    title: string;
    subtitle: string;
    markdown: string;
    supportHref: string;
    supportLabel: string;
}

interface DocsSection {
    title: string;
    slug: string;
    body: string;
}

const slugify = (value: string) =>
    value
        .toLowerCase()
        .trim()
        .replace(/[`*_~]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

const parseMarkdown = (markdown: string) => {
    const lines = markdown.replace(/\r\n/g, '\n').split('\n');
    const introLines: string[] = [];
    const sections: DocsSection[] = [];

    let currentTitle = '';
    let currentLines: string[] = [];

    const pushSection = () => {
        if (!currentTitle) {
            return;
        }

        sections.push({
            title: currentTitle,
            slug: slugify(currentTitle) || `section-${sections.length + 1}`,
            body: currentLines.join('\n').trim(),
        });
    };

    for (const line of lines) {
        const headingMatch = line.match(/^##\s+(.+?)\s*$/);
        if (headingMatch) {
            pushSection();
            currentTitle = headingMatch[1].trim();
            currentLines = [];
            continue;
        }

        if (!currentTitle) {
            introLines.push(line);
            continue;
        }

        currentLines.push(line);
    }

    pushSection();

    return {
        intro: introLines.join('\n').trim(),
        sections,
    };
};

const renderBlocks = (body: string) =>
    body
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block, index) => {
            if (block.startsWith('- ')) {
                const items = block
                    .split('\n')
                    .map((line) => line.replace(/^-+\s*/, '').trim())
                    .filter(Boolean);
                return (
                    <ul key={`${block}-${index}`} className="list-disc space-y-2 pl-5 text-sm leading-7 text-gray-700 dark:text-gray-300">
                        {items.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ul>
                );
            }

            if (/^\d+\.\s/.test(block)) {
                const items = block
                    .split('\n')
                    .map((line) => line.replace(/^\d+\.\s*/, '').trim())
                    .filter(Boolean);
                return (
                    <ol key={`${block}-${index}`} className="list-decimal space-y-2 pl-5 text-sm leading-7 text-gray-700 dark:text-gray-300">
                        {items.map((item) => (
                            <li key={item}>{item}</li>
                        ))}
                    </ol>
                );
            }

            return (
                <p key={`${block}-${index}`} className="whitespace-pre-wrap text-sm leading-7 text-gray-700 dark:text-gray-300">
                    {block.replace(/^#\s+.+$/gm, '').trim()}
                </p>
            );
        });

export default function SimpleDocsPage({
    label,
    title,
    subtitle,
    markdown,
    supportHref,
    supportLabel,
}: SimpleDocsPageProps) {
    const document = useMemo(() => parseMarkdown(markdown), [markdown]);

    return (
        <div className="space-y-8 pb-16">
            <div className="space-y-4">
                <BackButton />
                <div className="rounded-3xl border border-orange-100 bg-gradient-to-br from-white via-orange-50/60 to-amber-50/50 p-8 shadow-sm dark:border-orange-500/10 dark:from-gray-900 dark:via-gray-900 dark:to-gray-950">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">{label}</p>
                    <h1 className="mt-4 text-3xl font-black tracking-tight text-gray-950 dark:text-white">{title}</h1>
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-600 dark:text-gray-300">{subtitle}</p>
                    <div className="mt-6 flex flex-wrap gap-3">
                        <Link
                            to={supportHref}
                            className="inline-flex items-center rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-orange-600"
                        >
                            {supportLabel}
                        </Link>
                    </div>
                </div>
            </div>

            <div className="grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="h-fit rounded-3xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-orange-500">Guide map</p>
                    <div className="mt-4 space-y-3">
                        {document.sections.map((section) => (
                            <a
                                key={section.slug}
                                href={`#${section.slug}`}
                                className="block rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:text-orange-600 dark:border-gray-800 dark:text-gray-300 dark:hover:border-orange-500/30 dark:hover:text-orange-300"
                            >
                                {section.title}
                            </a>
                        ))}
                    </div>
                </aside>

                <article className="space-y-8 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
                    {document.intro ? (
                        <div className="rounded-3xl border border-orange-100 bg-orange-50/60 p-6 dark:border-orange-500/10 dark:bg-orange-500/5">
                            {renderBlocks(document.intro)}
                        </div>
                    ) : null}

                    {document.sections.map((section) => (
                        <section key={section.slug} id={section.slug} className="scroll-mt-28 space-y-4">
                            <h2 className="text-2xl font-black tracking-tight text-gray-950 dark:text-white">{section.title}</h2>
                            <div className="space-y-4">
                                {renderBlocks(section.body)}
                            </div>
                        </section>
                    ))}
                </article>
            </div>
        </div>
    );
}
