'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    BadgeCheck,
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
    CheckCircle2,
    Upload,
    X,
    Heart,
} from 'lucide-react';
import { getPropertyById, Property } from '../../../../services/propertyService';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { createLead, getUserDocuments, getUserLeads, Lead, uploadDocument, UserDocument } from '@/services/leadsService';
import { createFastTrackCase, FastTrackCase, getFastTrackCases, updateFastTrackCase } from '@/services/fastTrackService';
import { bookingsService, type ViewingAvailability } from '@/services/bookingsService';
import { messagesService } from '@/services/messagesService';
import PropertyContactInfo from '@/components/dashboard/PropertyContactInfo';
import PropertyFastTrackModal from '@/components/dashboard/PropertyFastTrackModal';
import { useSavedProperties } from '@/contexts/SavedPropertiesContext';
import {
    buildFastTrackDocumentItems,
    buildFastTrackVerificationContent,
    getFastTrackStartAction,
    isLeadActive,
    normalizeWorkspaceDocuments,
    resolveLeadStage,
} from '@/lib/fastTrackWorkflow';
import {
    formatImmersiveGalleryTransformOrigin,
    IMMERSIVE_GALLERY_DEFAULT_ZOOM_POINT,
    resolveImmersiveGalleryZoomPoint,
} from '@/lib/immersiveGallery';
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

const isPastViewingTimeSlot = (dateValue: string, timeValue: string) => {
    if (!dateValue || !timeValue) {
        return false;
    }

    const scheduledAt = new Date(`${dateValue}T${timeValue}:00`);
    if (Number.isNaN(scheduledAt.getTime())) {
        return false;
    }

    return scheduledAt.getTime() <= Date.now();
};

const isViewingTimeSlotUnavailable = (
    dateValue: string,
    timeValue: string,
    bookedSlotsByDate: Record<string, Set<string>>,
) => isPastViewingTimeSlot(dateValue, timeValue) || Boolean(bookedSlotsByDate[dateValue]?.has(timeValue));

const getAvailableViewingTimeSlots = (
    dateValue: string,
    bookedSlotsByDate: Record<string, Set<string>>,
) => VIEWING_TIME_SLOTS.filter((slot) => !isViewingTimeSlotUnavailable(dateValue, slot.value, bookedSlotsByDate));

const findNextAvailableViewingSelection = (
    minimumDateValue: string,
    bookedSlotsByDate: Record<string, Set<string>>,
) => {
    const probe = new Date(`${minimumDateValue}T00:00:00`);
    if (Number.isNaN(probe.getTime())) {
        return null;
    }

    for (let offset = 0; offset < 120; offset += 1) {
        const candidate = new Date(probe);
        candidate.setDate(probe.getDate() + offset);
        const requestedDate = toDateValue(candidate);
        const availableSlots = getAvailableViewingTimeSlots(requestedDate, bookedSlotsByDate);
        if (availableSlots.length > 0) {
            return {
                requested_date: requestedDate,
                requested_time: availableSlots[0].value,
            };
        }
    }

    return null;
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

const formatLeadStage = (value?: string) => {
    if (!value) {
        return 'Matching nearby brokers';
    }

    return value
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatMinutesRemaining = (deadline?: string) => {
    if (!deadline) {
        return '10-minute live response';
    }

    const remainingMs = new Date(deadline).getTime() - Date.now();
    if (!Number.isFinite(remainingMs)) {
        return '10-minute live response';
    }

    const minutes = Math.max(Math.ceil(remainingMs / 60000), 0);
    if (minutes === 0) {
        return 'Response window ending now';
    }

    return `${minutes} minute${minutes === 1 ? '' : 's'} left`;
};

const UserPropertyDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const fastTrackQuery = searchParams.get('fast-track');
    const brokerRequestQuery = searchParams.get('broker-request')?.trim() || '';
    const requestedCaseId = searchParams.get('case')?.trim() || '';
    const toast = useToast();
    const { user } = useAuth();
    const { toggleProperty, isPropertySaved } = useSavedProperties();

    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUpdatingSavedProperty, setIsUpdatingSavedProperty] = useState(false);
    const [isStartingFastTrack, setIsStartingFastTrack] = useState(false);
    const [isCreatingConversation, setIsCreatingConversation] = useState(false);
    const [isSchedulingViewing, setIsSchedulingViewing] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isImmersiveZoomActive, setIsImmersiveZoomActive] = useState(false);
    const [immersiveZoomPoint, setImmersiveZoomPoint] = useState(IMMERSIVE_GALLERY_DEFAULT_ZOOM_POINT);
    const [isFastTrackModalOpen, setIsFastTrackModalOpen] = useState(false);
    const [isFastTrackPanelLoading, setIsFastTrackPanelLoading] = useState(false);
    const [activeLead, setActiveLead] = useState<Lead | null>(null);
    const [activeFastTrackCase, setActiveFastTrackCase] = useState<FastTrackCase | null>(null);
    const [userDocuments, setUserDocuments] = useState<UserDocument[]>([]);
    const [uploadingFastTrackDocumentType, setUploadingFastTrackDocumentType] = useState<'identity' | 'address' | null>(null);
    const [liveWorkspaceLoaded, setLiveWorkspaceLoaded] = useState(false);
    const [calendarMonth, setCalendarMonth] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });
    const [viewingForm, setViewingForm] = useState({
        requested_date: '',
        requested_time: '10:00',
        user_notes: '',
    });
    const [viewingAvailability, setViewingAvailability] = useState<ViewingAvailability | null>(null);
    const immersiveGalleryImageRef = useRef<HTMLImageElement | null>(null);

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
    const isSaved = id ? isPropertySaved(id) : false;
    const propertyAddress = property?.address_line_1
        ? [property.address_line_1, property.city, property.postcode].filter(Boolean).join(', ')
        : [property?.city, property?.postcode].filter(Boolean).join(', ');
    const locationLabel = [property?.city, property?.country].filter(Boolean).join(', ') || 'Prime location';
    const minimumViewingDate = useMemo(() => toDateValue(new Date()), []);
    const bookedViewingSlotsByDate = useMemo(() => {
        const entries: Record<string, Set<string>> = {};
        (viewingAvailability?.slots || []).forEach((slot) => {
            if (!entries[slot.date]) {
                entries[slot.date] = new Set<string>();
            }
            entries[slot.date].add(slot.time);
        });
        return entries;
    }, [viewingAvailability]);
    const selectedDatePreview = useMemo(() => formatPreviewDate(viewingForm.requested_date), [viewingForm.requested_date]);
    const selectedTimePreview = useMemo(() => formatPreviewTime(viewingForm.requested_time), [viewingForm.requested_time]);
    const selectedDateAvailableTimeSlots = useMemo(
        () => viewingForm.requested_date
            ? getAvailableViewingTimeSlots(viewingForm.requested_date, bookedViewingSlotsByDate)
            : VIEWING_TIME_SLOTS,
        [bookedViewingSlotsByDate, viewingForm.requested_date],
    );
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
        {
            label: 'Bedrooms',
            value: `${property?.bedrooms || 0}`,
            icon: Bed,
            accentClass: 'bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-200',
        },
        {
            label: 'Bathrooms',
            value: `${property?.bathrooms || 0}`,
            icon: Bath,
            accentClass: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-200',
        },
        {
            label: 'Interior',
            value: `${property?.property_size_sqft || 0} sq ft`,
            icon: Maximize,
            accentClass: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-200',
        },
        {
            label: 'Property type',
            value: propertyTypeLabel,
            icon: Home,
            accentClass: 'bg-stone-100 text-stone-700 dark:bg-zinc-800 dark:text-zinc-100',
        },
    ], [property?.bathrooms, property?.bedrooms, property?.property_size_sqft, propertyTypeLabel]);
    const snapshotDetails = useMemo(() => [
        { label: 'Market', value: listingLabel },
        { label: 'Condition', value: conditionLabel },
        { label: 'Availability', value: availableFromLabel },
        { label: 'Deposit', value: typeof property?.deposit_amount === 'number' && property.deposit_amount > 0 ? `${property.currency || 'GBP'} ${property.deposit_amount.toLocaleString()}` : 'On request' },
    ], [availableFromLabel, conditionLabel, listingLabel, property?.currency, property?.deposit_amount]);
    const heroMetaItems = [
        { label: 'Condition', value: conditionLabel, icon: Sparkles },
        { label: 'Availability', value: availableFromLabel, icon: Clock },
        { label: 'Gallery', value: `${images.length} photo${images.length === 1 ? '' : 's'}`, icon: ImageIcon },
    ];
    const conciergeHighlights = [
        { label: 'Response window', value: '10-minute live broker response', icon: Clock },
        { label: 'Private access', value: 'Message the broker directly', icon: MessageCircle },
        { label: 'Tour booking', value: 'Reserve a slot in minutes', icon: CalendarDays },
    ];
    const detailHighlights = useMemo(() => [
        { label: 'Listing status', value: property?.status ? formatDetailLabel(property.status) : 'Available' },
        {
            label: 'Furnishing',
            value: typeof property?.furnished === 'boolean'
                ? (property.furnished ? 'Furnished' : 'Unfurnished')
                : 'Ask for details',
        },
        {
            label: 'Parking',
            value: typeof property?.parking_spaces === 'number'
                ? `${property.parking_spaces} space${property.parking_spaces === 1 ? '' : 's'}`
                : 'On request',
        },
        { label: 'Year built', value: property?.year_built ? `${property.year_built}` : 'Not listed' },
        {
            label: 'Maintenance',
            value: typeof property?.maintenance_charges === 'number' && property.maintenance_charges > 0
                ? `${property.currency || 'GBP'} ${property.maintenance_charges.toLocaleString()}`
                : 'On request',
        },
        { label: 'Address', value: propertyAddress || locationLabel },
    ], [
        locationLabel,
        property?.currency,
        property?.furnished,
        property?.maintenance_charges,
        property?.parking_spaces,
        property?.status,
        property?.year_built,
        propertyAddress,
    ]);
    const addressDetail = detailHighlights.find((item) => item.label === 'Address');
    const primaryDetailHighlights = detailHighlights.filter((item) => item.label !== 'Address');
    const currentMonthStart = useMemo(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    }, []);
    const calendarDays = useMemo(
        () => buildCalendarDays(calendarMonth, minimumViewingDate).map((day) => ({
            ...day,
            isDisabled: day.isDisabled || VIEWING_TIME_SLOTS.every((slot) => isViewingTimeSlotUnavailable(day.value, slot.value, bookedViewingSlotsByDate)),
        })),
        [bookedViewingSlotsByDate, calendarMonth, minimumViewingDate],
    );
    const canGoToPreviousMonth = calendarMonth.getTime() > currentMonthStart.getTime();
    const showPreviousImage = () => {
        setSelectedImageIndex((previous) => (previous === 0 ? images.length - 1 : previous - 1));
    };
    const showNextImage = () => {
        setSelectedImageIndex((previous) => (previous === images.length - 1 ? 0 : previous + 1));
    };
    const openGallery = (index = selectedImageIndex) => {
        setSelectedImageIndex(index);
        setIsGalleryOpen(true);
    };
    const handleImmersiveGalleryMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
        const imageRect = immersiveGalleryImageRef.current?.getBoundingClientRect();
        const pointerRect = imageRect?.width && imageRect?.height ? imageRect : event.currentTarget.getBoundingClientRect();

        setIsImmersiveZoomActive(true);
        setImmersiveZoomPoint(resolveImmersiveGalleryZoomPoint(event.clientX, event.clientY, pointerRect));
    };
    const handleImmersiveGalleryMouseLeave = () => {
        setIsImmersiveZoomActive(false);
        setImmersiveZoomPoint(IMMERSIVE_GALLERY_DEFAULT_ZOOM_POINT);
    };
    const reconcileFastTrackCaseContext = async (
        fastTrackCase: FastTrackCase | null,
        lead: Lead | null,
    ): Promise<FastTrackCase | null> => {
        if (!fastTrackCase || !lead) {
            return fastTrackCase;
        }

        const nextLeadId = fastTrackCase.leadId || lead.id;
        const nextManagerId = fastTrackCase.managerId || lead.broker_id || property?.manager_id;
        const needsSync = nextLeadId !== fastTrackCase.leadId || nextManagerId !== fastTrackCase.managerId;

        if (!needsSync) {
            return fastTrackCase;
        }

        const { data, error: syncError } = await updateFastTrackCase(fastTrackCase.id, {
            lead_id: nextLeadId,
            manager_id: nextManagerId,
        });

        if (syncError || !data) {
            return fastTrackCase;
        }

        return data;
    };
    const loadFastTrackWorkspace = async (options: { silent?: boolean } = {}) => {
        if (!property || !user) {
            return {
                lead: null,
                fastTrackCase: null,
                documents: [] as UserDocument[],
            };
        }

        if (!options.silent) {
            setIsFastTrackPanelLoading(true);
        }
        try {
            const [leadsResult, casesResult, documentsResult] = await Promise.all([
                getUserLeads(),
                getFastTrackCases(),
                getUserDocuments(),
            ]);

            if (leadsResult.error) {
                throw new Error(leadsResult.error);
            }

            if (casesResult.error) {
                throw new Error(casesResult.error);
            }

            const propertyLeads = (leadsResult.data || [])
                .filter((lead) => lead.property_id === property.id)
                .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime());
            const propertyCases = (casesResult.data || [])
                .filter((fastTrackCase) => fastTrackCase.propertyId === property.id)
                .sort((left, right) => new Date(right.submittedAt).getTime() - new Date(left.submittedAt).getTime());
            const workspaceDocuments = normalizeWorkspaceDocuments(documentsResult.data, documentsResult.error);

            const matchingLead = (
                propertyLeads.find((lead) => brokerRequestQuery && lead.broker_request_id === brokerRequestQuery && isLeadActive(lead))
                || propertyLeads.find((lead) => isLeadActive(lead))
                || propertyLeads[0]
                || null
            );
            const matchingCase = (
                propertyCases.find((fastTrackCase) => requestedCaseId && fastTrackCase.caseId === requestedCaseId)
                || propertyCases.find((fastTrackCase) => brokerRequestQuery && fastTrackCase.brokerRequestId === brokerRequestQuery && fastTrackCase.finalStatus === 'in_progress')
                || propertyCases.find((fastTrackCase) => fastTrackCase.finalStatus === 'in_progress')
                || propertyCases[0]
                || null
            );
            const reconciledCase = await reconcileFastTrackCaseContext(matchingCase, matchingLead);

            setActiveLead(matchingLead);
            setActiveFastTrackCase(reconciledCase);
            setUserDocuments(workspaceDocuments);

            return {
                lead: matchingLead,
                fastTrackCase: reconciledCase,
                documents: workspaceDocuments,
            };
        } finally {
            if (!options.silent) {
                setIsFastTrackPanelLoading(false);
            }
        }
    };

    useEffect(() => {
        setSelectedImageIndex(0);
    }, [images.length]);

    useEffect(() => {
        if (!isGalleryOpen && !isFastTrackModalOpen) {
            return;
        }

        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, [isFastTrackModalOpen, isGalleryOpen]);

    useEffect(() => {
        if (!isGalleryOpen) {
            return;
        }

        const handleGalleryKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsGalleryOpen(false);
                return;
            }

            if (event.key === 'ArrowLeft' && images.length > 1) {
                event.preventDefault();
                showPreviousImage();
            }

            if (event.key === 'ArrowRight' && images.length > 1) {
                event.preventDefault();
                showNextImage();
            }
        };

        window.addEventListener('keydown', handleGalleryKeyDown);

        return () => {
            window.removeEventListener('keydown', handleGalleryKeyDown);
        };
    }, [images.length, isGalleryOpen]);

    useEffect(() => {
        if (!isGalleryOpen) {
            setIsImmersiveZoomActive(false);
            setImmersiveZoomPoint(IMMERSIVE_GALLERY_DEFAULT_ZOOM_POINT);
            return;
        }

        setIsImmersiveZoomActive(false);
        setImmersiveZoomPoint(IMMERSIVE_GALLERY_DEFAULT_ZOOM_POINT);
    }, [isGalleryOpen, selectedImageIndex]);

    useEffect(() => {
        if (!isFastTrackModalOpen) {
            return;
        }

        const handleFastTrackKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsFastTrackModalOpen(false);
            }
        };

        window.addEventListener('keydown', handleFastTrackKeyDown);

        return () => {
            window.removeEventListener('keydown', handleFastTrackKeyDown);
        };
    }, [isFastTrackModalOpen]);

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

    useEffect(() => {
        if (!property?.id) {
            setViewingAvailability(null);
            return;
        }

        let cancelled = false;
        const loadViewingAvailability = async () => {
            try {
                const availability = await bookingsService.getViewingAvailability(property.id);
                if (!cancelled) {
                    setViewingAvailability(availability);
                }
            } catch {
                if (!cancelled) {
                    setViewingAvailability({
                        property_id: property.id,
                        slots: [],
                    });
                }
            }
        };

        void loadViewingAvailability();

        return () => {
            cancelled = true;
        };
    }, [property?.id]);

    useEffect(() => {
        const currentSelectionIsValid = selectedDateAvailableTimeSlots.some((slot) => slot.value === viewingForm.requested_time);
        if (viewingForm.requested_date && currentSelectionIsValid) {
            return;
        }

        const nextSelection = viewingForm.requested_date && selectedDateAvailableTimeSlots.length > 0
            ? {
                requested_date: viewingForm.requested_date,
                requested_time: selectedDateAvailableTimeSlots[0].value,
            }
            : findNextAvailableViewingSelection(minimumViewingDate, bookedViewingSlotsByDate);

        if (!nextSelection) {
            return;
        }

        if (
            nextSelection.requested_date === viewingForm.requested_date
            && nextSelection.requested_time === viewingForm.requested_time
        ) {
            return;
        }

        setViewingForm((previous) => ({
            ...previous,
            requested_date: nextSelection.requested_date,
            requested_time: nextSelection.requested_time,
        }));
    }, [
        bookedViewingSlotsByDate,
        minimumViewingDate,
        selectedDateAvailableTimeSlots,
        viewingForm.requested_date,
        viewingForm.requested_time,
    ]);

    useEffect(() => {
        if (!property || !user) {
            return;
        }

        if (fastTrackQuery === '1') {
            setIsFastTrackModalOpen(true);
        }

        let cancelled = false;
        const refreshWorkspace = async (silent = false) => {
            const workspace = await loadFastTrackWorkspace({ silent });
            if (!cancelled) {
                setLiveWorkspaceLoaded(Boolean(workspace.lead || workspace.fastTrackCase));
            }
        };

        void refreshWorkspace();
        const interval = window.setInterval(() => {
            void refreshWorkspace(true);
        }, 15000);

        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [fastTrackQuery, property, user]);

    useEffect(() => {
        if (!property || !user || !isFastTrackModalOpen) {
            return;
        }

        let cancelled = false;
        const interval = window.setInterval(async () => {
            const workspace = await loadFastTrackWorkspace({ silent: true });
            if (!cancelled) {
                setLiveWorkspaceLoaded(Boolean(workspace.lead || workspace.fastTrackCase));
            }
        }, 5000);

        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [isFastTrackModalOpen, property, user]);

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

    const handleSaveToggle = async () => {
        if (!property || !id || !ensureAuthenticated()) {
            return;
        }

        setIsUpdatingSavedProperty(true);
        try {
            const result = await toggleProperty(id);
            if (result?.success) {
                toast.success(isSaved ? 'Property removed from your saved list.' : 'Property saved successfully.');
                return;
            }

            toast.error(result?.error || 'Unable to update your saved properties.');
        } catch (actionError: any) {
            toast.error(actionError?.message || 'Unable to update your saved properties.');
        } finally {
            setIsUpdatingSavedProperty(false);
        }
    };

    const openFastTrackDashboard = () => {
        if (activeFastTrackCase?.caseId) {
            navigate(`/user/dashboard/fast-track?case=${activeFastTrackCase.caseId}`);
            return;
        }

        if (requestedCaseId) {
            navigate(`/user/dashboard/fast-track?case=${requestedCaseId}`);
            return;
        }

        navigate('/user/dashboard/fast-track');
    };

    const liveDocumentItems = useMemo(
        () => buildFastTrackDocumentItems(
            userDocuments,
            activeFastTrackCase?.documents || {
                identityProof: 'pending',
                addressProof: 'pending',
            },
        ),
        [activeFastTrackCase?.documents, userDocuments],
    );
    const liveVerificationContent = useMemo(
        () => buildFastTrackVerificationContent(liveDocumentItems),
        [liveDocumentItems],
    );
    const liveLeadStageLabel = formatLeadStage(resolveLeadStage(activeLead, userDocuments));
    const liveLeadDeadlineLabel = formatMinutesRemaining(activeLead?.response_deadline_at || activeLead?.sla_deadline);
    const liveLeadBrokerLabel =
        activeLead?.matched_broker?.name ||
        activeLead?.matched_broker?.company_name ||
        activeLead?.broker_id ||
        'No broker matched yet';
    const liveLeadDocumentLabel = liveVerificationContent.documentsLabel;

    const handleUploadFastTrackDocument = async (type: 'identity' | 'address', file: File) => {
        if (!ensureAuthenticated()) {
            return;
        }

        setUploadingFastTrackDocumentType(type);
        try {
            const result = await uploadDocument(type, file, {
                leadId: activeLead?.id,
            });
            if (!result.success || result.error) {
                throw new Error(result.error || 'Unable to upload the supporting file.');
            }

            toast.success(`${type === 'identity' ? 'Identity proof' : 'Address proof'} uploaded successfully.`);
            await loadFastTrackWorkspace({ silent: true });
        } catch (actionError: any) {
            toast.error(actionError?.message || 'Unable to upload the supporting file.');
        } finally {
            setUploadingFastTrackDocumentType(null);
        }
    };

    const handleStartFastTrack = async () => {
        if (!property || !ensureAuthenticated()) {
            return;
        }

        setIsStartingFastTrack(true);
        try {
            const currentWorkspace = await loadFastTrackWorkspace();
            const startAction = getFastTrackStartAction(currentWorkspace.lead, currentWorkspace.fastTrackCase);

            if (startAction === 'resume_existing_case') {
                setIsFastTrackModalOpen(true);
                return;
            }
            let leadToUse = currentWorkspace.lead;
            if (startAction === 'create_lead_and_case') {
                const leadResult = await createLead(property.id);
                if (leadResult.error || !leadResult.data) {
                    throw new Error(leadResult.error || 'Unable to create the fast-track lead.');
                }
                leadToUse = leadResult.data;
            }
            if (!leadToUse) {
                throw new Error('Unable to prepare the fast-track lead.');
            }

            const brokerRequestId = leadToUse.broker_request_id || brokerRequestQuery || undefined;

            const fastTrackResult = await createFastTrackCase({
                property_id: property.id,
                broker_request_id: brokerRequestId,
                lead_id: leadToUse.id,
                manager_id: leadToUse.broker_id,
                client_id: user!.id,
                client_name: displayName,
                property_title: property.title,
                property_type: mapFastTrackPropertyType(property.listing_type),
                property_country: property.country || undefined,
                listing_type: property.listing_type as 'rent' | 'sale' | 'lease' | undefined,
                started_from: brokerRequestId ? 'broker_request_selection' : 'direct_property',
            });
            if (fastTrackResult.error || !fastTrackResult.data) {
                throw new Error(fastTrackResult.error || 'Unable to create the fast-track case.');
            }

            await loadFastTrackWorkspace();
            setIsFastTrackModalOpen(true);
            toast.success('Fast-track started. You can track the roadmap and upload supporting files here.');
        } catch (actionError: any) {
            const message = actionError?.message || 'Unable to start fast-track right now.';
            const normalizedMessage = message.toLowerCase();

            if (normalizedMessage.includes('active lead') || normalizedMessage.includes('active fast-track case')) {
                await loadFastTrackWorkspace();
                setIsFastTrackModalOpen(true);
                toast.success('Your live fast-track journey is already active for this property.');
            } else {
                toast.error(message);
            }
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
                lead_id: activeLead?.id || activeFastTrackCase?.leadId,
                fast_track_case_id: activeFastTrackCase?.id,
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
            if (String(actionError?.message || '').toLowerCase().includes('already booked') && property?.id) {
                try {
                    const availability = await bookingsService.getViewingAvailability(property.id);
                    setViewingAvailability(availability);
                } catch {
                    // Keep the current UI state if refreshing availability also fails.
                }
                toast.error('That viewing slot was just taken. Pick another available time and try again.');
            } else if (String(actionError?.message || '').toLowerCase().includes('future time')) {
                toast.error('Please choose a future viewing time.');
            } else {
                toast.error(actionError?.message || 'Unable to schedule the viewing.');
            }
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
            <div className="pointer-events-none absolute inset-x-10 top-12 -z-10 h-64 rounded-[3rem] bg-orange-50/90 blur-3xl dark:bg-orange-950/20" />
            <div className="pointer-events-none absolute right-0 top-72 -z-10 h-56 w-56 rounded-full bg-stone-100 blur-3xl dark:bg-zinc-900/80" />
            <div className="mb-8 flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-600 transition-colors group hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-300"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span>Back</span>
                </button>
                <button
                    type="button"
                    onClick={() => void handleSaveToggle()}
                    disabled={isUpdatingSavedProperty}
                    aria-pressed={isSaved}
                    className={`group flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-70 ${
                        isSaved
                            ? 'border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-300 hover:text-orange-800 dark:border-orange-900/70 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:border-orange-800 dark:hover:text-orange-200'
                            : 'border-stone-200 bg-white text-gray-700 hover:border-orange-300 hover:text-orange-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-gray-300 dark:hover:border-orange-800 dark:hover:text-orange-400'
                    }`}
                >
                    {isUpdatingSavedProperty ? (
                        <Loader2 size={16} className="animate-spin" />
                    ) : (
                        <Heart size={16} className={isSaved ? 'fill-current' : 'text-gray-400 group-hover:text-orange-500'} />
                    )}
                    <span>{isUpdatingSavedProperty ? 'Saving...' : (isSaved ? 'Saved' : 'Save')}</span>
                </button>
            </div>

            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.36fr)_minmax(420px,0.92fr)] xl:items-start">
                <div className="min-w-0 space-y-8">
                    <div className="overflow-hidden rounded-[2.4rem] border border-stone-200/80 bg-[#fcfbf8] shadow-[0_32px_80px_-42px_rgba(15,23,42,0.28)] dark:border-zinc-800 dark:bg-zinc-900">
                        <div
                            role="button"
                            tabIndex={0}
                            onClick={() => openGallery()}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    openGallery();
                                }
                            }}
                            className="relative cursor-zoom-in focus:outline-none"
                            aria-label={`Open image gallery for ${property.title}`}
                        >
                            <div className="aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-zinc-800 md:aspect-[16/9]">
                                <img
                                    src={coverImage}
                                    alt={property.title}
                                    className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
                                    onError={(event) => {
                                        event.currentTarget.src = PROPERTY_PLACEHOLDER_IMAGE;
                                    }}
                                />
                            </div>
                            <div className="pointer-events-none absolute inset-0 bg-black/10" />
                            <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                                <span className={`rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] shadow-lg ${
                                    property.listing_type === 'rent'
                                        ? 'bg-sky-500 text-white'
                                        : 'bg-emerald-500 text-white'
                                }`}>
                                    {listingLabel}
                                </span>
                                {property.is_verified && (
                                    <span className="rounded-full border border-white/80 bg-white/88 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gray-900 shadow-sm backdrop-blur">
                                        Verified listing
                                    </span>
                                )}
                            </div>
                            <div className="absolute right-5 top-5 flex items-center gap-2">
                                <div className="rounded-full border border-white/75 bg-white/88 px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg backdrop-blur">
                                    {selectedImageIndex + 1} / {images.length}
                                </div>
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        openGallery();
                                    }}
                                    className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg transition hover:bg-white"
                                >
                                    <ImageIcon size={15} className="text-orange-500" />
                                    <span>Open gallery</span>
                                </button>
                            </div>
                            {images.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            showPreviousImage();
                                        }}
                                        className="absolute left-5 top-1/2 -translate-y-1/2 rounded-full border border-white/70 bg-white/88 p-3 text-gray-900 shadow-lg transition hover:bg-white"
                                        aria-label="Show previous property image"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            showNextImage();
                                        }}
                                        className="absolute right-5 top-1/2 -translate-y-1/2 rounded-full border border-white/70 bg-white/88 p-3 text-gray-900 shadow-lg transition hover:bg-white"
                                        aria-label="Show next property image"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </>
                            )}
                            <div className="absolute bottom-5 left-5 rounded-full border border-white/75 bg-white/88 px-4 py-2 text-sm font-medium text-gray-900 shadow-lg backdrop-blur">
                                Tap the image for the immersive viewer
                            </div>
                        </div>
                        <div className="border-t border-stone-200/80 bg-white px-6 py-6 dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">Property gallery</p>
                                    <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight text-gray-900 md:text-[2.45rem] dark:text-white">
                                        {property.title}
                                    </h1>
                                    <div className="mt-3 flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                                        <MapPin size={16} className="mt-0.5 shrink-0 text-orange-500" />
                                        <span>{propertyAddress || locationLabel}</span>
                                    </div>
                                    <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-500 dark:text-gray-400">
                                        Start with the lead image here, switch between the curated photo set below, and open the immersive viewer whenever you want a larger, distraction-free look.
                                    </p>

                                    {images.length > 1 ? (
                                        <div className="mt-6">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Switch photos directly</p>
                                                <button
                                                    type="button"
                                                    onClick={() => openGallery(selectedImageIndex)}
                                                    className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-semibold text-gray-900 transition hover:border-orange-300 hover:bg-orange-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                                                >
                                                    <ImageIcon size={15} className="text-orange-500" />
                                                    <span>View Full Gallery</span>
                                                </button>
                                            </div>
                                            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                                                {images.map((image, index) => (
                                                    <button
                                                        key={`${image}-${index}`}
                                                        type="button"
                                                        onClick={() => setSelectedImageIndex(index)}
                                                        className={`group relative h-28 w-32 shrink-0 overflow-hidden rounded-[1.45rem] border bg-white shadow-sm transition ${
                                                            index === selectedImageIndex
                                                                ? 'border-orange-400 ring-2 ring-orange-200 dark:ring-orange-900/40'
                                                                : 'border-stone-200/70 hover:border-orange-300 dark:border-zinc-800'
                                                        }`}
                                                        aria-label={`Show property image ${index + 1}`}
                                                    >
                                                        <img
                                                            src={image}
                                                            alt={`${property.title} thumbnail ${index + 1}`}
                                                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                                                            onError={(event) => {
                                                                event.currentTarget.src = PROPERTY_PLACEHOLDER_IMAGE;
                                                            }}
                                                        />
                                                        <div className="absolute inset-x-0 bottom-0 bg-black/45 px-3 py-2 text-left text-xs font-semibold text-white">
                                                            Photo {index + 1}
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-gray-200">
                                            <ImageIcon size={15} className="text-orange-500" />
                                            <span>1 curated photo available</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="rounded-[1.8rem] border border-stone-200/80 bg-[#faf7f2] p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">Guide price</p>
                                        <p className="mt-3 text-[2rem] font-semibold tracking-tight text-gray-900 dark:text-white">
                                            {priceLabel}
                                            {property.listing_type === 'rent' && typeof property.price === 'number' && (
                                                <span className="ml-1 text-sm font-medium text-gray-500 dark:text-gray-400">/month</span>
                                            )}
                                        </p>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <button
                                                type="button"
                                                onClick={() => openGallery(selectedImageIndex)}
                                                className="inline-flex items-center gap-2 rounded-[1.1rem] bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                                            >
                                                <ImageIcon size={16} />
                                                <span>Open immersive view</span>
                                            </button>
                                    <button
                                        type="button"
                                        onClick={handleStartFastTrack}
                                        disabled={isStartingFastTrack}
                                        className="inline-flex items-center gap-2 rounded-[1.1rem] border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                                    >
                                        {isStartingFastTrack ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} className="text-orange-500" />}
                                        <span>{isStartingFastTrack ? 'Checking live status...' : '24-hour fast track'}</span>
                                    </button>
                                </div>
                            </div>

                            {(activeLead || liveWorkspaceLoaded) && (
                                <div className="mt-5 rounded-[1.7rem] border border-orange-200/80 bg-orange-50/80 px-4 py-4 shadow-sm dark:border-orange-900/30 dark:bg-orange-950/20">
                                    <div className="flex flex-col gap-3">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 dark:border-orange-900/30 dark:bg-zinc-950 dark:text-orange-300">
                                                <Clock size={13} />
                                                10-minute live response
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-gray-200">
                                                <BadgeCheck size={13} />
                                                {liveLeadStageLabel}
                                            </span>
                                        </div>
                                        <div className="grid gap-2 sm:grid-cols-3">
                                            <div className="rounded-[1.1rem] border border-white/80 bg-white px-3 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Dispatch</p>
                                                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                                                    {formatLeadStage(activeLead?.dispatch_status || (activeLead?.matched_broker ? 'broker_matched' : 'matching'))}
                                                </p>
                                            </div>
                                            <div className="rounded-[1.1rem] border border-white/80 bg-white px-3 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Broker</p>
                                                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{liveLeadBrokerLabel}</p>
                                            </div>
                                            <div className="rounded-[1.1rem] border border-white/80 bg-white px-3 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-400">Docs</p>
                                                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{liveLeadDocumentLabel}</p>
                                            </div>
                                        </div>
                                        <p className="text-sm leading-6 text-gray-600 dark:text-gray-300">
                                            {activeLead?.documents_requested || activeLead?.documents_uploaded || activeLead?.documents_verified
                                                ? liveVerificationContent.summary
                                                : `Nearby brokers are being ranked live. ${liveLeadDeadlineLabel}.`}
                                        </p>
                                    </div>
                                </div>
                            )}

                                    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
                                        {heroMetaItems.map((item) => {
                                            const Icon = item.icon;

                                            return (
                                                <div key={item.label} className="rounded-[1.35rem] border border-stone-200/80 bg-white px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                                                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">
                                                        <Icon size={13} className="text-orange-500" />
                                                        <span>{item.label}</span>
                                                    </div>
                                                    <p className="mt-3 text-sm font-semibold text-gray-900 dark:text-white">{item.value}</p>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="rounded-[1.5rem] border border-stone-200/80 bg-white px-4 py-4 text-sm leading-6 text-gray-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-gray-300">
                                        Open the immersive viewer for a full-screen look, use the thumbnail rail to jump between angles quickly, and keep the key facts close enough to compare while the image stays front and centre.
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        {heroStats.map((item) => {
                            const Icon = item.icon;

                            return (
                                <div
                                    key={item.label}
                                    className="rounded-[1.8rem] border border-stone-200/80 bg-white/95 px-5 py-5 shadow-sm backdrop-blur transition-transform hover:-translate-y-0.5 dark:border-zinc-800 dark:bg-zinc-900/90"
                                >
                                    <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${item.accentClass}`}>
                                        <Icon size={18} />
                                    </div>
                                    <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">
                                        {item.label}
                                    </p>
                                    <p className="mt-2 text-xl font-semibold tracking-tight text-gray-900 dark:text-white">
                                        {item.value}
                                    </p>
                                </div>
                            );
                        })}
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.06fr)_minmax(280px,0.94fr)]">
                        <section className="rounded-[2.1rem] border border-stone-200/80 bg-white/95 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 md:p-7">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Property overview</p>
                                    <h2 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                                        Thoughtfully presented for faster decisions
                                    </h2>
                                </div>
                                <div className="rounded-[1.4rem] border border-orange-100 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/30 dark:text-orange-200">
                                    {locationLabel}
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

                        <section className="rounded-[2.1rem] border border-stone-200/80 bg-[#f6f1e8] p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:p-7">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Viewing snapshot</p>
                            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                                Everything important is visible at a glance.
                            </h3>
                            <p className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300">
                                Pricing, condition, availability, and booking readiness are grouped together so users can move from interest to action without friction.
                            </p>
                            <div className="mt-6 grid gap-3 sm:grid-cols-2">
                                {snapshotDetails.map((item) => (
                                    <div
                                        key={item.label}
                                        className="rounded-[1.4rem] border border-stone-200/80 bg-white px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                                    >
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">{item.label}</p>
                                        <p className="mt-2 text-sm font-semibold text-gray-900 dark:text-white">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 rounded-[1.5rem] border border-orange-100 bg-white p-4 text-sm leading-6 text-gray-600 shadow-sm dark:border-orange-900/30 dark:bg-zinc-950 dark:text-gray-300">
                                The page keeps the gallery, decision data, and booking actions in a natural reading flow, which helps users stay engaged longer and act sooner.
                            </div>
                        </section>
                    </div>

                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.16fr)_minmax(320px,0.84fr)] lg:items-start">
                        <section className="rounded-[2.1rem] border border-stone-200/80 bg-[#fcfaf6] p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 md:p-7">
                            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0">
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Property details</p>
                                    <h3 className="mt-3 max-w-[28rem] text-[1.9rem] font-semibold leading-tight tracking-tight text-gray-900 dark:text-white">
                                        Practical facts before you enquire
                                    </h3>
                                </div>
                                <div className="w-fit rounded-[1.4rem] border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-gray-200">
                                    {property.agent_company || 'Managed listing'}
                                </div>
                            </div>
                            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {primaryDetailHighlights.map((item) => (
                                    <div
                                        key={item.label}
                                        className="flex min-h-[8.5rem] flex-col justify-between rounded-[1.4rem] border border-stone-200/80 bg-white px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                                    >
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">{item.label}</p>
                                        <p className="mt-4 text-base font-semibold leading-7 text-gray-900 dark:text-white">{item.value}</p>
                                    </div>
                                ))}
                            </div>
                            {addressDetail && (
                                <div className="mt-3 rounded-[1.4rem] border border-stone-200/80 bg-white px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gray-400">{addressDetail.label}</p>
                                    <p className="mt-3 max-w-[36rem] text-base font-semibold leading-8 text-gray-900 dark:text-white">
                                        {addressDetail.value}
                                    </p>
                                </div>
                            )}
                        </section>

                        <PropertyContactInfo property={property as any} />
                    </div>
                </div>

                <div className="min-w-0 space-y-6 xl:sticky xl:top-8">
                    <div className="overflow-hidden rounded-[2.2rem] border border-stone-200/80 bg-white/95 p-6 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.32)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/92 md:p-7">
                        <div className="rounded-[1.8rem] border border-stone-200/80 bg-[#f8f3eb] p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Viewing concierge</p>
                            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Interested in this property?</h3>
                            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                                Start fast-track, open a direct chat, or send a polished viewing request without leaving the page.
                            </p>
                            <div className="mt-5 grid gap-2.5">
                                {conciergeHighlights.map((item) => {
                                    const Icon = item.icon;

                                    return (
                                        <div
                                            key={item.label}
                                            className="flex items-start gap-3 rounded-[1.25rem] border border-stone-200/80 bg-white px-3.5 py-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
                                        >
                                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-200">
                                                <Icon size={16} />
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{item.label}</p>
                                                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{item.value}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-5 grid gap-3">
                            <button
                                onClick={handleStartFastTrack}
                                disabled={isStartingFastTrack}
                                className="w-full rounded-[1.35rem] bg-orange-500 py-4 font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isStartingFastTrack ? 'Starting Fast-Track...' : 'Start 24-Hour Fast Track'}
                            </button>
                            <button
                                onClick={openFastTrackDashboard}
                                className="w-full rounded-[1.35rem] border border-stone-200 bg-white py-4 font-semibold text-gray-900 transition hover:border-orange-300 hover:bg-orange-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                            >
                                Open live workspace
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
                        <div className="mt-4 rounded-[1.35rem] border border-stone-200/80 bg-stone-50 px-4 py-3 text-sm leading-6 text-gray-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-gray-300">
                            Every action stays inside your dashboard, so follow-ups, confirmations, and messages remain in one place.
                        </div>

                        <form onSubmit={handleScheduleViewing} className="mt-6 w-full max-w-full overflow-hidden rounded-[2rem] border border-stone-200/80 bg-[#faf7f2] shadow-[0_26px_90px_-44px_rgba(15,23,42,0.28)] dark:border-zinc-800 dark:bg-zinc-950">
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
                                        <span className="rounded-full bg-stone-100 px-3 py-1.5 text-gray-500 dark:bg-zinc-900 dark:text-gray-400">
                                            Fully booked or past-only days are disabled
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
                                                const isUnavailable = Boolean(viewingForm.requested_date && isViewingTimeSlotUnavailable(viewingForm.requested_date, slot.value, bookedViewingSlotsByDate));

                                                return (
                                                    <button
                                                        key={slot.value}
                                                        type="button"
                                                        onClick={() => !isUnavailable && setViewingForm((previous) => ({ ...previous, requested_time: slot.value }))}
                                                        disabled={isUnavailable}
                                                        className={`rounded-xl border px-3 py-2.5 text-left transition ${
                                                            isSelected
                                                                ? 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                                                : isUnavailable
                                                                    ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-gray-400 opacity-70 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500'
                                                                    : 'border-stone-200 bg-stone-50 text-gray-800 hover:border-orange-300 hover:bg-orange-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-200 dark:hover:border-orange-800'
                                                        }`}
                                                    >
                                                        <p className="text-[13px] font-semibold">{slot.label}</p>
                                                        <p className={`mt-1 text-[10px] ${
                                                            isSelected
                                                                ? 'text-white/80'
                                                                : isUnavailable
                                                                    ? 'text-gray-400 dark:text-zinc-500'
                                                                    : 'text-gray-400'
                                                        }`}
                                                        >
                                                            {isUnavailable
                                                                ? (isPastViewingTimeSlot(viewingForm.requested_date, slot.value) ? 'Time passed' : 'Already booked')
                                                                : slot.hint}
                                                        </p>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        {viewingForm.requested_date && selectedDateAvailableTimeSlots.length === 0 && (
                                            <p className="mt-3 text-xs font-medium text-amber-700 dark:text-amber-300">
                                                Every time on this day is booked. Choose another day to continue.
                                            </p>
                                        )}
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
                                        className="flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-orange-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {isSchedulingViewing && <Loader2 size={15} className="animate-spin" />}
                                        {isSchedulingViewing ? 'Scheduling...' : 'Request Viewing Appointment'}
                                    </button>
                                </div>
                            </div>
                        </form>

                        <div className="mt-8 border-t border-stone-200/80 pt-7 dark:border-zinc-800">
                            <div className="flex items-center gap-4 rounded-[1.4rem] border border-stone-200/80 bg-stone-50 px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-200">
                                    {property.agent_name?.charAt(0) || 'B'}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">{property.agent_name || 'Verified Broker'}</div>
                                    <div className="mt-1 text-xs text-green-600 font-medium flex items-center gap-1 dark:text-green-400">
                                        <Clock size={12} />
                                        SLA: 10-minute live response
                                    </div>
                                    {property.agent_company && (
                                        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{property.agent_company}</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <PropertyFastTrackModal
                open={isFastTrackModalOpen}
                propertyTitle={property.title}
                propertyAddress={propertyAddress || locationLabel}
                lead={activeLead}
                fastTrackCase={activeFastTrackCase}
                userDocuments={userDocuments}
                isRefreshing={isFastTrackPanelLoading}
                uploadingType={uploadingFastTrackDocumentType}
                onClose={() => setIsFastTrackModalOpen(false)}
                onUploadDocument={handleUploadFastTrackDocument}
                onOpenDashboard={openFastTrackDashboard}
                onOpenMessages={handleOpenConversation}
            />

            {isGalleryOpen && (
                <div
                    className="fixed inset-0 z-[140] overflow-y-auto bg-[rgba(8,15,30,0.92)] px-3 py-3 backdrop-blur-md sm:px-5 sm:py-5"
                    onClick={() => setIsGalleryOpen(false)}
                >
                    <div className="pointer-events-none absolute inset-0 overflow-hidden">
                        <img
                            src={coverImage}
                            alt=""
                            aria-hidden="true"
                            className="h-full w-full scale-110 object-cover opacity-30 blur-3xl"
                            onError={(event) => {
                                event.currentTarget.src = PROPERTY_PLACEHOLDER_IMAGE;
                            }}
                        />
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_34%),linear-gradient(180deg,rgba(10,15,28,0.2),rgba(10,15,28,0.88)_72%)]" />
                    </div>
                    <div
                        className="relative mx-auto flex min-h-full max-w-[1500px] flex-col"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-4 rounded-[1.75rem] border border-white/10 bg-white/6 px-5 py-4 text-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.7)] backdrop-blur-xl">
                            <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55">Immersive gallery</p>
                                <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-[2rem]">{property.title}</h2>
                                <div className="mt-2 flex items-center gap-2 text-sm text-white/70">
                                    <MapPin size={15} className="text-orange-400" />
                                    <span className="truncate">{propertyAddress || locationLabel}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/85">
                                    {selectedImageIndex + 1} / {images.length}
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsGalleryOpen(false)}
                                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
                                    aria-label="Close property gallery"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="mt-4 grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.18fr)_320px]">
                            <div
                                data-testid="immersive-gallery-stage"
                                className="relative min-h-[58vh] overflow-hidden rounded-[2.2rem] border border-white/10 bg-black/25 shadow-[0_32px_80px_-38px_rgba(15,23,42,0.88)]"
                            >
                                <img
                                    src={coverImage}
                                    alt=""
                                    aria-hidden="true"
                                    className="absolute inset-0 h-full w-full scale-105 object-cover opacity-28 blur-2xl"
                                    onError={(event) => {
                                        event.currentTarget.src = PROPERTY_PLACEHOLDER_IMAGE;
                                    }}
                                />
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_30%),linear-gradient(180deg,rgba(9,14,27,0.08),rgba(9,14,27,0.48)_45%,rgba(9,14,27,0.8)_100%)]" />

                                {images.length > 1 && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={showPreviousImage}
                                            className="absolute left-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/22 p-3 text-white shadow-lg backdrop-blur transition hover:bg-black/34"
                                            aria-label="Show previous property image"
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={showNextImage}
                                            className="absolute right-4 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/20 bg-black/22 p-3 text-white shadow-lg backdrop-blur transition hover:bg-black/34"
                                            aria-label="Show next property image"
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </>
                                )}

                                <div
                                    data-testid="immersive-gallery-zoom-surface"
                                    className={`relative z-10 flex h-full items-center justify-center overflow-hidden px-4 py-6 sm:px-8 sm:py-10 ${
                                        isImmersiveZoomActive ? 'cursor-zoom-out' : 'cursor-zoom-in'
                                    }`}
                                    onMouseMove={handleImmersiveGalleryMouseMove}
                                    onMouseLeave={handleImmersiveGalleryMouseLeave}
                                >
                                    <div className="pointer-events-none absolute left-5 top-5 z-20 rounded-full border border-white/15 bg-black/24 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/82 shadow-lg backdrop-blur-md">
                                        {isImmersiveZoomActive ? 'Move to inspect details' : 'Hover to zoom'}
                                    </div>
                                    <img
                                        ref={immersiveGalleryImageRef}
                                        src={coverImage}
                                        alt={`${property.title} full view ${selectedImageIndex + 1}`}
                                        data-testid="immersive-gallery-image"
                                        className="max-h-[74vh] w-auto max-w-full rounded-[1.7rem] object-contain shadow-[0_30px_80px_-34px_rgba(0,0,0,0.88)] transition-transform duration-200 ease-out will-change-transform"
                                        style={{
                                            transform: `scale(${isImmersiveZoomActive ? 2.35 : 1})`,
                                            transformOrigin: formatImmersiveGalleryTransformOrigin(immersiveZoomPoint),
                                        }}
                                        onError={(event) => {
                                            event.currentTarget.src = PROPERTY_PLACEHOLDER_IMAGE;
                                        }}
                                    />
                                </div>

                                <div className="absolute inset-x-0 bottom-0 z-20 p-4 sm:p-5">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div className="max-w-lg rounded-[1.5rem] border border-white/10 bg-black/24 px-4 py-3 text-white shadow-lg backdrop-blur-md">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">
                                                {images.length > 1 ? `Photo ${selectedImageIndex + 1} of ${images.length}` : 'Featured property view'}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/88 backdrop-blur">
                                                {listingLabel}
                                            </span>
                                            <span className="rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/88 backdrop-blur">
                                                {priceLabel}
                                            </span>
                                            {property.is_verified && (
                                                <span className="rounded-full border border-emerald-300/35 bg-emerald-400/16 px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100 backdrop-blur">
                                                    Verified
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div
                                data-testid="immersive-gallery-sidebar"
                                className="flex flex-col gap-4"
                            >
                                <div className="rounded-[1.8rem] border border-white/10 bg-white/6 p-5 text-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.7)] backdrop-blur-xl">
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">Viewing mode</p>
                                    <h3 className="mt-3 text-xl font-semibold tracking-tight">Designed to keep the photo in focus</h3>
                                    <p className="mt-3 text-sm leading-6 text-white/72">
                                        The live image uses the full screen, while the surrounding backdrop echoes the same frame so the property feels larger and more cinematic without cropping away detail.
                                    </p>
                                    <div className="mt-4 grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1">
                                        <div className="rounded-[1.25rem] border border-white/10 bg-black/16 px-3.5 py-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Current frame</p>
                                            <p className="mt-1 text-sm font-semibold text-white">{selectedImageIndex + 1} / {images.length}</p>
                                        </div>
                                        <div className="rounded-[1.25rem] border border-white/10 bg-black/16 px-3.5 py-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Property type</p>
                                            <p className="mt-1 text-sm font-semibold text-white">{propertyTypeLabel}</p>
                                        </div>
                                        <div className="rounded-[1.25rem] border border-white/10 bg-black/16 px-3.5 py-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Address</p>
                                            <p className="mt-1 text-sm font-semibold text-white">{propertyAddress || locationLabel}</p>
                                        </div>
                                        <div className="rounded-[1.25rem] border border-orange-300/20 bg-orange-400/10 px-3.5 py-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-100/70">Zoom mode</p>
                                            <p className="mt-1 text-sm font-semibold text-white">Amazon-style desktop hover zoom</p>
                                        </div>
                                    </div>
                                </div>

                                {images.length > 1 && (
                                    <div className="rounded-[1.8rem] border border-white/10 bg-white/6 p-4 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.7)] backdrop-blur-xl">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">Photo rail</p>
                                            <span className="text-xs font-medium text-white/55">Switch instantly</span>
                                        </div>
                                        <div className="mt-4 flex gap-3 overflow-x-auto pb-1 lg:flex-col lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1">
                                            {images.map((image, index) => (
                                                <button
                                                    key={`${image}-${index}-fullscreen`}
                                                    type="button"
                                                    onClick={() => setSelectedImageIndex(index)}
                                                    className={`group relative h-24 w-28 shrink-0 overflow-hidden rounded-[1.25rem] border transition lg:h-28 lg:w-full ${
                                                        index === selectedImageIndex
                                                            ? 'border-orange-400 ring-2 ring-orange-300/45'
                                                            : 'border-white/10 hover:border-white/30'
                                                    }`}
                                                    aria-label={`Show fullscreen image ${index + 1}`}
                                                >
                                                    <img
                                                        src={image}
                                                        alt={`${property.title} fullscreen thumbnail ${index + 1}`}
                                                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                                                        onError={(event) => {
                                                            event.currentTarget.src = PROPERTY_PLACEHOLDER_IMAGE;
                                                        }}
                                                    />
                                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-left text-[11px] font-semibold text-white">
                                                        Photo {index + 1}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserPropertyDetail;
