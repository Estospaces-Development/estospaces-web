"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FileText, ArrowLeft, Mail } from 'lucide-react';

export default function TermsPage() {
    const router = useRouter();

    const handleBack = () => {
        if (window.history.length > 1) {
            router.back();
        } else {
            router.push('/');
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <button onClick={handleBack} className="flex items-center gap-2 text-gray-600 hover:text-orange-500 transition-colors">
                        <ArrowLeft size={20} />
                        <span className="text-sm font-medium">Back</span>
                    </button>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-12">
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                        <FileText className="text-orange-500" size={32} />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Terms and Conditions</h1>
                    <p className="text-gray-500">Last updated: January 2026</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12 space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                        <p className="text-gray-600 leading-relaxed">
                            By accessing and using Estospaces, you accept and agree to be bound by the terms and provision of this agreement.
                            In addition, when using these particular services, you shall be subject to any posted guidelines or rules applicable
                            to such services. Any participation in this service will constitute acceptance of this agreement. If you do not
                            agree to abide by the above, please do not use this service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Provision of Services</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Estospaces connects property seekers with landlords and agents. We do not own, manage, or inspect listed properties
                            unless explicitly stated. We are not a party to any rental agreement entered into between landlords and tenants.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">3. User Conduct</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            You agree not to use the website for any unlawful purpose or any purpose prohibited under this clause. You agree not to use the website in any way that could damage the website, the services or the general business of Estospaces.
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                            <li>You must provide accurate and complete information when creating an account.</li>
                            <li>You are responsible for maintaining the confidentiality of your account and password.</li>
                            <li>You must not harass, abuse, or harm another person via our platform.</li>
                            <li>You must not upload any content that is offensive, illegal, or infringes on intellectual property rights.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Property Listings</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Landlords and agents are responsible for the accuracy of their listings. We do not guarantee the
                            accuracy, completeness, or quality of any property information. Users are advised to verify all
                            details independently before entering into any agreements.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Payments and Fees</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Some services on Estospaces may require payment of fees. All fees are stated in Great British Pounds (GBP)
                            unless otherwise specified. You agree to pay all fees and charges incurred in connection with your account
                            at the rates in effect when the charges were incurred.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Intellectual Property</h2>
                        <p className="text-gray-600 leading-relaxed">
                            The Site and its original content, features, and functionality are owned by Estospaces and are protected by
                            international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights laws.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Termination</h2>
                        <p className="text-gray-600 leading-relaxed">
                            We may terminate your access to the Site, without cause or notice, which may result in the forfeiture and destruction
                            of all information associated with your account. All provisions of this Agreement that, by their nature, should
                            survive termination shall survive termination, including, without limitation, ownership provisions, warranty
                            disclaimers, indemnity, and limitations of liability.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Limitation of Liability</h2>
                        <p className="text-gray-600 leading-relaxed">
                            In no event shall Estospaces, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable
                            for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of
                            profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability
                            to access or use the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">9. Contact Us</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            If you have any questions about these Terms, please contact us:
                        </p>
                        <div className="flex items-center gap-2 text-orange-500">
                            <Mail size={18} />
                            <a href="mailto:legal@estospaces.com" className="hover:underline">
                                legal@estospaces.com
                            </a>
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
