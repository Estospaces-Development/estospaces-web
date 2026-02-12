'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Cookie, ArrowLeft, Mail } from 'lucide-react';

export default function CookiePolicyPage() {
    const router = useRouter();

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-2 text-gray-600 hover:text-orange-500 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span className="text-sm font-medium">Back</span>
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-4xl mx-auto px-4 py-12">
                {/* Title Section */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                        <Cookie className="text-orange-500" size={32} />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Cookie Policy</h1>
                    <p className="text-gray-500">Last updated: January 2026</p>
                </div>

                {/* Policy Content */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12 space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">1. What Are Cookies?</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Cookies are small text files that are placed on your computer or mobile device when you visit
                            a website. They are widely used to make websites work more efficiently and provide information
                            to the website owners. Cookies help us understand how you use our site and improve your experience.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Types of Cookies We Use</h2>
                        <div className="space-y-4">
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-medium text-gray-900 mb-2">Essential Cookies</h3>
                                <p className="text-gray-600 text-sm">
                                    These cookies are necessary for the website to function properly. They enable core functionality
                                    such as security, account access, and remembering your login status.
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-medium text-gray-900 mb-2">Analytics Cookies</h3>
                                <p className="text-gray-600 text-sm">
                                    These cookies help us understand how visitors interact with our website by collecting and reporting
                                    information anonymously.
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-medium text-gray-900 mb-2">Functional Cookies</h3>
                                <p className="text-gray-600 text-sm">
                                    These cookies enable enhanced functionality and personalisation, such as remembering your preferences,
                                    language settings, and saved property searches.
                                </p>
                            </div>
                            <div className="p-4 bg-gray-50 rounded-lg">
                                <h3 className="font-medium text-gray-900 mb-2">Marketing Cookies</h3>
                                <p className="text-gray-600 text-sm">
                                    These cookies are used to track visitors across websites to display relevant advertisements.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">3. Third-Party Cookies</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Some cookies are placed by third-party services that appear on our pages. We use services from:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4 mt-4">
                            <li><strong>Google Analytics:</strong> To analyse website traffic and usage patterns</li>
                            <li><strong>Authentication Services:</strong> For secure login and account management</li>
                            <li><strong>Payment Providers:</strong> To process secure payments</li>
                            <li><strong>Social Media Platforms:</strong> For sharing features and login options</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Managing Cookies</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            You can control and manage cookies in several ways:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                            <li><strong>Browser Settings:</strong> Most browsers allow you to manage cookies through their settings</li>
                            <li><strong>Our Cookie Banner:</strong> When you first visit our site, you can choose which cookies to accept</li>
                            <li><strong>Third-Party Opt-Outs:</strong> Many advertising networks offer opt-out mechanisms</li>
                        </ul>
                        <p className="text-gray-600 leading-relaxed mt-4">
                            Please note that blocking some types of cookies may impact your experience on our website.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Cookie Retention</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Session cookies last until you close your browser. Persistent cookies remain
                            on your device until they expire or you delete them, ranging from 30 days to 2 years.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Updates to This Policy</h2>
                        <p className="text-gray-600 leading-relaxed">
                            We may update this Cookie Policy from time to time. We encourage you to review this page
                            periodically for the latest information.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Contact Us</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            If you have questions about our use of cookies, please contact us:
                        </p>
                        <div className="flex items-center gap-2 text-orange-500">
                            <Mail size={18} />
                            <a href="mailto:privacy@estospaces.com" className="hover:underline">
                                privacy@estospaces.com
                            </a>
                        </div>
                    </section>
                </div>

                {/* Footer Links */}
                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>
                        See also:{' '}
                        <Link href="/privacy" className="text-orange-500 hover:underline">Privacy Policy</Link>
                        {' | '}
                        <Link href="/terms" className="text-orange-500 hover:underline">Terms & Conditions</Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
