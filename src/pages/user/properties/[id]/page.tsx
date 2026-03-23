'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    MapPin,
    Bed,
    Bath,
    Maximize,
    Loader2,
    Home,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ImageIcon,
    MessageCircle,
    Clock,
    Sparkles,
} from 'lucide-react';
import { getPropertyById, Property } from '../../../../services/propertyService';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { createLead } from '@/services/leadsService';
import { createFastTrackCase } from '@/services/fastTrackService';
import { bookingsService } from '@/services/bookingsService';
import { messagesService } from '@/services/messagesService';
import PropertyContactInfo from '@/components/dashboard/PropertyContactInfo';
import { PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/placeholders';
import { getPropertyImages } from '@/lib/propertyImages';

const VIEWING_TIME_SLOTS = [
    { value: '09:00', label: '09:00', hint: 'Early morning' },
    { value: '10:30', label: '10:30', hint: 'Late morning' },
    { value: '12:00', label: '12:00', hint: 'Midday' },
    { value: '14:00', label: '14:00', hint: 'Afternoon' },
    { value: '16:00', label: '16:00', hint: 'Late afternoon' },
    { value: '18:00', label: '18:00', hint: 'Evening' },
];
const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LABEL_FORMATTER = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' });

const toDateValue = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');

    return `${year}-${month}-${day}`;
};

const isSameMonth = (left: Date, right: Date) =>
    left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();

const buildCalendarDays = (month: Date, minimumDateValue: string) => {
    const firstOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthGridOffset = (firstOfMonth.getDay() + 6) % 7;
    const gridStart = new Date(firstOfMonth);
    gridStart.setDate(firstOfMonth.getDate() - monthGridOffset);
    const minimumDate = minimumDateValue ? new Date(`${minimumDateValue}T00:00:00`) : null;
    const todayValue = toDateValue(new Date());

    return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(gridStart);
        date.setDate(gridStart.getDate() + index);
        const value = toDateValue(date);

        return {
            value,
            dayNumber: date.getDate(),
            isCurrentMonth: isSameMonth(date, month),
            isToday: value === todayValue,
            isDisabled: minimumDate ? date < minimumDate : false,
        };
    });
};

const formatPreviewDate = (dateValue: string) => {
    if (!dateValue) {
        return 'Choose a day';
    }

    const parsed = new Date(`${dateValue}T12:00:00`);
    if (Number.isNaN(parsed.getTime())) {
        return 'Choose a day';
    }

    return parsed.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
    });
};

const formatPreviewTime = (timeValue: string) => {
    if (!timeValue) {
        return 'Choose a time';
    }

    const [hours, minutes] = timeValue.split(':');
    const hourValue = Number.parseInt(hours, 10);
    const minuteValue = Number.parseInt(minutes, 10);

    if (Number.isNaN(hourValue) || Number.isNaN(minuteValue)) {
        return 'Choose a time';
    }

    const preview = new Date();
    preview.setHours(hourValue, minuteValue, 0, 0);

    return preview.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
    });
};

const normalizeListValue = (value: string[] | string | undefined) => {
    if (!value) {
        return [];
    }

    if (Array.isArray(value)) {
        return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    }

    if (typeof value !== 'string' || value.trim().length === 0) {
        return [];
    }

    try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) {
            return parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
        }
    } catch {
        return value
            .split(',')
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
    }

    return [];
};

const formatDetailLabel = (value: string) =>
    value
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());

const UserPropertyDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const toast = useToast();
    const { user } = useAuth();

    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isStartingFastTrack, setIsStartingFastTrack] = useState(false);
    const [isCreatingConversation, setIsCreatingConversation] = useState(false);
    const [isSchedulingViewing, setIsSchedulingViewing] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [calendarMonth, setCalendarMonth] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });
    const [viewingForm, setViewingForm] = useState({
        requested_date: '',
        requested_time: '10:00',
        user_notes: '',
    });

    useEffect(() => {
        const fetchProperty = async () => {
            if (!id) {
                return;
            }

            setLoading(true);
            try {
                const { data, error: apiError } = await getPropertyById(id);
                if (apiError) {
                    setError(apiError);
                } else if (data) {
                    setProperty(data);
                } else {
                    setError('Property not found');
                }
            } catch {
                setError('Failed to load property details');
            } finally {
                setLoading(false);
            }
        };

        fetchProperty();
    }, [id]);

    const images = useMemo(() => {
        const resolvedImages = getPropertyImages(property);
        return resolvedImages.length > 0 ? resolvedImages : [PROPERTY_PLACEHOLDER_IMAGE];
    }, [property]);
    const coverImage = images[selectedImageIndex] || images[0] || PROPERTY_PLACEHOLDER_IMAGE;
    const displayName = user?.user_metadata?.full_name || user?.name || user?.email || 'Interested Buyer';
    const propertyAddress = property?.address_line_1
        ? [property.address_line_1, property.city, property.postcode].filter(Boolean).join(', ')
        : [property?.city, property?.postcode].filter(Boolean).join(', ');
    const minimumViewingDate = useMemo(() => toDateValue(new Date()), []);
    const selectedDatePreview = useMemo(() => formatPreviewDate(viewingForm.requested_date), [viewingForm.requested_date]);
    const selectedTimePreview = useMemo(() => formatPreviewTime(viewingForm.requested_time), [viewingForm.requested_time]);
    const priceLabel = typeof property?.price === 'number'
        ? `${property.currency || 'GBP'} ${property.price.toLocaleString()}`
        : 'Price on request';
    const propertyTypeLabel = property?.property_type ? formatDetailLabel(property.property_type) : 'Property';
    const listingLabel = property?.listing_type ? formatDetailLabel(property.listing_type) : 'Listing';
    const conditionLabel = property?.condition ? formatDetailLabel(property.condition) : 'Well maintained';
    const availableFromLabel = useMemo(() => {
        if (!property?.available_from) {
            return 'Available now';
        }

        const parsed = new Date(property.available_from);
        if (Number.isNaN(parsed.getTime())) {
            return 'Available soon';
        }

        return parsed.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    }, [property?.available_from]);
    const highlightTags = useMemo(() => {
        const merged = [
            ...normalizeListValue(property?.features),
            ...normalizeListValue(property?.amenities),
        ]
            .map(formatDetailLabel)
            .filter(Boolean);

        return Array.from(new Set(merged)).slice(0, 8);
    }, [property?.amenities, property?.features]);
    const heroStats = useMemo(() => [
        { label: 'Bedrooms', value: `${property?.bedrooms || 0}` },
        { label: 'Bathrooms', value: `${property?.bathrooms || 0}` },
        { label: 'Interior', value: `${property?.property_size_sqft || 0} sq ft` },
        { label: 'Property type', value: propertyTypeLabel },
    ], [property?.bathrooms, property?.bedrooms, property?.property_size_sqft, propertyTypeLabel]);
    const snapshotDetails = useMemo(() => [
        { label: 'Market', value: listingLabel },
        { label: 'Condition', value: conditionLabel },
        { label: 'Availability', value: availableFromLabel },
        { label: 'Deposit', value: typeof property?.deposit_amount === 'number' && property.deposit_amount > 0 ? `${property.currency || 'GBP'} ${property.deposit_amount.toLocaleString()}` : 'On request' },
    ], [availableFromLabel, conditionLabel, listingLabel, property?.currency, property?.deposit_amount]);
    const currentMonthStart = useMemo(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    }, []);
    const calendarDays = useMemo(
        () => buildCalendarDays(calendarMonth, minimumViewingDate),
        [calendarMonth, minimumViewingDate],
    );
    const canGoToPreviousMonth = calendarMonth.getTime() > currentMonthStart.getTime();

    useEffect(() => {
        setSelectedImageIndex(0);
    }, [images.length]);

    useEffect(() => {
        if (!viewingForm.requested_date) {
            return;
        }

        const [year, month] = viewingForm.requested_date.split('-').map((value) => Number.parseInt(value, 10));
        if (Number.isNaN(year) || Number.isNaN(month)) {
            return;
        }

        setCalendarMonth((previous) => {
            if (previous.getFullYear() === year && previous.getMonth() === month - 1) {
                return previous;
            }

            return new Date(year, month - 1, 1);
        });
    }, [viewingForm.requested_date]);

    const mapFastTrackPropertyType = (listingType?: string) => {
        if (listingType === 'sale') {
            return 'buy';
        }
        if (listingType === 'lease') {
            return 'lease';
        }
        return 'rent';
    };

    const ensureAuthenticated = () => {
        if (user) {
            return true;
        }

        toast.error('Please sign in to continue.');
        navigate('/login');
        return false;
    };

    const handleStartFastTrack = async () => {
        if (!property || !ensureAuthenticated()) {
            return;
        }

        setIsStartingFastTrack(true);
        try {
            const leadResult = await createLead(property.id);
            if (leadResult.error || !leadResult.data) {
                throw new Error(leadResult.error || 'Unable to create the fast-track lead.');
            }

            const fastTrackResult = await createFastTrackCase({
                property_id: property.id,
                client_id: user!.id,
                client_name: displayName,
                property_title: property.title,
                property_type: mapFastTrackPropertyType(property.listing_type),
            });
            if (fastTrackResult.error || !fastTrackResult.data) {
                throw new Error(fastTrackResult.error || 'Unable to create the fast-track case.');
            }

            toast.success('Fast-track started. A broker will respond within 5 minutes.');
        } catch (actionError: any) {
            toast.error(actionError?.message || 'Unable to start fast-track right now.');
        } finally {
            setIsStartingFastTrack(false);
        }
    };

    const handleOpenConversation = async () => {
        if (!property || !property.manager_id || !ensureAuthenticated()) {
            return;
        }

        setIsCreatingConversation(true);
        try {
            const conversation = await messagesService.upsertDirectConversation(property.manager_id, {
                propertyId: property.id,
                propertyTitle: property.title,
                propertyAddress,
                propertyImage: coverImage || undefined,
                listingType: property.listing_type,
                propertyPrice: property.price,
                senderName: displayName,
                senderEmail: user?.email || '',
                senderPhone: user?.phone || '',
                recipientName: property.agent_name,
                recipientEmail: property.agent_email,
                recipientPhone: property.agent_phone,
                recipientAgency: property.agent_company,
            });

            navigate(`/user/dashboard/messages?conversation=${conversation.id}`);
        } catch (actionError: any) {
            toast.error(actionError?.message || 'Unable to open the message thread.');
        } finally {
            setIsCreatingConversation(false);
        }
    };

    const handleScheduleViewing = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!property || !property.manager_id || !ensureAuthenticated()) {
            return;
        }

        if (!viewingForm.requested_date || !viewingForm.requested_time) {
            toast.error('Please choose a viewing date and time.');
            return;
        }

        setIsSchedulingViewing(true);
        try {
            await bookingsService.createViewing({
                property_id: property.id,
                manager_id: property.manager_id,
                client_name: displayName,
                client_email: user?.email || '',
                client_phone: user?.phone || '',
                property_title: property.title,
                property_address: propertyAddress,
                property_image: coverImage || undefined,
                property_price: property.price,
                listing_type: property.listing_type,
                agent_name: property.agent_name,
                agent_email: property.agent_email,
                agent_phone: property.agent_phone,
                agent_agency: property.agent_company,
                requested_date: viewingForm.requested_date,
                requested_time: viewingForm.requested_time,
                user_notes: viewingForm.user_notes,
            });

            toast.success('Viewing request sent successfully.');
            navigate('/user/dashboard/viewings');
        } catch (actionError: any) {
            toast.error(actionError?.message || 'Unable to schedule the viewing.');
        } finally {
            setIsSchedulingViewing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-indigo-600">
                <Loader2 className="w-12 h-12 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading property details...</p>
            </div>
        );
    }

    if (error || !property) {
        return (
            <div className="max-w-4xl mx-auto py-20 px-4 text-center">
                <div className="bg-red-50 dark:bg-red-900/20 p-8 rounded-2xl border border-red-100 dark:border-red-900/30">
                    <Home className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{error || 'Property Not Found'}</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">The property you are looking for might have been removed or is temporarily unavailable.</p>
                    <button
                        onClick={() => navigate('/user/search')}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md"
                    >
                        Back to Search
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="relative mx-auto max-w-[1480px] px-4 py-8 pb-20">
            <div className="pointer-events-none absolute inset-x-10 top-14 -z-10 h-72 rounded-full bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.18),transparent_62%)] blur-3xl" />
            <div className="pointer-events-none absolute right-0 top-80 -z-10 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.08),transparent_68%)] blur-3xl" />
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-8 transition-colors group"
            >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span>Back</span>
            </button>

            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.36fr)_minmax(420px,0.92fr)] xl:items-start">
                <div className="min-w-0 space-y-8">
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_168px]">
                        <div className="relative overflow-hidden rounded-[2.4rem] border border-stone-200/80 bg-white shadow-[0_32px_80px_-42px_rgba(15,23,42,0.32)] dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-zinc-800 md:aspect-[16/10]">
                                <img
                                    src={coverImage}
                                    alt={property.title}
                                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                                    onError={(event) => {
                                        event.currentTarget.src = PROPERTY_PLACEHOLDER_IMAGE;
                                    }}
                                />
                            </div>
                            <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                                <span className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] shadow-lg ${
                                    property.listing_type === 'rent'
                                        ? 'bg-sky-500 text-white'
                                        : 'bg-emerald-500 text-white'
                                }`}>
                                    {listingLabel}
                                </span>
                                {property.is_verified && (
                                    <span className="rounded-full border border-white/30 bg-white/20 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-white backdrop-blur">
                                        Verified listing
                                    </span>
                                )}
                            </div>
                            {images.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedImageIndex((previous) => (previous === 0 ? images.length - 1 : previous - 1))}
                                        className="absolute left-5 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-3 text-white transition hover:bg-black/60"
                                        aria-label="Show previous property image"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedImageIndex((previous) => (previous === images.length - 1 ? 0 : previous + 1))}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full bg-black/45 p-3 text-white transition hover:bg-black/60"
                                        aria-label="Show next property image"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </>
                            )}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/72 via-black/26 to-transparent px-6 pb-5 pt-24">
                                <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-medium text-white/80">
                                    <div className="flex flex-wrap gap-2">
                                        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 backdrop-blur">
                                            {conditionLabel}
                                        </span>
                                        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 backdrop-blur">
                                            {availableFromLabel}
                                        </span>
                                    </div>
                                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 backdrop-blur">
                                        {images.length} photo{images.length === 1 ? '' : 's'}
                                    </span>
                                </div>
                            </div>
                            <div className="border-t border-stone-200/80 bg-white px-6 py-5 dark:border-zinc-800 dark:bg-zinc-900">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gray-400">Property gallery</p>
                                        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-gray-900 dark:text-white md:text-[2.35rem]">
                                            {property.title}
                                        </h1>
                                        <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                            <MapPin size={16} className="text-orange-500" />
                                            <span className="truncate">{propertyAddress}</span>
                                        </div>
                                    </div>
                                    <div className="rounded-[1.6rem] border border-stone-200 bg-stone-50 px-5 py-4 text-gray-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">Guide price</p>
                                        <p className="mt-2 text-2xl font-semibold tracking-tight">
                                            {priceLabel}
                                            {property.listing_type === 'rent' && typeof property.price === 'number' && (
                                                <span className="ml-1 text-sm font-medium text-gray-500 dark:text-gray-400">/month</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {images.length > 1 && (
                            <div className="grid grid-cols-3 gap-3 xl:grid-cols-1">
                                {images.slice(0, 4).map((image, index) => (
                                    <button
                                        key={`${image}-${index}`}
                                        type="button"
                                        onClick={() => setSelectedImageIndex(index)}
                                        className={`group relative overflow-hidden rounded-[1.6rem] border bg-white shadow-sm transition ${
                                            index === selectedImageIndex
                                                ? 'border-orange-400 ring-2 ring-orange-200 dark:ring-orange-900/40'
                                                : 'border-stone-200/70 hover:border-orange-300 dark:border-zinc-800'
                                        }`}
                                        aria-label={`Show property image ${index + 1}`}
                                    >
                                        <img
                                            src={image}
                                            alt={`${property.title} thumbnail ${index + 1}`}
                                            className="h-28 w-full object-cover transition-transform duration-500 group-hover:scale-[1.03] xl:h-[8.2rem]"
                                            onError={(event) => {
                                                event.currentTarget.src = PROPERTY_PLACEHOLDER_IMAGE;
                                            }}
                                        />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {heroStats.map((item, index) => (
                            <div
                                key={item.label}
                                className={`rounded-[1.75rem] border border-stone-200/80 bg-white/90 px-5 py-5 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 ${
                                    index === 3 ? 'xl:bg-stone-950 xl:text-white xl:border-stone-950 dark:xl:bg-white dark:xl:text-gray-900 dark:xl:border-white' : ''
                                }`}
                            >
                                <p className={`text-[11px] font-semibold uppercase tracking-[0.22em] ${
                                    index === 3 ? 'text-white/60 dark:text-gray-500' : 'text-gray-400'
                                }`}>
                                    {item.label}
                                </p>
                                <p className={`mt-3 text-xl font-semibold tracking-tight ${
                                    index === 3 ? 'text-white dark:text-gray-900' : 'text-gray-900 dark:text-white'
                                }`}>
                                    {item.value}
                                </p>
                            </div>
                        ))}
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.06fr)_minmax(280px,0.94fr)]">
                        <section className="rounded-[2.1rem] border border-stone-200/80 bg-white/90 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 md:p-7">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Property overview</p>
                                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                                        Thoughtfully presented for faster decisions
                                    </h2>
                                </div>
                                <div className="rounded-[1.4rem] bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700 dark:bg-orange-950/30 dark:text-orange-200">
                                    {property.city}, {property.country}
                                </div>
                            </div>
                            <p className="mt-5 text-[15px] leading-7 text-gray-600 dark:text-gray-300">
                                {property.description || 'No description available for this property.'}
                            </p>
                            {highlightTags.length > 0 && (
                                <div className="mt-6 flex flex-wrap gap-2.5">
                                    {highlightTags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="rounded-full border border-stone-200 bg-stone-50 px-3.5 py-2 text-sm font-medium text-gray-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-gray-200"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="rounded-[2.1rem] bg-[linear-gradient(180deg,#171717_0%,#0f0f0f_100%)] p-6 text-white shadow-[0_24px_70px_-40px_rgba(15,23,42,0.75)] dark:border dark:border-zinc-800 md:p-7">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/50">Viewing snapshot</p>
                            <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                                Everything important is surfaced before you book.
                            </h3>
                            <div className="mt-6 grid gap-3">
                                {snapshotDetails.map((item) => (
                                    <div
                                        key={item.label}
                                        className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-3.5 backdrop-blur"
                                    >
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/45">{item.label}</p>
                                        <p className="mt-2 text-sm font-medium text-white">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm leading-6 text-white/70 backdrop-blur">
                                The layout is tuned for quick comparison: gallery first, decision data second, and booking actions kept in a dedicated rail.
                            </div>
                        </section>
                    </div>
                </div>

                <div className="min-w-0 space-y-6 xl:sticky xl:top-8">
                    <div className="overflow-hidden rounded-[2.2rem] border border-stone-200/80 bg-white/92 p-6 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.38)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/92 md:p-7">
                        <div className="rounded-[1.8rem] bg-[linear-gradient(135deg,#111827_0%,#1f2937_48%,#fb923c_180%)] p-5 text-white">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">Viewing concierge</p>
                            <h3 className="mt-3 text-2xl font-semibold tracking-tight">Interested in this property?</h3>
                            <p className="mt-2 text-sm leading-6 text-white/75">
                                Start fast-track, open a direct chat, or send a polished viewing request without leaving the page.
                            </p>
                        </div>

                        <div className="mt-5 grid gap-3">
                            <button
                                onClick={handleStartFastTrack}
                                disabled={isStartingFastTrack}
                                className="w-full rounded-[1.35rem] bg-gray-950 py-4 text-white font-semibold transition hover:bg-gray-800 disabled:opacity-60 disabled:cursor-not-allowed dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                            >
                                {isStartingFastTrack ? 'Starting Fast-Track...' : 'Start 24-Hour Fast Track'}
                            </button>
                            <button
                                onClick={handleOpenConversation}
                                disabled={isCreatingConversation}
                                className="flex w-full items-center justify-center gap-2 rounded-[1.35rem] border border-stone-200 bg-stone-50 py-4 font-semibold text-gray-900 transition hover:border-orange-300 hover:bg-orange-50 disabled:opacity-60 disabled:cursor-not-allowed dark:border-zinc-800 dark:bg-zinc-950 dark:text-white dark:hover:border-orange-800 dark:hover:bg-zinc-900"
                            >
                                <MessageCircle size={18} />
                                {isCreatingConversation ? 'Opening Messages...' : 'Open Message Thread'}
                            </button>
                        </div>

                        <form onSubmit={handleScheduleViewing} className="mt-6 w-full max-w-full overflow-hidden rounded-[2rem] border border-stone-200/80 bg-[linear-gradient(180deg,#fffdf9_0%,#fff9f1_100%)] shadow-[0_26px_90px_-44px_rgba(15,23,42,0.32)] dark:border-zinc-800 dark:bg-[linear-gradient(180deg,#151515_0%,#0b0b0b_100%)]">
                            <div className="border-b border-stone-200/80 px-5 py-5 dark:border-zinc-800 md:px-6 md:py-6">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-orange-600 shadow-sm dark:border-orange-900/50 dark:bg-zinc-900 dark:text-orange-300">
                                            <Sparkles size={12} />
                                            Schedule a private tour
                                        </div>
                                        <h4 className="mt-3 text-[1.35rem] font-semibold tracking-tight text-gray-900 dark:text-white">
                                            Reserve a viewing window that works for you
                                        </h4>
                                        <p className="mt-2 max-w-md text-sm leading-6 text-gray-500 dark:text-gray-400">
                                            The manager receives a structured request with your timing and notes, so follow-up stays fast and clear.
                                        </p>
                                    </div>
                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
                                        <CalendarDays size={22} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-[minmax(0,1fr)_216px] md:items-start md:p-5">
                                <div className="min-w-0 rounded-[1.6rem] border border-stone-200/80 bg-white/92 p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">Availability</p>
                                            <h5 className="mt-1 text-[1.35rem] font-semibold text-gray-900 dark:text-white">
                                                {MONTH_LABEL_FORMATTER.format(calendarMonth)}
                                            </h5>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => setCalendarMonth((previous) => new Date(previous.getFullYear(), previous.getMonth() - 1, 1))}
                                                disabled={!canGoToPreviousMonth}
                                                className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-gray-700 transition hover:border-orange-300 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-300"
                                                aria-label="Show previous month"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setCalendarMonth((previous) => new Date(previous.getFullYear(), previous.getMonth() + 1, 1))}
                                                className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-gray-700 transition hover:border-orange-300 hover:text-orange-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-300"
                                                aria-label="Show next month"
                                            >
                                                <ChevronRight size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="mt-4 grid grid-cols-7 gap-1.5">
                                        {WEEKDAY_LABELS.map((label) => (
                                            <div
                                                key={label}
                                                className="pb-1 text-center text-[9px] font-semibold uppercase tracking-[0.08em] text-gray-400"
                                            >
                                                {label}
                                            </div>
                                        ))}
                                        {calendarDays.map((day) => {
                                            const isSelected = viewingForm.requested_date === day.value;

                                            return (
                                                <button
                                                    key={day.value}
                                                    type="button"
                                                    onClick={() => !day.isDisabled && setViewingForm((previous) => ({ ...previous, requested_date: day.value }))}
                                                    disabled={day.isDisabled}
                                                    className={`relative flex h-9 items-center justify-center rounded-lg border text-[13px] font-medium transition ${
                                                        isSelected
                                                            ? 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                                            : day.isCurrentMonth
                                                                ? 'border-stone-200 bg-stone-50 text-gray-800 hover:border-orange-300 hover:bg-orange-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-200 dark:hover:border-orange-800'
                                                                : 'border-transparent bg-transparent text-gray-300 dark:text-zinc-700'
                                                    } ${day.isDisabled ? 'cursor-not-allowed opacity-35' : ''}`}
                                                >
                                                    <span>{day.dayNumber}</span>
                                                    {day.isToday && !isSelected && (
                                                        <span className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-orange-400" />
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                                        <span className="rounded-full bg-stone-100 px-3 py-1.5 text-gray-500 dark:bg-zinc-900 dark:text-gray-400">
                                            Today onward bookable
                                        </span>
                                        <span className="rounded-full bg-stone-100 px-3 py-1.5 font-medium text-gray-700 dark:bg-zinc-900 dark:text-gray-200">
                                            In-person
                                        </span>
                                    </div>
                                </div>

                                <div className="min-w-0 space-y-3">
                                    <div className="rounded-[1.4rem] border border-stone-200/80 bg-white/92 p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">Your selection</p>
                                        <div className="mt-3 grid gap-2">
                                            <div className="rounded-xl bg-stone-50 px-3 py-2.5 dark:bg-zinc-900">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Date</p>
                                                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{selectedDatePreview}</p>
                                            </div>
                                            <div className="rounded-xl bg-stone-50 px-3 py-2.5 dark:bg-zinc-900">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Time</p>
                                                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{selectedTimePreview}</p>
                                            </div>
                                        </div>
                                        <div className="mt-3 rounded-xl border border-dashed border-orange-200 bg-orange-50/80 px-3 py-2.5 text-xs leading-5 text-orange-900 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-100">
                                            The manager gets this request instantly.
                                        </div>
                                    </div>

                                    <div className="rounded-[1.4rem] border border-stone-200/80 bg-white/92 p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80">
                                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
                                            <Clock size={15} className="text-orange-500" />
                                            <span>Preferred time</span>
                                        </div>
                                        <div className="mt-3 grid grid-cols-2 gap-2">
                                            {VIEWING_TIME_SLOTS.map((slot) => {
                                                const isSelected = viewingForm.requested_time === slot.value;

                                                return (
                                                    <button
                                                        key={slot.value}
                                                        type="button"
                                                        onClick={() => setViewingForm((previous) => ({ ...previous, requested_time: slot.value }))}
                                                        className={`rounded-xl border px-3 py-2.5 text-left transition ${
                                                            isSelected
                                                                ? 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                                                : 'border-stone-200 bg-stone-50 text-gray-800 hover:border-orange-300 hover:bg-orange-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-200 dark:hover:border-orange-800'
                                                        }`}
                                                    >
                                                        <p className="text-[13px] font-semibold">{slot.label}</p>
                                                        <p className={`mt-1 text-[10px] ${isSelected ? 'text-white/80' : 'text-gray-400'}`}>{slot.hint}</p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <label className="block rounded-[1.4rem] border border-stone-200/80 bg-white/92 p-3.5 text-sm text-gray-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-950/80 dark:text-gray-400">
                                        <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">Notes for the manager</span>
                                        <textarea
                                            rows={3}
                                            value={viewingForm.user_notes}
                                            onChange={(event) => setViewingForm((previous) => ({ ...previous, user_notes: event.target.value }))}
                                            placeholder="Access notes or timing preferences"
                                            className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-orange-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-white"
                                        />
                                    </label>

                                    <button
                                        type="submit"
                                        disabled={isSchedulingViewing}
                                        className="flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-gray-950 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-white dark:text-gray-900 dark:hover:bg-gray-200"
                                    >
                                        {isSchedulingViewing && <Loader2 size={15} className="animate-spin" />}
                                        {isSchedulingViewing ? 'Scheduling...' : 'Request Viewing Appointment'}
                                    </button>
                                </div>
                            </div>
                        </form>

                        <div className="mt-8 border-t border-stone-200/80 pt-7 dark:border-zinc-800">
                            <div className="flex items-center gap-4 rounded-[1.4rem] border border-stone-200/80 bg-stone-50 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-950">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-gray-500 font-bold dark:bg-zinc-800 dark:text-gray-300">
                                    {property.agent_name?.charAt(0) || 'B'}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">{property.agent_name || 'Verified Broker'}</div>
                                    <div className="mt-1 text-xs text-green-600 font-medium flex items-center gap-1 dark:text-green-400">
                                        <Clock size={12} />
                                        SLA: under 5 minutes
                                    </div>
                                    {property.agent_company && (
                                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{property.agent_company}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <PropertyContactInfo property={property as any} />
                </div>
            </div>
        </div>
    );
};

export default UserPropertyDetail;
