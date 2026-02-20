'use client';

import { useState } from 'react';
import { Mail, Phone, Building, MapPin, Calendar, MessageCircle } from 'lucide-react';

interface Property {
    agent_name?: string;
    agent_company?: string;
    agent_phone?: string;
    agent_email?: string;
    address_line_1?: string;
    address_line_2?: string;
    city?: string;
    postcode?: string;
    viewing_available?: boolean;
    viewing_instructions?: string;
}

interface PropertyContactInfoProps {
    property: Property | null;
}

const PropertyContactInfo = ({ property }: PropertyContactInfoProps) => {
    const [showContactForm, setShowContactForm] = useState(false);
    const [contactForm, setContactForm] = useState({
        name: '',
        email: '',
        phone: '',
        message: '',
    });

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // TODO: Send contact form to agent/backend
        alert('Contact request sent! The agent will get back to you soon.');
        setShowContactForm(false);
        setContactForm({ name: '', email: '', phone: '', message: '' });
    };

    if (!property) return null;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Contact Agent
            </h3>

            {property.agent_name && (
                <div className="space-y-4 mb-6">
                    <div className="flex items-start gap-3">
                        <Building className="text-orange-500 mt-1" size={20} />
                        <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                                {property.agent_company || 'Real Estate Agent'}
                            </p>
                            <p className="text-gray-600 dark:text-gray-400">{property.agent_name}</p>
                        </div>
                    </div>

                    {property.agent_phone && (
                        <div className="flex items-center gap-3">
                            <Phone className="text-orange-500" size={20} />
                            <a
                                href={`tel:${property.agent_phone}`}
                                className="text-gray-700 dark:text-gray-300 hover:text-orange-500 transition-colors"
                            >
                                {property.agent_phone}
                            </a>
                        </div>
                    )}

                    {property.agent_email && (
                        <div className="flex items-center gap-3">
                            <Mail className="text-orange-500" size={20} />
                            <a
                                href={`mailto:${property.agent_email}`}
                                className="text-gray-700 dark:text-gray-300 hover:text-orange-500 transition-colors"
                            >
                                {property.agent_email}
                            </a>
                        </div>
                    )}

                    {property.address_line_1 && (
                        <div className="flex items-start gap-3">
                            <MapPin className="text-orange-500 mt-1" size={20} />
                            <div className="text-gray-700 dark:text-gray-300">
                                <p>{property.address_line_1}</p>
                                {property.address_line_2 && <p>{property.address_line_2}</p>}
                                <p>{property.city}, {property.postcode}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {property.viewing_available && (
                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                        <Calendar className="text-blue-600 dark:text-blue-400" size={20} />
                        <p className="font-medium text-blue-900 dark:text-blue-100">Viewing Available</p>
                    </div>
                    {property.viewing_instructions ? (
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            {property.viewing_instructions}
                        </p>
                    ) : (
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                            Contact the agent to arrange a viewing
                        </p>
                    )}
                </div>
            )}

            {!showContactForm ? (
                <button
                    onClick={() => setShowContactForm(true)}
                    className="w-full px-4 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <MessageCircle size={20} />
                    Send Message to Agent
                </button>
            ) : (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Your Name *
                        </label>
                        <input
                            type="text"
                            required
                            value={contactForm.name}
                            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Your Email *
                        </label>
                        <input
                            type="email"
                            required
                            value={contactForm.email}
                            onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Your Phone
                        </label>
                        <input
                            type="tel"
                            value={contactForm.phone}
                            onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Message *
                        </label>
                        <textarea
                            required
                            rows={4}
                            value={contactForm.message}
                            onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                            placeholder="I'm interested in this property..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                        >
                            Send Message
                        </button>
                        <button
                            type="button"
                            onClick={() => setShowContactForm(false)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

export default PropertyContactInfo;
