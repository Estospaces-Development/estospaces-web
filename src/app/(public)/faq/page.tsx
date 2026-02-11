'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, HelpCircle, ChevronDown, ChevronUp, Search, Home, User, CreditCard, FileText, Shield } from 'lucide-react';

export default function FAQPage() {
    const router = useRouter();

    const [searchQuery, setSearchQuery] = useState('');
    const [openItems, setOpenItems] = useState<Record<number, boolean>>({});
    const [activeCategory, setActiveCategory] = useState('all');

    const handleBack = () => {
        if (window.history.length > 1) {
            router.back();
        } else {
            router.push('/');
        }
    };

    const categories = [
        { id: 'all', label: 'All Topics', icon: HelpCircle },
        { id: 'properties', label: 'Properties', icon: Home },
        { id: 'account', label: 'Account', icon: User },
        { id: 'payments', label: 'Payments', icon: CreditCard },
        { id: 'applications', label: 'Applications', icon: FileText },
        { id: 'security', label: 'Security', icon: Shield },
    ];

    const faqs = [
        { id: 1, category: 'properties', question: 'How do I search for properties on Estospaces?', answer: 'You can search for properties using our search bar on the homepage or dashboard. Enter a location, postcode, or area name and use filters like price range, number of bedrooms, property type, and more to refine your results. You can also save your searches to get notified when new matching properties are listed.' },
        { id: 2, category: 'properties', question: 'How do I save properties to view later?', answer: 'When viewing any property listing, click the heart icon to save it to your favourites. You can access all your saved properties from the "Saved" section in your dashboard. This feature requires you to be logged in to your account.' },
        { id: 3, category: 'properties', question: 'Can I schedule a property viewing?', answer: 'Yes! On any property listing page, you can request a viewing by clicking the "Book Viewing" button. You can select your preferred date and time, and the agent or landlord will confirm the appointment. You\'ll receive notifications about your viewing status in your dashboard.' },
        { id: 4, category: 'account', question: 'How do I create an account?', answer: 'Click "Sign Up" on the homepage and enter your email address. You can also sign up using your Google account for faster registration. Once registered, you can complete your profile with additional information to improve your property applications.' },
        { id: 5, category: 'account', question: 'How do I reset my password?', answer: 'Click "Sign In" and then "Forgot Password". Enter your registered email address and we\'ll send you a link to reset your password. The link expires after 24 hours for security reasons. If you don\'t receive the email, check your spam folder.' },
        { id: 6, category: 'account', question: 'How do I verify my identity?', answer: 'Go to your Profile page and look for the Verification section. You\'ll need to upload a valid ID document (passport, driving licence, or BRP) and proof of address (utility bill or bank statement from the last 3 months). Verification typically takes 1-2 business days.' },
        { id: 7, category: 'applications', question: 'How do I apply for a rental property?', answer: 'When you find a property you\'re interested in, click "Apply Now" on the listing page. You\'ll need to fill out an application form with your personal details, employment information, and references. Having a verified profile speeds up the application process.' },
        { id: 8, category: 'applications', question: 'What documents do I need for a rental application?', answer: 'Typically, you\'ll need: proof of identity (passport or driving licence), proof of income (payslips or employment letter), proof of address, bank statements from the last 3 months, and references from previous landlords. Requirements may vary by property.' },
        { id: 9, category: 'applications', question: 'How long does the application process take?', answer: 'Application review times vary by landlord/agent, but most applications are processed within 2-5 business days. You can track your application status in real-time through your dashboard. We\'ll notify you of any updates or if additional documents are required.' },
        { id: 10, category: 'payments', question: 'What payment methods do you accept?', answer: 'We accept all major credit and debit cards, bank transfers, and some digital payment methods. For recurring rent payments, you can set up direct debit through our secure payment portal. All transactions are encrypted and PCI-compliant.' },
        { id: 11, category: 'payments', question: 'How do I pay my rent through Estospaces?', answer: 'If your landlord uses our payment system, you can pay rent directly through your dashboard. Go to "Payments", select the property, and choose your payment method. You can set up one-time payments or recurring automatic payments.' },
        { id: 12, category: 'payments', question: 'Are my payment details secure?', answer: 'Absolutely. We use bank-level encryption and never store your full card details on our servers. All payments are processed through secure, PCI-DSS compliant payment providers. We also offer two-factor authentication for added security.' },
        { id: 13, category: 'security', question: 'How is my personal data protected?', answer: 'We take data protection seriously. Your data is encrypted in transit and at rest, we follow GDPR guidelines, and we never sell your personal information to third parties. You can read our full Privacy Policy for detailed information about how we handle your data.' },
        { id: 14, category: 'security', question: 'What should I do if I suspect fraudulent activity?', answer: 'If you notice any suspicious activity on your account or receive suspicious messages, contact us immediately at security@estospaces.com. Never share your password or verification codes with anyone. We will never ask for your password via email or phone.' },
        { id: 15, category: 'properties', question: 'How do I list my property on Estospaces?', answer: 'To list a property, you need to register as a property manager or landlord. Once approved, you can access the manager dashboard to add your property details, upload photos, set pricing, and publish your listing. Our team reviews listings within 24 hours.' },
    ];

    const toggleItem = (id: number) => {
        setOpenItems(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const filteredFaqs = faqs.filter(faq => {
        const matchesCategory = activeCategory === 'all' || faq.category === activeCategory;
        const matchesSearch = searchQuery === '' ||
            faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
                    <button
                        onClick={handleBack}
                        className="flex items-center gap-2 text-gray-600 hover:text-orange-500 transition-colors"
                    >
                        <ArrowLeft size={20} />
                        <span className="text-sm font-medium">Back</span>
                    </button>
                </div>
            </header>

            {/* Content */}
            <main className="max-w-5xl mx-auto px-4 py-12">
                {/* Title */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                        <HelpCircle className="text-orange-500" size={32} />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Find answers to common questions about using Estospaces. Can&apos;t find what you&apos;re looking for?{' '}
                        <Link href="/contact" className="text-orange-500 hover:underline">Contact us</Link>.
                    </p>
                </div>

                {/* Search */}
                <div className="relative max-w-xl mx-auto mb-8">
                    <Search size={20} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search for answers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                </div>

                {/* Category Tabs */}
                <div className="flex flex-wrap justify-center gap-2 mb-8">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveCategory(cat.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${activeCategory === cat.id
                                    ? 'bg-orange-500 text-white shadow-sm'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300'
                                }`}
                        >
                            <cat.icon size={16} />
                            {cat.label}
                        </button>
                    ))}
                </div>

                {/* FAQ List */}
                <div className="space-y-3">
                    {filteredFaqs.length === 0 ? (
                        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                            <HelpCircle size={48} className="mx-auto text-gray-300 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                            <p className="text-gray-500">Try adjusting your search or category filter</p>
                        </div>
                    ) : (
                        filteredFaqs.map(faq => (
                            <div
                                key={faq.id}
                                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-sm transition-shadow"
                            >
                                <button
                                    onClick={() => toggleItem(faq.id)}
                                    className="w-full flex items-center justify-between p-5 text-left"
                                >
                                    <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                                    {openItems[faq.id] ? (
                                        <ChevronUp size={20} className="text-orange-500 flex-shrink-0" />
                                    ) : (
                                        <ChevronDown size={20} className="text-gray-400 flex-shrink-0" />
                                    )}
                                </button>
                                {openItems[faq.id] && (
                                    <div className="px-5 pb-5">
                                        <div className="pt-3 border-t border-gray-100">
                                            <p className="text-gray-600 leading-relaxed">{faq.answer}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>

                {/* Contact CTA */}
                <div className="mt-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-8 text-center text-white">
                    <h3 className="text-xl font-semibold mb-2">Still have questions?</h3>
                    <p className="mb-6 opacity-90">Our support team is here to help you</p>
                    <Link
                        href="/contact"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-white text-orange-500 font-medium rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        Contact Support
                    </Link>
                </div>
            </main>
        </div>
    );
}
