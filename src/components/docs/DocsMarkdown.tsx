"use client";

import type { ComponentPropsWithoutRef } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import { Link } from 'react-router-dom';
import remarkGfm from 'remark-gfm';

interface DocsMarkdownProps {
    content: string;
}

const components: Components = {
    h1: ({ children }) => (
        <h1 className="mb-5 text-display text-gray-950 dark:text-white">{children}</h1>
    ),
    h2: ({ children }) => (
        <h2 className="mt-14 mb-4 text-headline text-gray-950 dark:text-white">{children}</h2>
    ),
    h3: ({ children }) => (
        <h3 className="mt-9 mb-3 text-title text-gray-950 dark:text-white">{children}</h3>
    ),
    h4: ({ children }) => (
        <h4 className="mt-6 mb-3 text-base font-bold text-gray-900 dark:text-white">{children}</h4>
    ),
    p: ({ children }) => (
        <p className="mb-5 max-w-[76ch] text-[16px] leading-8 text-gray-700 dark:text-gray-300">{children}</p>
    ),
    ul: ({ children }) => (
        <ul className="mb-7 ml-5 max-w-[76ch] list-disc space-y-3 text-[15px] leading-7 text-gray-700 marker:text-orange-500 dark:text-gray-300">
            {children}
        </ul>
    ),
    ol: ({ children }) => (
        <ol className="mb-7 ml-5 max-w-[76ch] list-decimal space-y-3 text-[15px] leading-7 text-gray-700 marker:font-semibold marker:text-orange-500 dark:text-gray-300">
            {children}
        </ol>
    ),
    li: ({ children, ...props }) => {
        const className = props.className?.includes('task-list-item') ? 'list-none ml-0' : '';
        return <li className={className}>{children}</li>;
    },
    input: (props) => {
        const inputProps = props as ComponentPropsWithoutRef<'input'>;
        if (inputProps.type === 'checkbox') {
            return (
                <input
                    {...inputProps}
                    disabled
                    readOnly
                    className="mr-3 mt-1 inline-block h-4 w-4 rounded border-orange-300 align-top accent-orange-500"
                />
            );
        }

        return <input {...inputProps} />;
    },
    blockquote: ({ children }) => (
        <blockquote className="mb-7 max-w-[78ch] rounded-[1.7rem] border border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 px-5 py-5 text-sm font-medium leading-7 text-gray-700 shadow-sm dark:border-orange-500/20 dark:from-orange-500/10 dark:to-amber-500/10 dark:text-gray-200">
            {children}
        </blockquote>
    ),
    hr: () => <hr className="my-8 border-gray-200 dark:border-gray-700" />,
    strong: ({ children }) => (
        <strong className="font-bold text-gray-950 dark:text-white">{children}</strong>
    ),
    code: ({ inline, children }) =>
        inline ? (
            <code className="rounded-lg bg-orange-50 px-1.5 py-0.5 font-mono text-[13px] text-orange-700 dark:bg-orange-500/10 dark:text-orange-300">
                {children}
            </code>
        ) : (
            <code className="block overflow-x-auto rounded-3xl bg-gray-950 px-5 py-4 font-mono text-sm text-orange-100">
                {children}
            </code>
        ),
    pre: ({ children }) => <pre className="mb-5 overflow-x-auto">{children}</pre>,
    table: ({ children }) => (
        <div className="mb-8 overflow-hidden rounded-[1.7rem] border border-orange-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-950">
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-orange-100 text-left dark:divide-gray-800">
                    {children}
                </table>
            </div>
        </div>
    ),
    thead: ({ children }) => (
        <thead className="bg-orange-50/80 dark:bg-gray-900">{children}</thead>
    ),
    th: ({ children }) => (
        <th className="px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-orange-700 dark:text-orange-300">
            {children}
        </th>
    ),
    tbody: ({ children }) => (
        <tbody className="divide-y divide-orange-100 dark:divide-gray-800">{children}</tbody>
    ),
    td: ({ children }) => (
        <td className="px-4 py-3 align-top text-sm leading-6 text-gray-700 dark:text-gray-300">
            {children}
        </td>
    ),
    a: ({ href, children }) => {
        if (!href) {
            return <span>{children}</span>;
        }

        if (href.startsWith('/')) {
            return (
                <Link
                    to={href}
                    className="font-semibold text-orange-600 underline decoration-orange-200 underline-offset-4 transition-colors hover:text-orange-700 dark:text-orange-300 dark:decoration-orange-500/40 dark:hover:text-orange-200"
                >
                    {children}
                </Link>
            );
        }

        return (
            <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-orange-600 underline decoration-orange-200 underline-offset-4 transition-colors hover:text-orange-700 dark:text-orange-300 dark:decoration-orange-500/40 dark:hover:text-orange-200"
            >
                {children}
            </a>
        );
    },
};

export default function DocsMarkdown({ content }: DocsMarkdownProps) {
    return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {content}
        </ReactMarkdown>
    );
}
