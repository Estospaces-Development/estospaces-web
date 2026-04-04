"use client";

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Building2, Menu, X } from 'lucide-react';

const PublicHeader = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = useLocation().pathname;

    const navLinks = [
        { href: '/search', label: 'Search' },
        { href: '/about', label: 'About' },
        { href: '/contact', label: 'Contact' },
    ];

    const isActive = (path: string) => pathname === path;

    return (
        <header className="fixed inset-x-0 top-0 z-50 border-b border-[var(--border-soft)] bg-white/82 backdrop-blur-xl dark:bg-black/80">
            <nav className="page-shell flex h-[72px] items-center justify-between">
                <Link to="/" className="group flex items-center gap-3">
                    <div className="rounded-2xl bg-[linear-gradient(135deg,var(--accent-strong),var(--accent-emphasis))] p-2.5 shadow-[var(--shadow-brand)] transition-transform duration-200 group-hover:scale-[1.03]">
                        <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-base font-semibold tracking-[-0.02em] text-[var(--text-strong)]">Estospaces</span>
                        <span className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--text-subtle)]">Property platform</span>
                    </div>
                </Link>

                <div className="hidden md:flex items-center gap-2 rounded-full border border-[var(--border-soft)] bg-[var(--surface-raised)] px-2 py-1 shadow-[var(--shadow-card)]">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            to={link.href}
                            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${isActive(link.href)
                                ? 'bg-[var(--accent-soft)] text-[var(--accent-emphasis)]'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-strong)]'
                                }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                <div className="hidden md:flex items-center gap-3">
                    <Link
                        to="/login"
                        className="rounded-full px-4 py-2 text-sm font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-strong)]"
                    >
                        Sign In
                    </Link>
                    <Link
                        to="/register"
                        className="rounded-full bg-[linear-gradient(135deg,var(--accent-strong),var(--accent-emphasis))] px-5 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-brand)] transition-transform duration-200 hover:-translate-y-px"
                    >
                        Get Started
                    </Link>
                </div>

                <button
                    className="rounded-xl p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--text-strong)] md:hidden"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                    aria-label="Toggle navigation"
                >
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </nav>

            {isMenuOpen && (
                <div className="absolute left-0 top-[72px] w-full border-b border-[var(--border-soft)] bg-[var(--surface-base)] shadow-[var(--shadow-floating)] md:hidden">
                    <div className="page-shell space-y-4 py-5">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                to={link.href}
                                className={`block rounded-2xl px-4 py-3 text-sm font-medium ${isActive(link.href)
                                    ? 'bg-[var(--accent-soft)] text-[var(--accent-emphasis)]'
                                    : 'text-[var(--text-muted)]'
                                    }`}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div className="space-y-3 border-t border-[var(--border-soft)] pt-4">
                            <Link
                                to="/login"
                                className="block rounded-2xl border border-[var(--border-soft)] px-4 py-3 text-center text-sm font-medium text-[var(--text-strong)]"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Sign In
                            </Link>
                            <Link
                                to="/register"
                                className="block rounded-2xl bg-[linear-gradient(135deg,var(--accent-strong),var(--accent-emphasis))] px-4 py-3 text-center text-sm font-semibold text-white"
                                onClick={() => setIsMenuOpen(false)}
                            >
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
