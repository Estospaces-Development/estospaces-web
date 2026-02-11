"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HelpCircle, MessageSquare, Book, Mail, Send, X, CheckCircle, Clock, Loader2, ArrowLeft, ChevronRight, Search, FileText } from 'lucide-react';

export default function HelpPage() {
    const router = useRouter();
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        setTimeout(() => {
            setSubmitting(false);
            setSubmitted(true);
        }, 1500);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-10">
                    <button
                        onClick={() => router.push('/user/dashboard')}
                        className="mb-6 flex items-center gap-2 text-gray-400 hover:text-orange-500 transition-all group"
                    >
                        <div className="p-2 rounded-xl group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20 transition-all">
                            <ArrowLeft size={18} />
                        </div>
                        <span className="font-bold text-sm">Dashboard</span>
                    </button>

                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-3">
                        Support Center
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium max-w-xl">
                        We're here to help you. Find answers to your questions or reach out to our team directly.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Left Column: Quick Actions & FAQs */}
                    <div className="lg:col-span-7 space-y-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                                { title: 'Guides & Docs', icon: Book, color: 'text-blue-500 bg-blue-50' },
                                { title: 'Live Chat', icon: MessageSquare, color: 'text-green-500 bg-green-50' },
                            ].map((act) => (
                                <button key={act.title} className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border dark:border-gray-700 flex flex-col items-center text-center group hover:scale-[1.05] transition-all">
                                    <div className={`p-5 rounded-2xl mb-6 ${act.color} dark:bg-gray-700 dark:text-white group-hover:bg-orange-500 group-hover:text-white transition-all`}>
                                        <act.icon size={32} />
                                    </div>
                                    <h4 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-2">{act.title}</h4>
                                    <p className="text-sm text-gray-400 font-medium">Browse our detailed articles</p>
                                </button>
                            ))}
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-xl border dark:border-gray-700 p-10">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-8 tracking-tight">Common Questions</h2>
                            <div className="space-y-6">
                                {[
                                    'How do I cancel my viewing?',
                                    'Can I update my profile details after verification?',
                                    'How secure is the digital contract signing?',
                                    'What documents are needed for registration?'
                                ].map((q) => (
                                    <button key={q} className="w-full text-left p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-900 transition-all group">
                                        <span className="font-bold text-gray-700 dark:text-gray-300 group-hover:text-orange-500 transition-colors">{q}</span>
                                        <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-gray-400 group-hover:text-orange-500">
                                            <ChevronRight size={18} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Contact Us Form */}
                    <div className="lg:col-span-5">
                        <div className="bg-gray-900 dark:bg-white rounded-[2.5rem] p-10 shadow-2xl sticky top-8">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="p-3 bg-orange-500 rounded-2xl text-white">
                                    <Mail size={24} />
                                </div>
                                <h2 className="text-2xl font-black text-white dark:text-gray-900 tracking-tight">Open a Ticket</h2>
                            </div>

                            {submitted ? (
                                <div className="py-10 text-center animate-in fade-in zoom-in">
                                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle size={40} className="text-green-500" />
                                    </div>
                                    <h3 className="text-2xl font-black text-white dark:text-gray-900 mb-2">Message Sent!</h3>
                                    <p className="text-gray-400 dark:text-gray-500 font-bold mb-10">Our team will get back to you within 24 hours.</p>
                                    <button
                                        onClick={() => setSubmitted(false)}
                                        className="w-full py-4 bg-white/10 dark:bg-gray-100 text-white dark:text-gray-900 rounded-2xl font-black border border-white/20 dark:border-gray-200 transition-all active:scale-95"
                                    >
                                        Send Another
                                    </button>
                                </div>
                            ) : (
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 px-1">Reason</label>
                                        <select className="w-full bg-white/5 dark:bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-2xl px-6 py-4 outline-none font-bold text-white dark:text-gray-900 appearance-none shadow-sm">
                                            <option>General Inquiry</option>
                                            <option>Technical Problem</option>
                                            <option>Billing Issue</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 px-1">Subject</label>
                                        <input
                                            type="text"
                                            placeholder="What's it about?"
                                            required
                                            className="w-full bg-white/5 dark:bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-2xl px-6 py-4 outline-none font-bold text-white dark:text-gray-900 shadow-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500 px-1">Your Message</label>
                                        <textarea
                                            rows={4}
                                            placeholder="Give us more details..."
                                            required
                                            className="w-full bg-white/5 dark:bg-gray-50 border-2 border-transparent focus:border-orange-500 rounded-2xl px-6 py-6 outline-none font-bold text-white dark:text-gray-900 shadow-sm resize-none"
                                        ></textarea>
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full py-5 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-800 text-white font-black rounded-2xl shadow-xl shadow-orange-500/30 transition-all flex items-center justify-center gap-3 active:scale-95"
                                    >
                                        {submitting ? <Loader2 className="animate-spin" /> : <Send size={24} />}
                                        <span>{submitting ? 'Sending...' : 'Send Message'}</span>
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
