import React from 'react';
import { Link } from 'react-router-dom';
import { getPublicHomeHref, isExternalHref } from '@/lib/utils/hostUtils';

type AuthBrandProps = {
    className?: string;
};

export default function AuthBrand({ className = '' }: AuthBrandProps) {
    const homeHref = getPublicHomeHref();
    const isExternalHomeHref = isExternalHref(homeHref);
    const linkClassName = 'inline-flex items-center gap-3 rounded-2xl bg-white/85 px-4 py-3 shadow-sm ring-1 ring-black/5 backdrop-blur transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:bg-gray-900/80 dark:ring-white/10 dark:hover:bg-gray-900 dark:focus-visible:ring-offset-gray-900';
    const linkContent = (
        <>
            <img
                src="/images/logo-icon.png"
                alt="Estospaces logo"
                width={42}
                height={42}
                className="h-8 w-auto object-contain"
            />
            <span className="font-display text-[2rem] font-bold leading-none tracking-tight text-gray-900 dark:text-white">
                Estospaces
            </span>
        </>
    );

    return (
        <div className={`mb-8 flex justify-center ${className}`.trim()}>
            {isExternalHomeHref ? (
                <a href={homeHref} className={linkClassName} aria-label="Estospaces home">
                    {linkContent}
                </a>
            ) : (
                <Link to={homeHref} className={linkClassName} aria-label="Estospaces home">
                    {linkContent}
                </Link>
            )}
        </div>
    );
}
