'use client';

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Send, CheckCircle, Clock, MessageSquare } from 'lucide-react';

export default function ContactPage() {
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleBack = () => {
        if (window.history.length > 1) {
            navigate(-1);
        } else {
            navigate('/');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setIsSubmitting(false);
        setIsSubmitted(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
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
            <main className="max-w-6xl mx-auto px-4 py-12">
                {/* Title Section */}
                <div className="text-center mb-12">
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Get in Touch</h1>
                    <p className="text-gray-600 max-w-2xl mx-auto">
                        Have a question or need assistance? We&apos;re here to help. Reach out to us and we&apos;ll respond as soon as possible.
                    </p>
                </div>

                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Contact Info Cards */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-orange-100 rounded-lg">
                                    <Mail className="text-orange-500" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-1">Email Us</h3>
                                    <p className="text-sm text-gray-500 mb-2">For general enquiries</p>
                                    <a href="mailto:hello@estospaces.com" className="text-orange-500 hover:underline text-sm">
                                        hello@estospaces.com
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-green-100 rounded-lg">
                                    <Phone className="text-green-500" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-1">Call Us</h3>
                                    <p className="text-sm text-gray-500 mb-2">Mon-Fri, 9am-6pm GMT</p>
                                    <a href="tel:+442012345678" className="text-orange-500 hover:underline text-sm">
                                        +44 20 1234 5678
                                    </a>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-blue-100 rounded-lg">
                                    <MapPin className="text-blue-500" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-1">Visit Us</h3>
                                    <p className="text-sm text-gray-500 mb-2">Our office location</p>
                                    <p className="text-sm text-gray-700">
                                        123 Property Street<br />
                                        London, EC1A 1BB<br />
                                        United Kingdom
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-purple-100 rounded-lg">
                                    <Clock className="text-purple-500" size={24} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-1">Response Time</h3>
                                    <p className="text-sm text-gray-500 mb-2">Average response</p>
                                    <p className="text-sm text-gray-700">
                                        Within 24 hours on business days
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Form */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl border border-gray-200 p-8">
                            {isSubmitted ? (
                                <div className="text-center py-12">
                                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                                        <CheckCircle className="text-green-500" size={32} />
                                    </div>
                                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Message Sent!</h3>
                                    <p className="text-gray-600 mb-6">
                                        Thank you for contacting us. We&apos;ll get back to you within 24 hours.
                                    </p>
                                    <button
                                        onClick={() => setIsSubmitted(false)}
                                        className="text-orange-500 hover:underline font-medium"
                                    >
                                        Send another message
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-3 mb-6">
                                        <MessageSquare className="text-orange-500" size={24} />
                                        <h2 className="text-xl font-semibold text-gray-900">Send us a Message</h2>
                                    </div>

                                    <form onSubmit={handleSubmit} className="space-y-5">
                                        <div className="grid md:grid-cols-2 gap-5">
                                            <div>
                                                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                                                    Your Name *
                                                </label>
                                                <input
                                                    type="text"
                                                    id="name"
                                                    name="name"
                                                    value={formData.name}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                                    placeholder="John Smith"
                                                />
                                            </div>
                                            <div>
                                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                                                    Email Address *
                                                </label>
                                                <input
                                                    type="email"
                                                    id="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                                    placeholder="john@example.com"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1.5">
                                                Subject *
                                            </label>
                                            <select
                                                id="subject"
                                                name="subject"
                                                value={formData.subject}
                                                onChange={handleChange}
                                                required
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                            >
                                                <option value="">Select a topic</option>
                                                <option value="general">General Enquiry</option>
                                                <option value="property">Property Listing Question</option>
                                                <option value="account">Account Support</option>
                                                <option value="payment">Payment Issue</option>
                                                <option value="feedback">Feedback &amp; Suggestions</option>
                                                <option value="partnership">Business Partnership</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1.5">
                                                Your Message *
                                            </label>
                                            <textarea
                                                id="message"
                                                name="message"
                                                value={formData.message}
                                                onChange={handleChange}
                                                required
                                                rows={5}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all resize-none"
                                                placeholder="How can we help you?"
                                            />
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white font-medium rounded-lg transition-colors"
                                        >
                                            {isSubmitting ? (
                                                <>
                                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    <span>Sending...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <Send size={18} />
                                                    <span>Send Message</span>
                                                </>
                                            )}
                                        </button>
                                    </form>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

