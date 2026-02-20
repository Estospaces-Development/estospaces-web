'use client';

import { Link, useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Mail } from 'lucide-react';

export default function PrivacyPolicyPage() {
    const navigate = useNavigate();

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/');
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
                        <Shield className="text-orange-500" size={32} />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
                    <p className="text-gray-500">Last updated: January 2026</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12 space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Introduction</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Welcome to Estospaces. We respect your privacy and are committed to protecting your personal data.
                            This privacy policy will inform you about how we look after your personal data when you visit our
                            website and tell you about your privacy rights and how the law protects you.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Data We Collect</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            We may collect, use, store and transfer different kinds of personal data about you including:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                            <li><strong>Identity Data:</strong> First name, last name, username or similar identifier</li>
                            <li><strong>Contact Data:</strong> Email address, telephone numbers, billing and delivery addresses</li>
                            <li><strong>Financial Data:</strong> Bank account and payment card details (processed securely)</li>
                            <li><strong>Transaction Data:</strong> Details about payments and property transactions</li>
                            <li><strong>Technical Data:</strong> IP address, browser type, time zone, location data</li>
                            <li><strong>Profile Data:</strong> Username, password, preferences, feedback and survey responses</li>
                            <li><strong>Usage Data:</strong> Information about how you use our website and services</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">3. How We Use Your Data</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            We will only use your personal data when the law allows us to. Most commonly, we will use your personal data:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                            <li>To register you as a new customer and manage your account</li>
                            <li>To process and deliver property listings and services</li>
                            <li>To manage payments and fees</li>
                            <li>To connect you with property agents and landlords</li>
                            <li>To send you relevant marketing communications (with your consent)</li>
                            <li>To improve our website, products/services, and customer relationships</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Data Security</h2>
                        <p className="text-gray-600 leading-relaxed">
                            We have put in place appropriate security measures to prevent your personal data from being
                            accidentally lost, used or accessed in an unauthorised way. We use industry-standard encryption
                            and security protocols to protect your information. Access to your personal data is limited to
                            employees and third parties who have a business need to know.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Your Legal Rights</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Under data protection laws, you have rights including:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                            <li><strong>Right to access:</strong> Request copies of your personal data</li>
                            <li><strong>Right to rectification:</strong> Request correction of inaccurate data</li>
                            <li><strong>Right to erasure:</strong> Request deletion of your personal data</li>
                            <li><strong>Right to restrict processing:</strong> Request limitation of data processing</li>
                            <li><strong>Right to data portability:</strong> Request transfer of your data</li>
                            <li><strong>Right to object:</strong> Object to processing of your personal data</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Third-Party Links</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Our website may include links to third-party websites, plug-ins and applications. Clicking on
                            those links may allow third parties to collect or share data about you. We do not control these
                            third-party websites and are not responsible for their privacy statements.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Contact Us</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            If you have any questions about this privacy policy or our privacy practices, please contact us:
                        </p>
                        <div className="flex items-center gap-2 text-orange-500">
                            <Mail size={18} />
                            <a href="mailto:privacy@estospaces.com" className="hover:underline">
                                privacy@estospaces.com
                            </a>
                        </div>
                    </section>
                </div>

                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>
                        See also:{' '}
                        <Link to="/cookies" className="text-orange-500 hover:underline">Cookie Policy</Link>
                        {' | '}
                        <Link to="/terms" className="text-orange-500 hover:underline">Terms &amp; Conditions</Link>
                    </p>
                </div>
            </main>
        </div>
    );
}

