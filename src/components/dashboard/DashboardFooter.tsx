'use client';

import { Link } from 'react-router-dom';
import { Twitter, Instagram, Linkedin } from 'lucide-react';

const DashboardFooter = () => {
    return (
        <footer className="bg-white mt-auto">
            {/* Main Footer */}
            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* ESTOSPACES.COM Column */}
                    <div>
                        <h3 className="text-sm font-bold uppercase mb-4" style={{ color: '#1e3a5f' }}>ESTOSPACES.COM</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link to="/contact" className="text-gray-700 hover:text-orange-600 transition-colors">
                                    Contact Us
                                </Link>
                            </li>
                            <li>
                                <Link to="/faq" className="text-gray-700 hover:text-orange-600 transition-colors">
                                    FAQ
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Search Column */}
                    <div>
                        <h3 className="text-sm font-bold uppercase mb-4" style={{ color: '#1e3a5f' }}>Search</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link to="/user/dashboard/discover?tab=buy&type=residential" className="text-gray-700 hover:text-orange-600 transition-colors">
                                    Search homes for sale
                                </Link>
                            </li>
                            <li>
                                <Link to="/user/dashboard/discover?tab=rent&type=residential" className="text-gray-700 hover:text-orange-600 transition-colors">
                                    Search homes for rent
                                </Link>
                            </li>
                            <li>
                                <Link to="/user/dashboard/discover?tab=buy&type=commercial" className="text-gray-700 hover:text-orange-600 transition-colors">
                                    Commercial for sale
                                </Link>
                            </li>
                            <li>
                                <Link to="/user/dashboard/discover?tab=rent&type=commercial" className="text-gray-700 hover:text-orange-600 transition-colors">
                                    Commercial to rent
                                </Link>
                            </li>
                            <li>
                                <Link to="/user/dashboard/discover?new=true&tab=buy" className="text-gray-700 hover:text-orange-600 transition-colors">
                                    New homes
                                </Link>
                            </li>
                        </ul>
                    </div>

                    {/* Locations Column */}
                    <div>
                        <h3 className="text-sm font-bold uppercase mb-4" style={{ color: '#1e3a5f' }}>Locations</h3>
                        <ul className="space-y-2 text-sm">
                            <li>
                                <Link to="/user/dashboard/discover?location=uk" className="text-gray-700 hover:text-orange-600 transition-colors">
                                    Major towns and cities in the UK
                                </Link>
                            </li>
                            <li>
                                <Link to="/user/dashboard/discover?location=london" className="text-gray-700 hover:text-orange-600 transition-colors">
                                    London
                                </Link>
                            </li>
                            <li>
                                <Link to="/user/dashboard/discover?location=cornwall" className="text-gray-700 hover:text-orange-600 transition-colors">
                                    Cornwall
                                </Link>
                            </li>
                            <li>
                                <Link to="/user/dashboard/discover?location=glasgow" className="text-gray-700 hover:text-orange-600 transition-colors">
                                    Glasgow
                                </Link>
                            </li>
                            <li>
                                <Link to="/user/dashboard/discover?location=cardiff" className="text-gray-700 hover:text-orange-600 transition-colors">
                                    Cardiff
                                </Link>
                            </li>
                            <li>
                                <Link to="/user/dashboard/discover?location=edinburgh" className="text-gray-700 hover:text-orange-600 transition-colors">
                                    Edinburgh
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Bottom Copyright Bar */}
            <div className="">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                        {/* Copyright */}
                        <p className="text-sm text-gray-700">
                            © 2026 Estospaces. All rights reserved.
                        </p>

                        {/* Policy Links */}
                        <div className="flex items-center gap-4 text-sm text-gray-700">
                            <Link to="/privacy" className="hover:text-orange-600 transition-colors">
                                Privacy Policy
                            </Link>
                            <span className="text-gray-400">|</span>
                            <Link to="/cookies" className="hover:text-orange-600 transition-colors">
                                Cookie Policy
                            </Link>
                            <span className="text-gray-400">|</span>
                            <Link to="/terms" className="hover:text-orange-600 transition-colors">
                                Terms &amp; Conditions
                            </Link>
                        </div>

                        {/* Social Media Icons */}
                        <div className="flex items-center gap-4">
                            <a
                                href="https://x.com/ESTOSPACES"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-orange-600 transition-colors"
                                aria-label="X (Twitter)"
                            >
                                <Twitter size={18} />
                            </a>
                            <a
                                href="https://www.instagram.com/estospaces/ram"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-orange-600 transition-colors"
                                aria-label="Instagram"
                            >
                                <Instagram size={18} />
                            </a>
                            <a
                                href="https://www.linkedin.com/company/estospaces-solutions-private-limited/?viewAsMember=true"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-400 hover:text-orange-600 transition-colors"
                                aria-label="LinkedIn"
                            >
                                <Linkedin size={18} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default DashboardFooter;

