'use client';

import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, UserX } from 'lucide-react';

/**
 * Public account-deletion page (Google Play requires one for apps with
 * accounts). Mirrors the Privacy Policy: deletion is a request handled by
 * the team, from the app (Your data · Delete account) or by email.
 */
export default function AccountDeletionPage() {
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
                        <UserX className="text-orange-500" size={32} />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Delete your Estospaces account</h1>
                    <p className="text-gray-500">For the Estospaces app on Android and iPhone, and estospaces.com</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">1. In the app</h2>
                        <ol className="list-decimal list-inside text-gray-600 space-y-2 ml-4">
                            <li>Sign in to the Estospaces app.</li>
                            <li>Open <strong>Profile</strong> (property managers: <strong>Menu</strong>).</li>
                            <li>Tap <strong>Your data · Delete account</strong>.</li>
                            <li>Tap <strong>Send deletion request</strong> and confirm.</li>
                        </ol>
                        <p className="text-gray-600 leading-relaxed mt-4">
                            Your request goes to our team, and you can follow it under Support in the app.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">2. Without the app</h2>
                        <p className="text-gray-600 leading-relaxed mb-4">
                            Email us from the address on your account, with the subject “Account deletion request”:
                        </p>
                        <div className="flex items-center gap-2 text-orange-500">
                            <Mail size={18} />
                            <a href="mailto:privacy@estospaces.com?subject=Account%20deletion%20request" className="hover:underline">
                                privacy@estospaces.com
                            </a>
                        </div>
                        <p className="text-gray-600 leading-relaxed mt-4">
                            We may ask you to confirm the request, so that nobody else can delete your account.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">3. What we delete</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Your account and the personal data linked to it: your profile and contact details, verification documents, saved homes and searches, enquiries, viewings, applications and messages.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">4. What we may keep, and why</h2>
                        <p className="text-gray-600 leading-relaxed">
                            Some records must be kept for a period after deletion, only as long as the law requires: payment and tax records, signed contracts, and records we need to prevent fraud or meet a legal obligation. When we confirm your deletion by email, we tell you if any records are kept, why, and for how long.
                        </p>
                    </section>
                </div>

                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>
                        See also:{' '}
                        <Link to="/privacy" className="text-orange-500 hover:underline">Privacy Policy</Link>
                        {' | '}
                        <Link to="/terms" className="text-orange-500 hover:underline">Terms &amp; Conditions</Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
