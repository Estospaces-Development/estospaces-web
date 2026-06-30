"use client";

import { Link, useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, Mail } from 'lucide-react';
import TermsDocument, { TERMS_LAST_UPDATED } from '@/components/legal/TermsDocument';

export default function TermsPage() {
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
                    <p className="text-gray-500">Last updated: {TERMS_LAST_UPDATED}</p>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 md:p-12 space-y-8">
                    <TermsDocument />
                    <section>
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">11. Contact Us</h2>
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

