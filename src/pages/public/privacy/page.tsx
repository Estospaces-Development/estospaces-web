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
            <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    <button onClick={handleBack} className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-gray-600 transition-colors hover:bg-orange-50 hover:text-orange-500">
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
                    <p className="text-gray-500">Last updated: 13 October 2026</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">1. Who We Are</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Estospaces helps people find homes and helps property managers and agents work with them, in India and the UK. For users and managers in India, the data controller is Estospaces Solutions Private Limited (CIN U68100TN2025PTC179899), registered office 28/50B Therku Veethi, Lakhma Samuthram, Narasingapuram, Attur, Salem 636108, Tamil Nadu, India. For users and managers in the United Kingdom, it is Estospaces Solutions Limited. This policy explains what personal data we use, why, who we share it with and your rights.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Data We Collect</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Depending on how you use Estospaces, we collect:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                            <li><strong>Account and identity data:</strong> name, email address, phone number, country and role</li>
                            <li><strong>Verification documents:</strong> identity, address, licence or company documents you upload, and our review decisions</li>
                            <li><strong>Property and case data:</strong> listings, enquiries, viewings, applications, Fast Track cases, contracts and messages</li>
                            <li><strong>Payment data:</strong> plan, amount, currency, status and the payment reference from Razorpay. Card and bank details are entered on Razorpay’s secure checkout and are not stored by Estospaces</li>
                            <li><strong>Technical data:</strong> IP address, browser type, time zone and security logs</li>
                            <li><strong>Usage data:</strong> only with your permission, through optional analytics and chat (see section 6)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">3. How and Why We Use It</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            We use your data only where the law allows:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                            <li>To create and run your account and provide the service you ask for (performing our contract with you)</li>
                            <li>To verify identities and documents, prevent fraud and keep the platform safe (legitimate interests and legal obligations)</li>
                            <li>To take payments and keep financial records (contract and legal obligations)</li>
                            <li>To connect you with the managers, agents or seekers you choose to deal with</li>
                            <li>To send service messages; marketing only with your consent, which you can withdraw at any time</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">4. Who We Share It With</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            We never sell your personal data. We share it only with:
                        </p>
                        <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                            <li>The other party you choose to deal with on Estospaces (for example the manager of a home you enquire about)</li>
                            <li>Service providers who process data for us: Google Cloud (hosting), Razorpay (payments), Brevo (email), Zoho SalesIQ (optional analytics and chat, only with your consent) and postcodes.io (UK postcode lookup)</li>
                            <li>Authorities, where the law requires it</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">5. Where It Is Stored and For How Long</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Your data is stored on Google Cloud in London, United Kingdom, for users in both India and the UK. Where data moves between countries we rely on the safeguards the law requires. We keep your data while your account is open and then only as long as needed for the purposes above or as the law requires (for example, payment and tax records).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">6. Cookies and Optional Tools</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Essential storage keeps you signed in and the site working. Optional analytics and live chat run only if you choose “Allow” in our consent banner; you can choose “Reject optional tools”. See the Cookie Policy for details.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">7. Your Rights</h2>
                        <p className="text-gray-600 leading-relaxed">
                            You can ask to access, correct or delete your data, to restrict or object to its use, and to receive a copy of it. To delete your account, email privacy@estospaces.com. In India you can also nominate someone to exercise your rights, and raise a grievance with us at privacy@estospaces.com. In the UK you can complain to the Information Commissioner’s Office (ico.org.uk). Estospaces is not intended for anyone under 18.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">8. Contact Us</h2>
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

