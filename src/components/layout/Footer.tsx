import React from 'react';
import Link from 'next/link';
import { Building2, Mail, Phone, MapPin } from 'lucide-react';

const Footer: React.FC = () => {
    const currentYear = new Date().getFullYear();

    const footerLinks = {
        Company: [
            { label: 'About Us', href: '/about' },
            { label: 'Contact', href: '/contact' },
            { label: 'FAQ', href: '/faq' },
        ],
        Legal: [
            { label: 'Privacy Policy', href: '/privacy' },
            { label: 'Terms of Service', href: '/terms' },
            { label: 'Cookie Policy', href: '/cookies' },
        ],
        Services: [
            { label: 'Buy Property', href: '/user/dashboard' },
            { label: 'Rent Property', href: '/user/dashboard' },
            { label: 'List Your Property', href: '/contact' },
        ],
    };

    return (
        <footer className="bg-gray-950 text-gray-300 border-t border-gray-800">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                    {/* Brand */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 bg-gradient-to-br from-indigo-600 to-blue-600 rounded-lg">
                                <Building2 className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-lg font-bold text-white">EstoSpaces</span>
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed mb-6">
                            Premium property platform connecting buyers, sellers, and brokers across the UK.
                        </p>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <Mail className="w-4 h-4 text-gray-500" />
                                <span>hello@estospaces.co.uk</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-gray-500" />
                                <span>+44 20 7123 4567</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4 text-gray-500" />
                                <span>London, United Kingdom</span>
                            </div>
                        </div>
                    </div>

                    {/* Link Sections */}
                    {Object.entries(footerLinks).map(([title, links]) => (
                        <div key={title}>
                            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">{title}</h3>
                            <ul className="space-y-2.5">
                                {links.map((link) => (
                                    <li key={link.label}>
                                        <Link
                                            href={link.href}
                                            className="text-sm text-gray-400 hover:text-white transition-colors"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom */}
                <div className="mt-12 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center gap-4">
                    <p className="text-xs text-gray-500">
                        © {currentYear} EstoSpaces. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6 text-xs text-gray-500">
                        <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                        <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                        <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
