import { ArrowRight, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { RoleDocsDocument } from '@/lib/roleDocs';
import { getSectionPreview } from '@/lib/roleDocsPreview';

interface RoleDocsPreviewCardProps {
    title: string;
    subtitle: string;
    hrefBase: string;
    docsDocument: RoleDocsDocument;
}

export default function RoleDocsPreviewCard({
    title,
    subtitle,
    hrefBase,
    docsDocument,
}: RoleDocsPreviewCardProps) {
    const previewSections = docsDocument.sections.slice(0, 3);

    return (
        <section
            id="role-docs-preview"
            aria-labelledby="role-docs-preview-heading"
            className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm dark:border-orange-900/30 dark:bg-black"
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-500">RoleDocs preview</p>
                    <h2 id="role-docs-preview-heading" className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                        {title}
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                        {subtitle}
                    </p>
                </div>
                <Link
                    to={hrefBase}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-orange-200 px-4 py-3 text-sm font-semibold text-orange-700 transition-colors hover:bg-orange-50 dark:border-orange-500/20 dark:text-orange-200 dark:hover:bg-orange-950/30"
                >
                    <BookOpen className="h-4 w-4" />
                    Open docs
                </Link>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-3">
                {previewSections.map((section) => (
                    <Link
                        key={section.slug}
                        to={`${hrefBase}#${section.slug}`}
                        className="group rounded-2xl border border-gray-100 bg-gray-50 p-4 transition-colors hover:border-orange-200 hover:bg-orange-50/70 dark:border-gray-800 dark:bg-gray-900 dark:hover:border-orange-500/20 dark:hover:bg-orange-950/20"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{section.title}</h3>
                            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-400 transition-colors group-hover:text-orange-500" />
                        </div>
                        <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                            {getSectionPreview(section.body)}
                        </p>
                    </Link>
                ))}
            </div>
        </section>
    );
}
