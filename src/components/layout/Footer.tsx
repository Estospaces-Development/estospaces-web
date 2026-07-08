import React from 'react';
import { Link } from 'react-router-dom';
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
        <footer className="border-t border-[var(--border-soft)] bg-[#14110f] text-gray-300">
            <div className="page-shell py-14">
                <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <div className="mb-5 flex items-center gap-3">
                            <div className="rounded-2xl bg-[linear-gradient(135deg,var(--accent-strong),var(--accent-emphasis))] p-2.5 shadow-[var(--shadow-brand)]">
                                <Building2 className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <span className="block text-lg font-semibold text-white">Estospaces</span>
                                <span className="text-xs uppercase tracking-[0.18em] text-orange-200/70">Property platform</span>
                            </div>
                        </div>
                        <p className="mb-5 max-w-sm text-sm leading-relaxed text-gray-200">
                            Premium property journeys for discovery, fast-track progression, contracts, and completion across India and England.
                        </p>
                        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-orange-200/80">
                            India office
                        </p>
                        <div className="space-y-2 text-sm">
                            <div className="flex items-center gap-2">
                                <Mail className="h-4 w-4 text-orange-300/70" />
                                <span>hello@estospaces.com</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-orange-300/70" />
                                <span>+91 44 7123 4567</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-orange-300/70" />
                                <span>Chennai, India</span>
                            </div>
                        </div>
                    </div>

                    {Object.entries(footerLinks).map(([title, links]) => (
                        <div key={title}>
                            <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-white/90">{title}</h3>
                            <ul className="space-y-2.5">
                                {links.map((link) => (
                                    <li key={link.label}>
                                        <Link
                                            to={link.href}
                                            className="text-sm text-gray-200 transition-colors hover:text-white"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 md:flex-row">
                    <p className="text-xs text-gray-300">
                        Copyright {currentYear} Estospaces. All rights reserved.
                    </p>
                    <div className="flex items-center gap-6 text-xs text-gray-300">
                        <Link to="/privacy" className="transition-colors hover:text-white">Privacy</Link>
                        <Link to="/terms" className="transition-colors hover:text-white">Terms</Link>
                        <Link to="/contact" className="transition-colors hover:text-white">Contact</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
