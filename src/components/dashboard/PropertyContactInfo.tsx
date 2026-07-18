'use client';

import { useEffect, useMemo, useState } from 'react';
import { Mail, Phone, Building, MapPin, Calendar, MessageCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { messagesService } from '@/services/messagesService';
import { getPrimaryPropertyImage } from '@/lib/propertyImages';
import { normalizeContactAgentPhone, validateContactAgentPhone } from '@/lib/contactAgentFormValidation';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/contexts/AuthContext';

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
    propertyAddress?: string | null;
}

export const getPropertyContactAddress = (
    property: Property | null | undefined,
    propertyAddress?: string | null,
) => {
    const providedAddress = typeof propertyAddress === 'string' ? propertyAddress.trim() : '';
    if (providedAddress) {
        return providedAddress;
    }

    return [
        property?.address_line_1,
        property?.address_line_2,
        property?.city,
        property?.postcode,
    ]
        .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
        .map((part) => part.trim())
        .join(', ');
};

const PropertyContactInfo = ({ property, propertyAddress }: PropertyContactInfoProps) => {
    const { success: showToastSuccess, error: showToastError } = useToast();
    const { user } = useAuth();
    const [showContactForm, setShowContactForm] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [contactForm, setContactForm] = useState({
        name: '',
        email: '',
        phone: '',
        message: '',
    });
    const [contactErrors, setContactErrors] = useState({
        phone: '',
    });
    const defaultContactForm = useMemo(() => ({
        name: user?.user_metadata?.full_name || user?.name || '',
        email: user?.email || '',
        phone: user?.phone || user?.user_metadata?.phone || '',
        message: '',
    }), [user]);
    const contactAddress = useMemo(
        () => getPropertyContactAddress(property, propertyAddress),
        [property, propertyAddress],
    );

    useEffect(() => {
        if (!showContactForm) {
            return;
        }

        setContactForm((current) => ({
            ...current,
            name: current.name || defaultContactForm.name,
            email: current.email || defaultContactForm.email,
            phone: current.phone || defaultContactForm.phone,
        }));
    }, [defaultContactForm, showContactForm]);

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!property?.manager_id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(property.manager_id)) {
            showToastError('Agent contact information is incomplete.');
            return;
        }

        const phoneError = validateContactAgentPhone(contactForm.phone);
        if (phoneError) {
            setContactErrors({ phone: phoneError });
            showToastError(phoneError);
            return;
        }

        const normalizedPhone = normalizeContactAgentPhone(contactForm.phone);
        setIsSubmitting(true);
        try {
            const messageContent = `
Inquiry regarding: ${contactAddress || property.title || 'this property'}
From: ${contactForm.name} (${contactForm.email})
Phone: ${normalizedPhone || 'Not provided'}

Message:
${contactForm.message}
            `.trim();

            await messagesService.sendMessage({
                recipientId: property.manager_id,
                content: messageContent,
                context: {
                    propertyId: property.id,
                    propertyTitle: property.title,
                    propertyAddress: contactAddress,
                    propertyImage: getPrimaryPropertyImage(property) || undefined,
                    listingType: property.listing_type,
                    propertyPrice: property.price,
                    senderName: contactForm.name,
                    senderEmail: contactForm.email,
                    senderPhone: normalizedPhone,
                    recipientName: property.agent_name,
                    recipientEmail: property.agent_email,
                    recipientPhone: property.agent_phone,
                    recipientAgency: property.agent_company,
                },
            });

            showToastSuccess('Your message has been sent to the agent.');
            setShowContactForm(false);
            setContactErrors({ phone: '' });
            setContactForm(defaultContactForm);
        } catch (err: any) {
            const message = err?.message || 'Failed to send message. Please try again later.';
            showToastError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!property) return null;

    return (
        <div className="flex h-full flex-col rounded-[2rem] border border-stone-200/80 bg-white/92 p-6 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.4)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/92">
            <div className="flex items-start gap-4">
                <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
                    <MessageCircle size={20} />
                </div>
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Direct contact</p>
                    <h3 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                        Contact agent
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                        Need clarification before booking? Send a direct note and keep the conversation attached to this property.
                    </p>
                </div>
            </div>

            {property.agent_name && (
                <div className="mt-6 space-y-3">
                    <div className="min-h-[5.5rem] rounded-[1.45rem] border border-stone-200/80 bg-stone-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950">
                        <div className="flex items-start gap-3">
                            <Avatar
                                userId={property.manager_id}
                                name={property.agent_name || property.agent_company || 'Agent'}
                                size="md"
                                shape="rounded"
                                fallbackClassName="from-orange-500 to-orange-600"
                            />
                            <div className="min-w-0">
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
                            className="flex min-h-[4.5rem] items-center gap-3 rounded-[1.45rem] border border-stone-200/80 bg-white px-4 py-4 text-gray-700 transition hover:border-orange-300 hover:bg-orange-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-300 dark:hover:border-orange-800 dark:hover:bg-zinc-950"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-950/40 dark:text-orange-200">
                                <Phone size={18} />
                            </div>
                            <span>{property.agent_phone}</span>
                        </a>
                    )}

                    {property.agent_email && (
                        <a
                            href={`mailto:${property.agent_email}`}
                            className="flex min-h-[4.5rem] items-center gap-3 rounded-[1.45rem] border border-stone-200/80 bg-white px-4 py-4 text-gray-700 transition hover:border-orange-300 hover:bg-orange-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-300 dark:hover:border-orange-800 dark:hover:bg-zinc-950"
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-950/40 dark:text-orange-200">
                                <Mail size={18} />
                            </div>
                            <span className="min-w-0 flex-1 truncate">{property.agent_email}</span>
                        </a>
                    )}

                    {contactAddress && (
                        <div className="flex min-h-[5.5rem] items-start gap-3 rounded-[1.45rem] border border-stone-200/80 bg-white px-4 py-4 text-gray-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-300">
                            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 dark:bg-orange-950/40 dark:text-orange-200">
                                <MapPin size={18} />
                            </div>
                            <div className="min-w-0 text-sm leading-6">
                                <p>{contactAddress}</p>
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
                                id="contact-agent-phone"
                                type="tel"
                                inputMode="tel"
                                autoComplete="tel"
                                maxLength={25}
                                value={contactForm.phone}
                                onChange={(e) => {
                                    const phone = e.target.value;
                                    setContactForm({ ...contactForm, phone });
                                    if (contactErrors.phone) {
                                        setContactErrors({ phone: validateContactAgentPhone(phone) || '' });
                                    }
                                }}
                                aria-invalid={Boolean(contactErrors.phone)}
                                aria-describedby={contactErrors.phone ? 'contact-agent-phone-error' : 'contact-agent-phone-help'}
                                className="w-full rounded-[1rem] border border-stone-200 bg-stone-50 px-4 py-3 text-gray-900 outline-none transition focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-gray-100"
                            />
                            {contactErrors.phone ? (
                                <p id="contact-agent-phone-error" role="alert" className="mt-2 text-xs text-red-500">
                                    {contactErrors.phone}
                                </p>
                            ) : (
                                <p id="contact-agent-phone-help" className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    Use digits with optional +, spaces, hyphens, or brackets.
                                </p>
                            )}
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
                                placeholder="I'd like to know more about this property..."
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
                                onClick={() => {
                                    setShowContactForm(false);
                                    setContactForm(defaultContactForm);
                                    setContactErrors({ phone: '' });
                                }}
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
