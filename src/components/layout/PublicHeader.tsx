"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Building2, Menu, X } from 'lucide-react';
import { usePathname } from 'next/navigation';

const PublicHeader = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const pathname = usePathname();

    const navLinks = [
        { href: '/search', label: 'Search' },
        { href: '/about', label: 'About' },
        { href: '/contact', label: 'Contact' },
    ];

    const isActive = (path: string) => pathname === path;

    return (
        <header className="fixed w-full bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
            <nav className="container mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <div className="p-2 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-lg group-hover:shadow-lg group-hover:shadow-indigo-500/20 transition-all duration-300">
                        <Building2 className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-gray-900 tracking-tight">EstoSpaces</span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-8">
                    {navLinks.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`text-sm font-medium transition-colors ${isActive(link.href)
                                    ? 'text-indigo-600'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>

                {/* Auth Buttons */}
                <div className="hidden md:flex items-center gap-4">
                    <Link
                        href="/login"
                        className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                    >
                        Sign In
                    </Link>
                    <Link
                        href="/register"
                        className="px-4 py-2 bg-gray-900 hover:bg-black text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-gray-900/20"
                    >
                        Get Started
                    </Link>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 text-gray-600"
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </nav>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-gray-100 animate-in slide-in-from-top-2 duration-200">
                    <div className="p-4 space-y-4">
                        {navLinks.map((link) => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`block text-sm font-medium ${isActive(link.href) ? 'text-indigo-600' : 'text-gray-600'
                                    }`}
                                onClick={() => setIsMenuOpen(false)}
                            >
                                {link.label}
                            </Link>
                        ))}
                        <div className="pt-4 border-t border-gray-100 space-y-3">
                            <Link
                                href="/login"
                                className="block text-center text-sm font-medium text-gray-600 hover:text-gray-900"
                                onClick={() => setIsMenuOpen(false)}
                            >
                                Sign In
                            </Link>
                            <Link
                                href="/register"
                                className="block text-center px-4 py-3 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-black"
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
