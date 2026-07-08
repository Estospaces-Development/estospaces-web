"use client";

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogIn, Menu, UserPlus, X } from 'lucide-react';
import { getAuthPath, getLoginPath } from '@/lib/authUtils';
import { getPublicHomeHref, isExternalHref } from '@/lib/utils/hostUtils';

type NavLink = {
    href: string;
    label: string;
    external?: boolean;
};

const logoIcon = '/logo-icon.png';

const PublicHeader = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();
    const pathname = location.pathname;
    const loginPath = getLoginPath();
    const registerPath = getAuthPath('/register');
    const homeHref = getPublicHomeHref();
    const isExternalHomeHref = isExternalHref(homeHref);

    const navLinks: NavLink[] = [
        { href: '/search', label: 'Search' },
        { href: '/about', label: 'About' },
        { href: '/faq', label: 'FAQ' },
        { href: 'https://estospaces.com/blogs', label: 'Blog', external: true },
        { href: '/contact', label: 'Contact' },
    ];

    const isActive = (link: NavLink) => !link.external && pathname === link.href && link.href !== '/';

    const resolveNavHref = (link: NavLink) => {
        if (link.href === '/search' && pathname === '/search' && location.search) {
            return `${link.href}${location.search}`;
        }

        return link.href;
    };

    const navItemClass = (link: NavLink) =>
        `text-sm font-medium transition-colors hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
            isActive(link) ? 'text-primary' : 'text-gray-700 dark:text-gray-200'
        }`;

    const closeMenu = () => setIsMenuOpen(false);

    const homeLinkClassName = 'flex items-center gap-2 transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary';
    const homeLinkContent = (
        <>
            <img
                src={logoIcon}
                alt=""
                aria-hidden="true"
                className="h-9 w-9 object-contain sm:h-10 sm:w-10"
            />
            <span className="text-lg font-bold text-gray-900 dark:text-white sm:text-xl">Estospaces</span>
        </>
    );
    const handleNavLinkClick = (event: React.MouseEvent<HTMLAnchorElement>, link: NavLink) => {
        if (link.href === '/search' && pathname === '/search') {
            event.preventDefault();
        }

        closeMenu();
    };

    return (
        <header className="fixed left-0 right-0 top-0 z-50 bg-white shadow-md dark:bg-gray-900">
            <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:h-20 sm:px-6 lg:px-8">
                {isExternalHomeHref ? (
                    <a
                        href={homeHref}
                        className={homeLinkClassName}
                        aria-label="Estospaces home"
                        onClick={closeMenu}
                    >
                        {homeLinkContent}
                    </a>
                ) : (
                    <Link
                        to={homeHref}
                        className={homeLinkClassName}
                        aria-label="Estospaces home"
                        onClick={closeMenu}
                    >
                        {homeLinkContent}
                    </Link>
                )}
                <div className="hidden items-center gap-8 md:flex">
                    {navLinks.map((link) =>
                        link.external ? (
                            <a key={link.href} href={link.href} className={navItemClass(link)}>
                                {link.label}
                            </a>
                        ) : (
                            <Link key={`${link.href}-${link.label}`} to={resolveNavHref(link)} className={navItemClass(link)} onClick={(event) => handleNavLinkClick(event, link)}>
                                {link.label}
                            </Link>
                        ),
                    )}
                    <Link
                        to={loginPath}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-orange-50 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                        <LogIn size={18} />
                        Sign In
                    </Link>
                    <Link
                        to={registerPath}
                        className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-orange-950/10 transition-colors hover:bg-primary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                        <UserPlus size={18} />
                        Get Started
                    </Link>
                </div>

                <button
                    type="button"
                    className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-gray-200 dark:hover:bg-gray-800 md:hidden"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle navigation"
                    aria-expanded={isMenuOpen}
                    aria-controls="public-mobile-navigation"
                >
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </nav>

            {isMenuOpen && (
                <div
                    id="public-mobile-navigation"
                    className="fixed inset-x-0 top-16 z-50 max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-gray-100 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900 sm:top-20 sm:max-h-[calc(100vh-5rem)] md:hidden"
                >
                    <div className="mx-auto max-w-7xl space-y-1 px-4 py-4 sm:px-6">
                        {navLinks.map((link) =>
                            link.external ? (
                                <a
                                    key={link.href}
                                    href={link.href}
                                    className="block rounded-lg px-3 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-orange-50 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-gray-200 dark:hover:bg-gray-800"
                                    onClick={closeMenu}
                                >
                                    {link.label}
                                </a>
                            ) : (
                                <Link
                                    key={`${link.href}-${link.label}`}
                                    to={resolveNavHref(link)}
                                    className={`block rounded-lg px-3 py-3 text-sm font-medium transition-colors hover:bg-orange-50 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:hover:bg-gray-800 ${
                                        isActive(link) ? 'text-primary' : 'text-gray-700 dark:text-gray-200'
                                    }`}
                                    onClick={(event) => handleNavLinkClick(event, link)}
                                >
                                    {link.label}
                                </Link>
                            ),
                        )}
                        <div className="space-y-3 border-t border-gray-100 pt-4 dark:border-gray-800">
                            <Link
                                to={loginPath}
                                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition-colors hover:bg-orange-50 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:hover:bg-gray-800"
                                onClick={closeMenu}
                            >
                                <LogIn size={18} />
                                Sign In
                            </Link>
                            <Link
                                to={registerPath}
                                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-orange-950/10 transition-colors hover:bg-primary-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                                onClick={closeMenu}
                            >
                                <UserPlus size={18} />
                                Get Started
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </header>
    );
};

export default PublicHeader;
