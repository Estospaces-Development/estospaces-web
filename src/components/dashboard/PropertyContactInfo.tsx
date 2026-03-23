'use client';

import { useState } from 'react';
import { Mail, Phone, Building, MapPin, Calendar, MessageCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { messagesService } from '@/services/messagesService';
import { getPrimaryPropertyImage } from '@/lib/propertyImages';

interface Property {
    id: string;
    title?: string;
    manager_id?: string;
    agent_name?: string;
    agent_company?: string;
    agent_phone?: string;
    agent_email?: string;
    image_urls?: string[] | string;
    price?: number;
    listing_type?: string;
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
    const { success: showToastSuccess, error: showToastError } = useToast();
    const [showContactForm, setShowContactForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [contactForm, setContactForm] = useState({
        name: '',
        email: '',
        phone: '',
        message: '',
    });

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!property?.manager_id) {
            showToastError('Agent contact information is incomplete.');
            return;
        }

        setIsSubmitting(true);
        try {
            const messageContent = `
Inquiry regarding: ${property.address_line_1}, ${property.city}
From: ${contactForm.name} (${contactForm.email})
Phone: ${contactForm.phone || 'Not provided'}

Message:
${contactForm.message}
            `.trim();

            await messagesService.sendMessage({
                recipientId: property.manager_id,
                content: messageContent,
                context: {
                    propertyId: property.id,
                    propertyTitle: property.title,
                    propertyAddress: [property.address_line_1, property.city, property.postcode].filter(Boolean).join(', '),
                    propertyImage: getPrimaryPropertyImage(property) || undefined,
                    listingType: property.listing_type,
                    propertyPrice: property.price,
                    senderName: contactForm.name,
                    senderEmail: contactForm.email,
                    senderPhone: contactForm.phone,
                    recipientName: property.agent_name,
                    recipientEmail: property.agent_email,
                    recipientPhone: property.agent_phone,
                    recipientAgency: property.agent_company,
                },
            });

            showToastSuccess('Your message has been sent to the agent.');
            setShowContactForm(false);
            setContactForm({ name: '', email: '', phone: '', message: '' });
        } catch (err: any) {
            showToastError('Failed to send message. Please try again later.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!property) return null;

    return (
        <div className="rounded-[2rem] border border-stone-200/80 bg-white/92 p-6 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.4)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/92">
            <div className="flex items-start justify-between gap-4">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Direct contact</p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                        Contact agent
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                        Need clarification before booking? Send a direct note and keep the conversation attached to this property.
                    </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
                    <MessageCircle size={20} />
                </div>
            </div>

            {property.agent_name && (
                <div className="mt-6 space-y-3">
                    <div className="rounded-[1.45rem] border border-stone-200/80 bg-stone-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950">
                        <div className="flex items-start gap-3">
                            <Building className="mt-1 text-orange-500" size={18} />
                            <div>
                                <p className="font-medium text-gray-900 dark:text-gray-100">
                                    {property.agent_company || 'Real Estate Agent'}
                                </p>
                                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{property.agent_name}</p>
                            </div>
                        </div>
                    </div>

                    {property.agent_phone && (
                        <a
                            href={`tel:${property.agent_phone}`}
                            className="flex items-center gap-3 rounded-[1.45rem] border border-stone-200/80 bg-white px-4 py-4 text-gray-700 transition hover:border-orange-300 hover:bg-orange-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-300 dark:hover:border-orange-800 dark:hover:bg-zinc-950"
                        >
                            <Phone className="text-orange-500" size={18} />
                            <span>{property.agent_phone}</span>
                        </a>
                    )}

                    {property.agent_email && (
                        <a
                            href={`mailto:${property.agent_email}`}
                            className="flex items-center gap-3 rounded-[1.45rem] border border-stone-200/80 bg-white px-4 py-4 text-gray-700 transition hover:border-orange-300 hover:bg-orange-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-300 dark:hover:border-orange-800 dark:hover:bg-zinc-950"
                        >
                            <Mail className="text-orange-500" size={18} />
                            <span className="truncate">{property.agent_email}</span>
                        </a>
                    )}

                    {property.address_line_1 && (
                        <div className="flex items-start gap-3 rounded-[1.45rem] border border-stone-200/80 bg-white px-4 py-4 text-gray-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-300">
                            <MapPin className="mt-1 text-orange-500" size={18} />
                            <div className="text-sm leading-6">
                                <p>{property.address_line_1}</p>
                                {property.address_line_2 && <p>{property.address_line_2}</p>}
                                <p>{property.city}, {property.postcode}</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {property.viewing_available && (
                <div className="mt-6 rounded-[1.45rem] border border-blue-200 bg-blue-50 px-4 py-4 dark:border-blue-900/40 dark:bg-blue-950/20">
                    <div className="flex items-center gap-2">
                        <Calendar className="text-blue-600 dark:text-blue-400" size={18} />
                        <p className="font-medium text-blue-900 dark:text-blue-100">Viewing available</p>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-blue-700 dark:text-blue-300">
                        {property.viewing_instructions || 'Contact the agent to arrange a viewing.'}
                    </p>
                </div>
            )}

            <div className="mt-6">
                {!showContactForm ? (
                    <button
                        onClick={() => setShowContactForm(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-[1.35rem] bg-orange-500 px-4 py-4 font-semibold text-white transition hover:bg-orange-600"
                    >
                        <MessageCircle size={18} />
                        Send Message to Agent
                    </button>
                ) : (
                    <form onSubmit={handleContactSubmit} className="space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Your Name *
                            </label>
                            <input
                                type="text"
                                required
                                value={contactForm.name}
                                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                className="w-full rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3 text-gray-900 outline-none transition focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-gray-100"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Your Email *
                            </label>
                            <input
                                type="email"
                                required
                                value={contactForm.email}
                                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                className="w-full rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3 text-gray-900 outline-none transition focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-gray-100"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Your Phone
                            </label>
                            <input
                                type="tel"
                                value={contactForm.phone}
                                onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                                className="w-full rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3 text-gray-900 outline-none transition focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-gray-100"
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Message *
                            </label>
                            <textarea
                                required
                                rows={4}
                                value={contactForm.message}
                                onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                                placeholder="I’d like to know more about this property..."
                                className="w-full rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3 text-gray-900 outline-none transition focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-gray-100"
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="flex flex-1 items-center justify-center gap-2 rounded-[1rem] bg-orange-500 px-4 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
                            >
                                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                                Send Message
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowContactForm(false)}
                                className="rounded-[1rem] border border-stone-200 px-4 py-3 font-medium text-gray-700 transition hover:bg-stone-50 dark:border-zinc-700 dark:text-gray-300 dark:hover:bg-zinc-950"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default PropertyContactInfo;
