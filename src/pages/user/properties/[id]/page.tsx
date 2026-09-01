'use client';

import ActionSpinner from '@/components/ui/ActionSpinner';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
    ArrowLeft,
    BadgeCheck,
    MapPin,
    Bed,
    Bath,
    Maximize,
    Home,
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ImageIcon,
    Clock,
    Sparkles,
    ExternalLink,
    Upload,
    X,
    Heart,
    Star,
    Video,
} from 'lucide-react';
import { getPropertyById, recordPropertyView, Property } from '../../../../services/propertyService';
import { recordPropertyNavigation } from '@/lib/propertyNavigation';
import {
    clearFastTrackRequestPending,
    getFastTrackDeepLinkOpenKey,
    getFastTrackRequestPendingDelay,
    getFastTrackRequestPendingKey,
    readFastTrackRequestPending,
    resolveFastTrackRequestControlState,
    shouldClearFastTrackRequestPending,
    writeFastTrackRequestPending,
    type FastTrackRequestPendingMarker,
} from '@/lib/fastTrackRequestPending';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import { createLead, getUserDocuments, getUserLeads, Lead, uploadDocument, UserDocument } from '@/services/leadsService';
import { FastTrackCase, getFastTrackCases, requestFastTrack, updateFastTrackCase } from '@/services/fastTrackService';
import { bookingsService, type ViewingAvailability } from '@/services/bookingsService';
import { messagesService } from '@/services/messagesService';
import { createApplication as submitRentalApplication } from '@/services/applicationsService';
import { createOffer } from '@/services/salesService';
import { reviewsService, type Review } from '@/services/reviewsService';
import PropertyFastTrackModal from '@/components/dashboard/PropertyFastTrackModal';
import FastTrackRequestConfirmationModal from '@/components/fast-track/FastTrackRequestConfirmationModal';
import { useSavedProperties } from '@/contexts/SavedPropertiesContext';
import {
    buildFastTrackDocumentItems,
    buildFastTrackVerificationContent,
    filterDocumentsForLead,
    getFastTrackStartAction,
    isActiveFastTrackCase,
    normalizeWorkspaceDocuments,
} from '@/lib/fastTrackWorkflow';
import {
    resolvePropertyFastTrackSummaryDocuments,
    resolvePropertyFastTrackPanelLabels,
    resolvePropertyFastTrackWorkspaceSelection,
} from '@/lib/propertyFastTrackWorkspace';
import {
    formatImmersiveGalleryTransformOrigin,
    IMMERSIVE_GALLERY_DEFAULT_ZOOM_POINT,
    resolveImmersiveGalleryZoomPoint,
} from '@/lib/immersiveGallery';
import { getPropertyMapState } from '@/lib/propertyMaps';
import { PROPERTY_PLACEHOLDER_IMAGE } from '@/lib/placeholders';
import { getPropertyImages, getPropertyVideos } from '@/lib/propertyImages';
import { getPropertyGalleryDisplayState } from '@/lib/propertyGalleryState';
import {
    MAX_SALE_OFFER_NOTES_LENGTH,
    buildSaleOfferPayload,
    isSaleOfferListingType,
} from '@/lib/saleOfferEntry';
import { WORKSPACE_SYNC_TAGS } from '@/lib/workspaceSync';
import {
    resetPropertyDetailScroll,
    shouldResetPropertyDetailScroll,
} from '@/lib/propertyDetailScroll';
import { usePublishWorkspaceSync } from '@/contexts/WorkspaceSyncContext';
import { getLoginPath } from '@/lib/authUtils';
import { formatLaunchCurrencyForCountry, formatLaunchPropertyLocation } from '@/lib/launchLocale';
import { getSavedPropertyLocationCity, getSavedPropertyLocationLabel } from '@/lib/savedPropertyState';
import { buildWorkspacePath } from '@/lib/workspaceLinks';
import { getRentalApplicationFastTrackBlocker } from '@/lib/rentalApplicationGate';
import {
    buildPropertyFastTrackStartRequest,
    mapFastTrackPropertyType,
} from '@/lib/propertyFastTrackRequest';

export {
    buildPropertyFastTrackStartRequest,
    mapFastTrackPropertyType,
} from '@/lib/propertyFastTrackRequest';
import { isPropertyInMarket } from '@/lib/propertyMarket';
import { useUserGeoMarket } from '@/lib/useGeoMarket';

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
const VIEWING_CALENDAR_DAY_LABEL_FORMATTER = new Intl.DateTimeFormat('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

type ViewingRequestForm = {
    requested_date: string;
    requested_time: string;
    user_notes: string;
};

type ViewingRequestValidationErrors = Partial<Record<'requested_date' | 'requested_time', string>>;

type ViewingTimeSlot = (typeof VIEWING_TIME_SLOTS)[number];

const MAX_RENTAL_APPLICATION_MESSAGE_LENGTH = 1000;
const MAX_RENTAL_APPLICATION_LEASE_MONTHS = 60;

type RentalApplicationForm = {
    moveInDate: string;
    leaseDurationMonths: string;
    employmentStatus: string;
    employerName: string;
    annualIncome: string;
    currentAddress: string;
    message: string;
};

type RentalApplicationValidationErrors = Partial<Record<keyof RentalApplicationForm, string>>;

export const getPropertyBrokerRequestQuery = (params: URLSearchParams) => {
    const directRequestId = params.get('broker-request')?.trim() || params.get('brokerRequest')?.trim();
    if (directRequestId) {
        return directRequestId;
    }

    const workspaceRequestId = params.get('request')?.trim();
    if (workspaceRequestId && (params.get('workspace') === 'broker-request' || params.get('fast-track') === '1')) {
        return workspaceRequestId;
    }

    return '';
};

export type PropertyFastTrackLookupStatus = 'idle' | 'loading' | 'ready' | 'error';
export type PropertyFastTrackCtaState = 'checking' | 'start' | 'continue' | 'retry';

export const resolvePropertyFastTrackCtaState = ({
    isAuthenticated,
    propertyId,
    lookupPropertyId,
    lookupStatus,
    hasActiveJourney,
}: {
    isAuthenticated: boolean;
    propertyId?: string;
    lookupPropertyId: string | null;
    lookupStatus: PropertyFastTrackLookupStatus;
    hasActiveJourney: boolean;
}): PropertyFastTrackCtaState => {
    if (!isAuthenticated) {
        return 'start';
    }

    if (!propertyId || lookupPropertyId !== propertyId || lookupStatus === 'idle' || lookupStatus === 'loading') {
        return 'checking';
    }

    if (lookupStatus === 'error') {
        return 'retry';
    }

    return hasActiveJourney ? 'continue' : 'start';
};

type PropertyFastTrackDashboardCase = Pick<FastTrackCase, 'caseId' | 'finalStatus' | 'stage'> | null | undefined;

export const buildPropertyFastTrackDashboardPath = (
    fastTrackCase: PropertyFastTrackDashboardCase,
    requestedCaseId?: string | null,
) => {
    const caseId = String(fastTrackCase?.caseId || requestedCaseId || '').trim();
    if (!caseId) {
        return '/user/dashboard/fast-track';
    }

    const targetStage = fastTrackCase?.stage === 'documents'
        ? 'documents'
        : (fastTrackCase?.finalStatus === 'completed' ? 'overview' : 'documents');
    const path = buildWorkspacePath('/user/dashboard/fast-track', {
        caseId,
        section: targetStage,
    });

    if (fastTrackCase?.finalStatus !== 'completed') {
        return path;
    }

    return `${path}${path.includes('?') ? '&' : '?'}celebrate=1`;
};

export const getPropertyDetailDisplayAddress = (property: Property | null | undefined) => {
    if (!property) {
        return '';
    }

    return formatLaunchPropertyLocation(getSavedPropertyLocationLabel(property));
};

export const getPropertyDetailLocationLabel = (property: Property | null | undefined) => {
    if (!property) {
        return 'Prime location';
    }

    return formatLaunchPropertyLocation([getSavedPropertyLocationCity(property), property.country]);
};

export const formatPropertyDetailCurrency = (
    amount: number,
    property: Pick<Property, 'country' | 'currency'> | null | undefined,
) => formatLaunchCurrencyForCountry(amount, {
    countryCode: property?.country,
    countryName: property?.country,
    currencyCode: property?.currency,
});

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

type ViewingCalendarDay = ReturnType<typeof buildCalendarDays>[number];

export function getViewingCalendarDayAriaLabel(day: ViewingCalendarDay, selected: boolean) {
    const parsed = new Date(`${day.value}T12:00:00`);
    const dateLabel = Number.isNaN(parsed.getTime())
        ? day.value
        : VIEWING_CALENDAR_DAY_LABEL_FORMATTER.format(parsed);
    const stateLabel = selected
        ? 'Selected viewing date'
        : day.isDisabled
            ? 'Unavailable viewing date'
            : 'Select viewing date';

    return `${stateLabel}: ${dateLabel}`;
}

export function getViewingCalendarDayTone(day: ViewingCalendarDay, selected: boolean) {
    if (selected) {
        return 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/20';
    }

    if (day.isCurrentMonth) {
        return 'border-stone-200 bg-stone-50 text-gray-800 hover:border-orange-300 hover:bg-orange-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-200 dark:hover:border-orange-800';
    }

    return 'border-stone-100 bg-white text-gray-600 hover:border-orange-200 hover:bg-orange-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:border-orange-900';
}

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

const _findNextAvailableViewingSelection = (
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

export function shouldLoadViewingAvailability(propertyId: string | undefined, user?: unknown): propertyId is string {
    return Boolean(propertyId && user);
}

export function getPropertyDetailFallbackBackTarget(fastTrackQuery: string | null, user?: unknown) {
    if (!user) {
        return '/search';
    }

    return fastTrackQuery === '1' ? '/user/dashboard' : '/user/dashboard/discover';
}

export function shouldUseBrowserHistoryForPropertyDetailBack(user?: unknown) {
    return Boolean(user);
}

export function getImmersiveGalleryDialogLabel(propertyTitle: string) {
    const title = propertyTitle.trim();
    return title ? `Full-screen gallery for ${title}` : 'Full-screen property gallery';
}

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

export function getViewingRequestValidationErrors(form: Pick<ViewingRequestForm, 'requested_date' | 'requested_time'>) {
    const errors: ViewingRequestValidationErrors = {};

    if (!form.requested_date.trim()) {
        errors.requested_date = 'Choose a viewing date.';
    }

    if (!form.requested_time.trim()) {
        errors.requested_time = 'Choose a viewing time.';
    }

    return errors;
}

export function clearViewingSelectionOutsideMonth(form: ViewingRequestForm, month: Date): ViewingRequestForm {
    if (!form.requested_date) {
        return form;
    }

    const selectedDate = new Date(`${form.requested_date}T12:00:00`);
    if (isSameMonth(selectedDate, month)) {
        return form;
    }

    return {
        ...form,
        requested_date: '',
        requested_time: '',
    };
}

const normalizeRentalApplicationText = (value: string) => value.trim().replace(/\s+/g, ' ');

const normalizeRentalApplicationForm = (form: RentalApplicationForm): RentalApplicationForm => ({
    moveInDate: form.moveInDate.trim(),
    leaseDurationMonths: form.leaseDurationMonths.trim(),
    employmentStatus: normalizeRentalApplicationText(form.employmentStatus).toLowerCase(),
    employerName: normalizeRentalApplicationText(form.employerName),
    annualIncome: form.annualIncome.trim(),
    currentAddress: normalizeRentalApplicationText(form.currentAddress),
    message: normalizeRentalApplicationText(form.message),
});

const getRentalApplicationValidationErrors = (
    form: RentalApplicationForm,
    minimumMoveInDate: string,
): RentalApplicationValidationErrors => {
    const normalized = normalizeRentalApplicationForm(form);
    const errors: RentalApplicationValidationErrors = {};
    const leaseMonths = Number(normalized.leaseDurationMonths);
    const annualIncome = normalized.annualIncome ? Number(normalized.annualIncome) : null;

    if (!normalized.moveInDate) {
        errors.moveInDate = 'Choose a move-in date.';
    } else if (normalized.moveInDate < minimumMoveInDate) {
        errors.moveInDate = `Move-in date must be on or after ${minimumMoveInDate}.`;
    }

    if (!Number.isInteger(leaseMonths) || leaseMonths < 1 || leaseMonths > MAX_RENTAL_APPLICATION_LEASE_MONTHS) {
        errors.leaseDurationMonths = 'Enter a lease length between 1 and 60 months.';
    }

    if (!normalized.employmentStatus) {
        errors.employmentStatus = 'Choose an employment status.';
    }

    if (annualIncome !== null && (!Number.isFinite(annualIncome) || annualIncome < 0)) {
        errors.annualIncome = 'Annual income cannot be negative.';
    }

    if (!normalized.currentAddress) {
        errors.currentAddress = 'Enter your current address.';
    }

    if (normalized.message.length > MAX_RENTAL_APPLICATION_MESSAGE_LENGTH) {
        errors.message = 'Message must be 1000 characters or fewer.';
    }

    return errors;
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

export function buildPropertyHeroSummary(property: Property | null | undefined, locationLabel: string) {
    const propertyType = property?.property_type ? formatDetailLabel(property.property_type).toLowerCase() : 'property';
    const location = locationLabel || property?.city || 'this location';
    const bedroomCount = typeof property?.bedrooms === 'number' ? property.bedrooms : 0;
    const bathroomCount = typeof property?.bathrooms === 'number' ? property.bathrooms : 0;
    const sizeText = typeof property?.property_size_sqft === 'number' && property.property_size_sqft > 0
        ? ` with ${property.property_size_sqft} sq ft of interior space`
        : '';
    const description = property?.description?.trim().replace(/\s+/g, ' ');
    const featureText = normalizeListValue(property?.features || property?.amenities)
        .map(formatDetailLabel)
        .slice(0, 3)
        .join(', ');
    const supportingText = description
        || (featureText ? `Highlights include ${featureText}.` : 'Key property facts and transaction options are available below.');

    return [
        `This ${propertyType} in ${location} offers ${bedroomCount} bedroom${bedroomCount === 1 ? '' : 's'} and ${bathroomCount} bathroom${bathroomCount === 1 ? '' : 's'}${sizeText}.`,
        supportingText,
        description && featureText ? `Highlights include ${featureText}.` : '',
    ].filter(Boolean).join(' ');
}

export function buildPropertySnapshotNarrative(
    property: Property | null | undefined,
    priceLabel: string,
    availableFromLabel: string,
    depositLabel: string,
) {
    const propertyType = property?.property_type ? formatDetailLabel(property.property_type) : 'Property';
    const listingType = property?.listing_type ? formatDetailLabel(property.listing_type) : 'listing';
    const bedroomCount = Number(property?.bedrooms || 0);
    const bathroomCount = Number(property?.bathrooms || 0);

    return `${propertyType} ${listingType.toLowerCase()} at ${priceLabel}. ${bedroomCount} bedroom${bedroomCount === 1 ? '' : 's'}, ${bathroomCount} bathroom${bathroomCount === 1 ? '' : 's'}. ${availableFromLabel}. Deposit: ${depositLabel}.`;
}

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

interface SaleOfferEntryCardProps {
    priceLabel: string;
    offerAmount: string;
    offerNotes: string;
    error?: string;
    isSubmitting: boolean;
    onAmountChange: (value: string) => void;
    onNotesChange: (value: string) => void;
    onSubmit: React.FormEventHandler<HTMLFormElement>;
}

export const SaleOfferEntryCard = ({
    priceLabel,
    offerAmount,
    offerNotes,
    error = '',
    isSubmitting,
    onAmountChange,
    onNotesChange,
    onSubmit,
}: SaleOfferEntryCardProps) => (
    <form
        onSubmit={onSubmit}
        className="rounded-[1.7rem] border border-emerald-200/80 bg-emerald-50/80 p-4 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20"
    >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between xl:flex-col">
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700 dark:text-emerald-300">
                    Sale offer
                </p>
                <h4 className="mt-2 text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                    Submit Offer
                </h4>
                <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                    Send your offer to the assigned broker for review against the guide price of {priceLabel}.
                </p>
            </div>
            <span className="w-fit rounded-full border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-zinc-950 dark:text-emerald-300">
                Buyer action
            </span>
        </div>

        <label className="mt-4 block text-sm text-gray-700 dark:text-gray-300">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                Offer amount
            </span>
            <input
                type="number"
                min="1"
                step="1"
                value={offerAmount}
                onChange={(event) => onAmountChange(event.target.value)}
                placeholder="425000"
                className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-emerald-500 dark:border-emerald-900/50 dark:bg-zinc-950 dark:text-white"
            />
        </label>

        <label className="mt-3 block text-sm text-gray-700 dark:text-gray-300">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                Notes for the offer
            </span>
            <textarea
                rows={3}
                value={offerNotes}
                onChange={(event) => onNotesChange(event.target.value)}
                placeholder="Timing, conditions, or proof-of-funds context"
                className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-emerald-500 dark:border-emerald-900/50 dark:bg-zinc-950 dark:text-white"
            />
        </label>

        {error ? (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300">
                {error}
            </p>
        ) : null}

        <button
            type="submit"
            disabled={isSubmitting}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-emerald-700 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-700/20 transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
            {isSubmitting && <ActionSpinner size={15} className="" />}
            {isSubmitting ? 'Submitting offer...' : 'Submit Offer'}
        </button>
    </form>
);

interface RentalApplicationEntryCardProps {
    minimumMoveInDate: string;
    form: RentalApplicationForm;
    errors: RentalApplicationValidationErrors;
    isSubmitting: boolean;
    submissionBlocker?: string | null;
    onChange: (field: keyof RentalApplicationForm, value: string) => void;
    onSubmit: React.FormEventHandler<HTMLFormElement>;
}

const RentalApplicationEntryCard = ({
    minimumMoveInDate,
    form,
    errors,
    isSubmitting,
    submissionBlocker,
    onChange,
    onSubmit,
}: RentalApplicationEntryCardProps) => (
    <form
        onSubmit={onSubmit}
        className="rounded-[1.7rem] border border-sky-200/80 bg-sky-50/80 p-4 shadow-sm dark:border-sky-900/40 dark:bg-sky-950/20"
    >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between xl:flex-col">
            <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">
                    Rental application
                </p>
                <h4 className="mt-2 text-lg font-semibold tracking-tight text-gray-900 dark:text-white">
                    Submit Rental Application
                </h4>
            </div>
            <span className="w-fit rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-semibold text-sky-700 dark:border-sky-900/50 dark:bg-zinc-950 dark:text-sky-300">
                Tenant action
            </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <label className="block text-sm text-gray-700 dark:text-gray-300">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                    Move-in date
                </span>
                <input
                    type="date"
                    min={minimumMoveInDate}
                    value={form.moveInDate}
                    onChange={(event) => onChange('moveInDate', event.target.value)}
                    aria-invalid={Boolean(errors.moveInDate)}
                    aria-describedby={errors.moveInDate ? 'rental-application-move-in-error' : undefined}
                    className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-sky-500 dark:border-sky-900/50 dark:bg-zinc-950 dark:text-white"
                />
                {errors.moveInDate && (
                    <p id="rental-application-move-in-error" className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                        {errors.moveInDate}
                    </p>
                )}
            </label>

            <label className="block text-sm text-gray-700 dark:text-gray-300">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                    Lease months
                </span>
                <input
                    type="number"
                    min="1"
                    max={MAX_RENTAL_APPLICATION_LEASE_MONTHS}
                    step="1"
                    value={form.leaseDurationMonths}
                    onChange={(event) => onChange('leaseDurationMonths', event.target.value)}
                    aria-invalid={Boolean(errors.leaseDurationMonths)}
                    aria-describedby={errors.leaseDurationMonths ? 'rental-application-lease-error' : undefined}
                    className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-sky-500 dark:border-sky-900/50 dark:bg-zinc-950 dark:text-white"
                />
                {errors.leaseDurationMonths && (
                    <p id="rental-application-lease-error" className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                        {errors.leaseDurationMonths}
                    </p>
                )}
            </label>
        </div>

        <label className="mt-3 block text-sm text-gray-700 dark:text-gray-300">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                Employment status
            </span>
            <select
                value={form.employmentStatus}
                onChange={(event) => onChange('employmentStatus', event.target.value)}
                aria-invalid={Boolean(errors.employmentStatus)}
                aria-describedby={errors.employmentStatus ? 'rental-application-employment-error' : undefined}
                className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-900 outline-none transition focus:border-sky-500 dark:border-sky-900/50 dark:bg-zinc-950 dark:text-white"
            >
                <option value="" disabled>Select status</option>
                <option value="employed">Employed</option>
                <option value="self_employed">Self-employed</option>
                <option value="student">Student</option>
                <option value="retired">Retired</option>
                <option value="other">Other</option>
            </select>
            {errors.employmentStatus && (
                <p id="rental-application-employment-error" className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.employmentStatus}
                </p>
            )}
        </label>

        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <label className="block text-sm text-gray-700 dark:text-gray-300">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                    Employer
                </span>
                <input
                    value={form.employerName}
                    onChange={(event) => onChange('employerName', event.target.value)}
                    placeholder="Company or institution"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-sky-500 dark:border-sky-900/50 dark:bg-zinc-950 dark:text-white"
                />
            </label>

            <label className="block text-sm text-gray-700 dark:text-gray-300">
                <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                    Annual income
                </span>
                <input
                    type="number"
                    min="0"
                    step="1000"
                    value={form.annualIncome}
                    onChange={(event) => onChange('annualIncome', event.target.value)}
                    aria-invalid={Boolean(errors.annualIncome)}
                    aria-describedby={errors.annualIncome ? 'rental-application-income-error' : undefined}
                    placeholder="85000"
                    className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-sky-500 dark:border-sky-900/50 dark:bg-zinc-950 dark:text-white"
                />
                {errors.annualIncome && (
                    <p id="rental-application-income-error" className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                        {errors.annualIncome}
                    </p>
                )}
            </label>
        </div>

        <label className="mt-3 block text-sm text-gray-700 dark:text-gray-300">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                Current address
            </span>
            <textarea
                rows={2}
                value={form.currentAddress}
                onChange={(event) => onChange('currentAddress', event.target.value)}
                aria-invalid={Boolean(errors.currentAddress)}
                aria-describedby={errors.currentAddress ? 'rental-application-address-error' : undefined}
                className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-sky-500 dark:border-sky-900/50 dark:bg-zinc-950 dark:text-white"
            />
            {errors.currentAddress && (
                <p id="rental-application-address-error" className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.currentAddress}
                </p>
            )}
        </label>

        <label className="mt-3 block text-sm text-gray-700 dark:text-gray-300">
            <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400">
                Message
            </span>
            <textarea
                rows={3}
                value={form.message}
                onChange={(event) => onChange('message', event.target.value)}
                aria-invalid={Boolean(errors.message)}
                aria-describedby={errors.message ? 'rental-application-message-error' : undefined}
                maxLength={MAX_RENTAL_APPLICATION_MESSAGE_LENGTH + 1}
                placeholder="Move-in timing, pets, references, or other context"
                className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none transition focus:border-sky-500 dark:border-sky-900/50 dark:bg-zinc-950 dark:text-white"
            />
            {errors.message && (
                <p id="rental-application-message-error" className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">
                    {errors.message}
                </p>
            )}
        </label>

        {submissionBlocker && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                {submissionBlocker}
            </p>
        )}

        <button
            type="submit"
            disabled={isSubmitting || Boolean(submissionBlocker)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-[1.2rem] bg-sky-700 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-sky-700/20 transition hover:bg-sky-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
            {isSubmitting && <ActionSpinner size={15} className="" />}
            {isSubmitting ? 'Submitting application...' : submissionBlocker ? 'Complete Fast Track first' : 'Submit Rental Application'}
        </button>
    </form>
);

interface ViewingTimeSlotButtonProps {
    slot: ViewingTimeSlot;
    selected: boolean;
    unavailable: boolean;
    unavailableReason: string;
    onSelect: () => void;
}

export function ViewingTimeSlotButton({
    slot,
    selected,
    unavailable,
    unavailableReason,
    onSelect,
}: ViewingTimeSlotButtonProps) {
    return (
        <button
            type="button"
            onClick={() => {
                if (!unavailable) {
                    onSelect();
                }
            }}
            disabled={unavailable}
            aria-label={`Select ${slot.label} viewing time`}
            aria-pressed={selected}
            className={`rounded-xl border px-3 py-2.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
                selected
                    ? 'border-orange-500 bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                    : unavailable
                        ? 'cursor-not-allowed border-stone-200 bg-stone-100 text-gray-400 opacity-70 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-500'
                        : 'border-stone-200 bg-stone-50 text-gray-800 hover:border-orange-300 hover:bg-orange-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-gray-200 dark:hover:border-orange-800'
            }`}
        >
            <p className="text-[13px] font-semibold">{slot.label}</p>
            <p className={`mt-1 text-[10px] ${
                selected
                    ? 'text-white/80'
                    : unavailable
                        ? 'text-gray-400 dark:text-zinc-500'
                        : 'text-gray-400'
            }`}
            >
                {unavailable ? unavailableReason : slot.hint}
            </p>
        </button>
    );
}

const UserPropertyDetail = () => {
    const { id } = useParams<{ id: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const fastTrackQuery = searchParams.get('fast-track');
    const brokerRequestQuery = getPropertyBrokerRequestQuery(searchParams);
    const requestedCaseId = searchParams.get('case')?.trim() || '';
    const toast = useToast();
    const { user } = useAuth();
    const geoMarket = useUserGeoMarket(user);
    const { saveProperty, removeProperty, isPropertySaved } = useSavedProperties();
    const publishWorkspaceSync = usePublishWorkspaceSync();

    const [property, setProperty] = useState<Property | null>(null);
    const [propertyReviews, setPropertyReviews] = useState<Review[]>([]);
    const [propertyReviewAverage, setPropertyReviewAverage] = useState(0);
    const [propertyReviewTotal, setPropertyReviewTotal] = useState(0);
    const [propertyReviewsLoading, setPropertyReviewsLoading] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUpdatingSavedProperty, setIsUpdatingSavedProperty] = useState(false);
    const [savedPropertyStatusMessage, setSavedPropertyStatusMessage] = useState('');
    const [isStartingFastTrack, setIsStartingFastTrack] = useState(false);
    const [isSchedulingViewing, setIsSchedulingViewing] = useState(false);
    const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
    const [isSubmittingRentalApplication, setIsSubmittingRentalApplication] = useState(false);
    const [selectedImageIndex, setSelectedImageIndex] = useState(0);
    const [isGalleryOpen, setIsGalleryOpen] = useState(false);
    const [isImmersiveZoomActive, setIsImmersiveZoomActive] = useState(false);
    const [immersiveZoomPoint, setImmersiveZoomPoint] = useState(IMMERSIVE_GALLERY_DEFAULT_ZOOM_POINT);
    const [isFastTrackModalOpen, setIsFastTrackModalOpen] = useState(false);
    const [isFastTrackRequestConfirmationOpen, setIsFastTrackRequestConfirmationOpen] = useState(false);
    const [isFastTrackPanelLoading, setIsFastTrackPanelLoading] = useState(false);
    const [activeLead, setActiveLead] = useState<Lead | null>(null);
    const [activeFastTrackCase, setActiveFastTrackCase] = useState<FastTrackCase | null>(null);
    const [fastTrackRequestPending, setFastTrackRequestPending] = useState<FastTrackRequestPendingMarker | null>(null);
    const [fastTrackWorkspaceLookup, setFastTrackWorkspaceLookup] = useState<{
        propertyId: string | null;
        status: PropertyFastTrackLookupStatus;
    }>({ propertyId: null, status: 'idle' });
    const [userDocuments, setUserDocuments] = useState<UserDocument[]>([]);
    const [uploadingFastTrackDocumentType, setUploadingFastTrackDocumentType] = useState<'identity' | 'address' | null>(null);
    const [liveWorkspaceLoaded, setLiveWorkspaceLoaded] = useState(false);

    React.useLayoutEffect(() => {
        if (!shouldResetPropertyDetailScroll(location.hash)) {
            return;
        }

        return resetPropertyDetailScroll(window);
    }, [id, location.hash]);

    useEffect(() => {
        if (loading || !shouldResetPropertyDetailScroll(location.hash)) {
            return;
        }

        return resetPropertyDetailScroll(window);
    }, [id, loading, location.hash]);

    const fastTrackRequestStorageKey = useMemo(() => (
        user?.id && property?.id
            ? getFastTrackRequestPendingKey(user.id, property.id)
            : null
    ), [property?.id, user?.id]);

    useEffect(() => {
        setFastTrackRequestPending(
            fastTrackRequestStorageKey
                ? readFastTrackRequestPending(window.localStorage, fastTrackRequestStorageKey)
                : null,
        );
    }, [fastTrackRequestStorageKey]);

    useEffect(() => {
        if (!fastTrackRequestStorageKey || !fastTrackRequestPending) {
            return;
        }

        const timeout = window.setTimeout(() => {
            setFastTrackRequestPending(
                readFastTrackRequestPending(window.localStorage, fastTrackRequestStorageKey),
            );
        }, getFastTrackRequestPendingDelay(fastTrackRequestPending));

        return () => window.clearTimeout(timeout);
    }, [fastTrackRequestPending, fastTrackRequestStorageKey]);

    useEffect(() => {
        if (
            !fastTrackRequestStorageKey
            || !property?.id
            || !shouldClearFastTrackRequestPending(fastTrackRequestPending, activeFastTrackCase, property.id)
        ) {
            return;
        }
        clearFastTrackRequestPending(window.localStorage, fastTrackRequestStorageKey);
        setFastTrackRequestPending(null);
    }, [activeFastTrackCase, fastTrackRequestPending, fastTrackRequestStorageKey, property?.id]);
    const [calendarMonth, setCalendarMonth] = useState(() => {
        const today = new Date();
        return new Date(today.getFullYear(), today.getMonth(), 1);
    });
    const [viewingForm, setViewingForm] = useState<ViewingRequestForm>({
        requested_date: '',
        requested_time: '',
        user_notes: '',
    });
    const [viewingFormErrors, setViewingFormErrors] = useState<ViewingRequestValidationErrors>({});
    const [offerForm, setOfferForm] = useState({
        amount: '',
        notes: '',
    });
    const [offerFormError, setOfferFormError] = useState('');
    const [rentalApplicationForm, setRentalApplicationForm] = useState<RentalApplicationForm>({
        moveInDate: '',
        leaseDurationMonths: '12',
        employmentStatus: '',
        employerName: '',
        annualIncome: '',
        currentAddress: '',
        message: '',
    });
    const [rentalApplicationErrors, setRentalApplicationErrors] = useState<RentalApplicationValidationErrors>({});
    const [viewingAvailability, setViewingAvailability] = useState<ViewingAvailability | null>(null);
    const immersiveGalleryImageRef = useRef<HTMLImageElement | null>(null);
    const immersiveGalleryCloseButtonRef = useRef<HTMLButtonElement | null>(null);
    const immersiveGalleryTriggerRef = useRef<HTMLElement | null>(null);
    const wasImmersiveGalleryOpenRef = useRef(false);
    const fastTrackTriggerRef = useRef<HTMLButtonElement | null>(null);
    const fastTrackRequestInFlightRef = useRef(false);
    const handledFastTrackDeepLinkRef = useRef<string | null>(null);
    const activePropertyIdRef = useRef<string | null>(property?.id || null);
    activePropertyIdRef.current = property?.id || null;
    const viewingFormRef = useRef<HTMLFormElement | null>(null);
    const wasFastTrackModalOpenRef = useRef(false);
    const offerInFlightRef = useRef(false);
    const rentalApplicationInFlightRef = useRef(false);

    useEffect(() => {
        if (fastTrackQuery !== '1') {
            handledFastTrackDeepLinkRef.current = null;
        }
    }, [fastTrackQuery]);
    const navigationState = (location.state && typeof location.state === 'object'
        ? location.state
        : null) as { backTo?: string; backLabel?: string; backState?: unknown } | null;
    const fallbackBackTarget = getPropertyDetailFallbackBackTarget(fastTrackQuery, user);
    const backLabel = navigationState?.backLabel || 'Back';

    const handleBackNavigation = () => {
        if (navigationState?.backTo) {
            navigate(navigationState.backTo, { state: navigationState.backState });
            return;
        }

        if (shouldUseBrowserHistoryForPropertyDetailBack(user) && window.history.length > 1) {
            navigate(-1);
            return;
        }

        navigate(fallbackBackTarget);
    };

    useEffect(() => {
        if (id) {
            recordPropertyNavigation(id);
        }
    }, [id]);

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
                    const role = String(user?.role || '').trim().toLowerCase();
                    if (role === 'user' && !isPropertyInMarket(data, geoMarket)) {
                        setProperty(null);
                        setError('This property is not available in your market.');
                    } else {
                        setProperty(data);
                    }
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
    }, [geoMarket, id, user?.role]);

    useEffect(() => {
        const role = String(user?.role || '').trim().toLowerCase();
        if (!id || !property || !user?.id || role !== 'user') {
            return;
        }

        const viewedKey = `property_viewed:${user.id}:${id}`;
        if (sessionStorage.getItem(viewedKey)) {
            return;
        }

        // Mark before sending so a rerender cannot issue duplicate events. If
        // the request fails, remove the marker so the next visit can retry.
        sessionStorage.setItem(viewedKey, 'pending');
        void recordPropertyView(id).then(({ recorded }) => {
            if (!recorded) {
                sessionStorage.removeItem(viewedKey);
            }
        });
    }, [id, property, user?.id, user?.role]);

    useEffect(() => {
        if (!id) {
            setPropertyReviews([]);
            setPropertyReviewAverage(0);
            setPropertyReviewTotal(0);
            return;
        }

        let isCancelled = false;
        setPropertyReviewsLoading(true);

        const fetchPropertyReviews = async () => {
            const result = await reviewsService.getPropertyReviews(id);
            if (isCancelled) {
                return;
            }

            if (result.success && result.data) {
                setPropertyReviews(result.data.reviews);
                setPropertyReviewAverage(result.data.average_rating);
                setPropertyReviewTotal(result.data.total_reviews);
            } else {
                setPropertyReviews([]);
                setPropertyReviewAverage(0);
                setPropertyReviewTotal(0);
            }
            setPropertyReviewsLoading(false);
        };

        void fetchPropertyReviews();

        return () => {
            isCancelled = true;
        };
    }, [id]);

    const images = useMemo(() => getPropertyImages(property), [property]);
    const realImageCount = images.length;
    const galleryDisplayState = useMemo(
        () => getPropertyGalleryDisplayState(realImageCount, selectedImageIndex),
        [realImageCount, selectedImageIndex],
    );
    const propertyVideos = useMemo(() => getPropertyVideos(property), [property]);
    const coverImage = images[selectedImageIndex] || images[0] || PROPERTY_PLACEHOLDER_IMAGE;
    const displayName = user?.user_metadata?.full_name || user?.name || user?.email || 'Interested Buyer';
    const isSaved = id ? isPropertySaved(id) : false;
    const propertyAddress = getPropertyDetailDisplayAddress(property);
    const locationLabel = getPropertyDetailLocationLabel(property);
    const propertyHeroSummary = useMemo(
        () => buildPropertyHeroSummary(property, locationLabel),
        [locationLabel, property],
    );
    const propertyMapState = useMemo(
        () => getPropertyMapState(property ?? {}, {
            userAgent: typeof navigator === 'undefined' ? undefined : navigator.userAgent,
            displayAddress: propertyAddress || locationLabel,
        }),
        [locationLabel, property, propertyAddress],
    );
    const propertyMapAddress = propertyMapState.displayAddress || propertyAddress || locationLabel;
    const preferredMapsLabel = propertyMapState.provider === 'apple' ? 'Apple Maps' : 'Google Maps';
    const minimumViewingDate = useMemo(() => toDateValue(new Date()), []);
    const minimumRentalApplicationMoveInDate = useMemo(() => {
        const todayValue = toDateValue(new Date());
        if (!property?.available_from) {
            return todayValue;
        }

        const availableDate = new Date(`${property.available_from}T00:00:00`);
        if (Number.isNaN(availableDate.getTime())) {
            return todayValue;
        }

        return toDateValue(availableDate) > todayValue ? toDateValue(availableDate) : todayValue;
    }, [property?.available_from]);
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
    const propertyCountry = property?.country;
    const propertyCurrencyCode = property?.currency;
    const formatPropertyCurrency = useCallback((amount: number) => (
        formatLaunchCurrencyForCountry(amount, {
            countryCode: propertyCountry,
            countryName: propertyCountry,
            currencyCode: propertyCurrencyCode,
        })
    ), [propertyCountry, propertyCurrencyCode]);
    const priceLabel = typeof property?.price === 'number'
        ? formatPropertyCurrency(property.price)
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
    const depositLabel = typeof property?.deposit_amount === 'number' && property.deposit_amount > 0
        ? formatPropertyCurrency(property.deposit_amount)
        : 'On request';
    const propertySnapshotNarrative = useMemo(
        () => buildPropertySnapshotNarrative(property, priceLabel, availableFromLabel, depositLabel),
        [availableFromLabel, depositLabel, priceLabel, property],
    );
    const propertySnapshotIntro = `${priceLabel} guide price, ${conditionLabel.toLowerCase()} condition, and ${availableFromLabel.toLowerCase()} availability are recorded for this ${listingLabel.toLowerCase()} listing.`;
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
        { label: 'Listing type', value: listingLabel },
        { label: 'Condition', value: conditionLabel },
        { label: 'Availability', value: availableFromLabel },
        { label: 'Deposit', value: typeof property?.deposit_amount === 'number' && property.deposit_amount > 0 ? formatPropertyCurrency(property.deposit_amount) : 'On request' },
    ], [availableFromLabel, conditionLabel, formatPropertyCurrency, listingLabel, property?.deposit_amount]);
    const propertyFastTrackCase = activeFastTrackCase?.propertyId === property?.id ? activeFastTrackCase : null;
    const hasActiveFastTrackJourney = isActiveFastTrackCase(propertyFastTrackCase);
    const isFastTrackApprovalPending = Boolean(fastTrackRequestPending) && !hasActiveFastTrackJourney;
    const fastTrackCtaState = resolvePropertyFastTrackCtaState({
        isAuthenticated: Boolean(user),
        propertyId: property?.id,
        lookupPropertyId: fastTrackWorkspaceLookup.propertyId,
        lookupStatus: fastTrackWorkspaceLookup.status,
        hasActiveJourney: hasActiveFastTrackJourney,
    });
    const isFastTrackLookupPending = fastTrackCtaState === 'checking';
    const {
        isBusy: isFastTrackCtaBusy,
        isDisabled: isFastTrackCtaDisabled,
    } = resolveFastTrackRequestControlState({
        isStarting: isStartingFastTrack,
        isLookupPending: isFastTrackLookupPending,
        isApprovalPending: isFastTrackApprovalPending,
    });
    const fastTrackSidebarActionLabel = isFastTrackApprovalPending
        ? 'Fast Track requested'
        : fastTrackCtaState === 'continue'
        ? 'Continue 24-hour journey'
        : fastTrackCtaState === 'retry'
            ? 'Check fast-track status'
            : fastTrackCtaState === 'checking'
                ? 'Checking fast-track status...'
                : '24-hour fast track';
    const fastTrackPrimaryActionLabel = isFastTrackApprovalPending
        ? 'Waiting for manager approval'
        : fastTrackCtaState === 'continue'
        ? 'Continue Fast Track'
        : fastTrackCtaState === 'retry'
            ? 'Check Fast Track Status'
            : fastTrackCtaState === 'checking'
                ? 'Checking Fast Track Status...'
                : 'Request 24-Hour Fast Track';
    const fastTrackBusyActionLabel = fastTrackCtaState === 'continue'
        ? 'Opening Fast Track...'
        : fastTrackCtaState === 'start'
            ? 'Sending Fast Track request...'
            : 'Checking Fast Track Status...';
    const fastTrackConciergeActionLabel = isFastTrackApprovalPending
        ? 'Waiting for manager approval'
        : fastTrackCtaState === 'continue'
        ? 'Continue your fast-track workspace'
        : fastTrackCtaState === 'retry'
            ? 'Check your fast-track status'
            : fastTrackCtaState === 'checking'
                ? 'Checking your fast-track status'
                : '10-minute live broker response';
    const heroMetaItems = [
        { label: 'Condition', value: conditionLabel, icon: Sparkles },
        { label: 'Availability', value: availableFromLabel, icon: Clock },
        { label: 'Gallery', value: `${images.length} photo${images.length === 1 ? '' : 's'}`, icon: ImageIcon },
    ];
    const conciergeHighlights = [
        { label: 'Response window', value: fastTrackConciergeActionLabel, icon: Clock },
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
                ? formatPropertyCurrency(property.maintenance_charges)
                : 'On request',
        },
        { label: 'Address', value: propertyAddress || locationLabel },
    ], [
        locationLabel,
        formatPropertyCurrency,
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
    const changeViewingCalendarMonth = (offset: number) => {
        const nextMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + offset, 1);
        setCalendarMonth(nextMonth);
        setViewingForm((previous) => clearViewingSelectionOutsideMonth(previous, nextMonth));
        setViewingFormErrors((previous) => ({
            ...previous,
            requested_date: undefined,
            requested_time: undefined,
        }));
    };
    const showPreviousImage = useCallback(() => {
        setSelectedImageIndex((previous) => (previous === 0 ? images.length - 1 : previous - 1));
    }, [images.length]);
    const showNextImage = useCallback(() => {
        setSelectedImageIndex((previous) => (previous === images.length - 1 ? 0 : previous + 1));
    }, [images.length]);
    const openGallery = (index = selectedImageIndex, trigger?: HTMLElement | null) => {
        if (!galleryDisplayState.hasImages) {
            return;
        }
        immersiveGalleryTriggerRef.current = trigger || (document.activeElement as HTMLElement | null);
        setSelectedImageIndex(index);
        setIsGalleryOpen(true);
    };
    const closeGallery = () => {
        setIsGalleryOpen(false);
    };
    const closeFastTrackModal = () => {
        setIsFastTrackModalOpen(false);
    };
    const focusViewingRequestForm = () => {
        viewingFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        const firstAvailableTimeSlot = viewingFormRef.current?.querySelector<HTMLButtonElement>('button[aria-label^="Select "]:not(:disabled)');
        firstAvailableTimeSlot?.focus({ preventScroll: true });
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
    const reconcileFastTrackCaseContext = useCallback(async (
        fastTrackCase: FastTrackCase | null,
        lead: Lead | null,
    ): Promise<FastTrackCase | null> => {
        if (!fastTrackCase || !lead) {
            return fastTrackCase;
        }

        const nextLeadId = fastTrackCase.leadId || lead.id;
        const nextManagerId =
            lead.matched_broker_id ||
            lead.broker_id ||
            fastTrackCase.managerId ||
            property?.manager_id;
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
    }, [property?.manager_id]);
    const loadFastTrackWorkspace = useCallback(async (options: { silent?: boolean } = {}) => {
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
                getUserLeads({ suppressErrorToast: true }),
                getFastTrackCases({ suppressErrorToast: true }),
                getUserDocuments({ suppressErrorToast: true }),
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

            const { lead: matchingLead, fastTrackCase: matchingCase } = resolvePropertyFastTrackWorkspaceSelection({
                propertyLeads,
                propertyCases,
                requestedCaseId,
                brokerRequestQuery,
            });
            const reconciledCase = await reconcileFastTrackCaseContext(matchingCase, matchingLead);

            if (activePropertyIdRef.current === property.id) {
                setActiveLead(matchingLead);
                setActiveFastTrackCase(reconciledCase);
                setUserDocuments(workspaceDocuments);
                setFastTrackWorkspaceLookup({ propertyId: property.id, status: 'ready' });
            }

            return {
                lead: matchingLead,
                fastTrackCase: reconciledCase,
                documents: workspaceDocuments,
            };
        } catch (workspaceError) {
            setFastTrackWorkspaceLookup((current) => (
                current.propertyId === property.id && current.status === 'loading'
                    ? { propertyId: property.id, status: 'error' }
                    : current
            ));
            throw workspaceError;
        } finally {
            if (!options.silent) {
                setIsFastTrackPanelLoading(false);
            }
        }
    }, [brokerRequestQuery, property, reconcileFastTrackCaseContext, requestedCaseId, user]);

    useEffect(() => {
        setSelectedImageIndex(0);
        if (images.length === 0) {
            setIsGalleryOpen(false);
        }
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
                closeGallery();
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
    }, [images.length, isGalleryOpen, showNextImage, showPreviousImage]);

    useEffect(() => {
        if (isGalleryOpen) {
            wasImmersiveGalleryOpenRef.current = true;
            const frame = window.requestAnimationFrame(() => {
                immersiveGalleryCloseButtonRef.current?.focus();
            });
            return () => window.cancelAnimationFrame(frame);
        }

        if (!wasImmersiveGalleryOpenRef.current) {
            return;
        }

        wasImmersiveGalleryOpenRef.current = false;
        const trigger = immersiveGalleryTriggerRef.current;
        immersiveGalleryTriggerRef.current = null;
        const frame = window.requestAnimationFrame(() => {
            trigger?.focus();
        });
        return () => window.cancelAnimationFrame(frame);
    }, [isGalleryOpen]);

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
        if (isFastTrackModalOpen) {
            wasFastTrackModalOpenRef.current = true;
            return;
        }

        if (!wasFastTrackModalOpenRef.current) {
            return;
        }

        wasFastTrackModalOpenRef.current = false;
        const trigger = fastTrackTriggerRef.current;
        const frame = window.requestAnimationFrame(() => {
            trigger?.focus();
        });
        return () => window.cancelAnimationFrame(frame);
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
        const propertyId = property?.id;
        if (!shouldLoadViewingAvailability(propertyId, user)) {
            setViewingAvailability(propertyId ? { property_id: propertyId, slots: [] } : null);
            return;
        }

        let cancelled = false;
        const loadViewingAvailability = async () => {
            try {
                const availability = await bookingsService.getViewingAvailability(propertyId);
                if (!cancelled) {
                    setViewingAvailability(availability);
                }
            } catch {
                if (!cancelled) {
                    setViewingAvailability({
                        property_id: propertyId,
                        slots: [],
                    });
                }
            }
        };

        void loadViewingAvailability();

        return () => {
            cancelled = true;
        };
    }, [property?.id, user]);

    useEffect(() => {
        const currentSelectionIsValid = selectedDateAvailableTimeSlots.some((slot) => slot.value === viewingForm.requested_time);
        if (!viewingForm.requested_date || !viewingForm.requested_time || currentSelectionIsValid) {
            return;
        }

        setViewingForm((previous) => ({
            ...previous,
            requested_time: '',
        }));
    }, [
        selectedDateAvailableTimeSlots,
        viewingForm.requested_date,
        viewingForm.requested_time,
    ]);

    useEffect(() => {
        if (!property || !user) {
            return;
        }

        let cancelled = false;
        setFastTrackWorkspaceLookup({ propertyId: property.id, status: 'loading' });
        const refreshWorkspace = async (silent = false) => {
            try {
                const workspace = await loadFastTrackWorkspace({ silent });
                if (!cancelled) {
                    setLiveWorkspaceLoaded(Boolean(workspace.lead || workspace.fastTrackCase));
                    const deepLinkOpenKey = getFastTrackDeepLinkOpenKey({
                        fastTrackQuery,
                        hasActiveCase: isActiveFastTrackCase(workspace.fastTrackCase),
                        propertyID: property.id,
                    });
                    if (!silent && deepLinkOpenKey && handledFastTrackDeepLinkRef.current !== deepLinkOpenKey) {
                        handledFastTrackDeepLinkRef.current = deepLinkOpenKey;
                        setIsFastTrackModalOpen(true);
                    }
                }
            } catch {
                if (!cancelled && !silent) {
                    setActiveLead(null);
                    setActiveFastTrackCase(null);
                    setLiveWorkspaceLoaded(false);
                }
            }
        };

        void refreshWorkspace();
        const interval = window.setInterval(() => {
            if (document.visibilityState !== 'visible') {
                return;
            }
            void refreshWorkspace(true);
        }, 15000);

        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [fastTrackQuery, fastTrackRequestStorageKey, loadFastTrackWorkspace, property, user]);

    useEffect(() => {
        if (!property || !user || !isFastTrackModalOpen) {
            return;
        }

        let cancelled = false;
        const interval = window.setInterval(async () => {
            if (document.visibilityState !== 'visible') {
                return;
            }
            const workspace = await loadFastTrackWorkspace({ silent: true });
            if (!cancelled) {
                setLiveWorkspaceLoaded(Boolean(workspace.lead || workspace.fastTrackCase));
            }
        }, 5000);

        return () => {
            cancelled = true;
            window.clearInterval(interval);
        };
    }, [isFastTrackModalOpen, loadFastTrackWorkspace, property, user]);

    const resolveWorkflowManagerId = (
        lead: Lead | null = activeLead,
        fastTrackCase: FastTrackCase | null = activeFastTrackCase,
    ) => (
        lead?.matched_broker_id ||
        lead?.broker_id ||
        fastTrackCase?.managerId ||
        property?.manager_id ||
        ''
    );
    const workflowManagerId = resolveWorkflowManagerId();
    const workflowRecipientName =
        activeLead?.matched_broker?.name ||
        property?.agent_name ||
        'Estospaces advisor';
    const workflowRecipientEmail =
        activeLead?.matched_broker?.email ||
        property?.agent_email ||
        '';
    const workflowRecipientPhone =
        activeLead?.matched_broker?.phone ||
        property?.agent_phone ||
        '';
    const workflowRecipientAgency =
        activeLead?.matched_broker?.company_name ||
        property?.agent_company ||
        '';

    const ensureAuthenticated = () => {
        if (user) {
            return true;
        }

        toast.error('Please sign in to continue.');
        navigate(getLoginPath());
        return false;
    };

    const ensureWorkflowManagerReady = () => {
        const managerId = resolveWorkflowManagerId();
        if (managerId) {
            return managerId;
        }

        toast.error('This property does not have an assigned broker or manager yet. Please try again shortly.');
        return null;
    };

    const handleSaveToggle = async () => {
        if (!property || !id || !ensureAuthenticated()) {
            return;
        }
        if (isUpdatingSavedProperty) {
            return;
        }

        setIsUpdatingSavedProperty(true);
        try {
            const result = isSaved ? await removeProperty(id) : await saveProperty(id);
            if (result?.success) {
                const message = isSaved ? 'Property removed from your saved list.' : 'Property saved successfully.';
                setSavedPropertyStatusMessage(message);
                toast.success(message);
                return;
            }

            const message = result?.error || 'Unable to update your saved properties.';
            setSavedPropertyStatusMessage(message);
            toast.error(message);
        } catch (actionError: any) {
            const message = actionError?.message || 'Unable to update your saved properties.';
            setSavedPropertyStatusMessage(message);
            toast.error(message);
        } finally {
            setIsUpdatingSavedProperty(false);
        }
    };

    const openFastTrackDashboard = (fastTrackCase: PropertyFastTrackDashboardCase = activeFastTrackCase) => {
        navigate(buildPropertyFastTrackDashboardPath(fastTrackCase, requestedCaseId));
    };
    const leadScopedDocuments = useMemo(
        () => filterDocumentsForLead(userDocuments, activeFastTrackCase?.leadId || activeLead?.id),
        [activeFastTrackCase?.leadId, activeLead?.id, userDocuments],
    );

    const fastTrackSummaryDocuments = useMemo(
        () => resolvePropertyFastTrackSummaryDocuments(leadScopedDocuments, activeFastTrackCase),
        [activeFastTrackCase, leadScopedDocuments],
    );

    const liveDocumentItems = useMemo(
        () => buildFastTrackDocumentItems(
            fastTrackSummaryDocuments,
            activeFastTrackCase?.documents || {
                identityProof: 'pending',
                addressProof: 'pending',
            },
        ),
        [activeFastTrackCase?.documents, fastTrackSummaryDocuments],
    );
    const liveVerificationContent = useMemo(
        () => buildFastTrackVerificationContent(liveDocumentItems),
        [liveDocumentItems],
    );
    const liveLeadPanelLabels = resolvePropertyFastTrackPanelLabels(
        activeLead,
        leadScopedDocuments,
        activeFastTrackCase,
    );
    const liveLeadStageLabel = liveLeadPanelLabels.stage;
    const liveLeadDeadlineLabel = liveLeadPanelLabels.deadline;
    const liveLeadDispatchLabel =
        hasActiveFastTrackJourney
            ? formatLeadStage(activeFastTrackCase?.stage)
            : formatLeadStage(activeLead?.dispatch_status || (activeLead?.matched_broker ? 'broker_matched' : 'matching'));
    const liveLeadBrokerLabel =
        activeLead?.matched_broker?.name ||
        activeLead?.matched_broker?.company_name ||
        activeLead?.broker_id ||
        'No broker matched yet';
    const liveLeadDocumentLabel = liveVerificationContent.documentsLabel;
    const rentalApplicationFastTrackBlocker = useMemo(
        () => getRentalApplicationFastTrackBlocker(activeFastTrackCase),
        [activeFastTrackCase],
    );

    const handleUploadFastTrackDocument = async (type: 'identity' | 'address', file: File) => {
        if (!ensureAuthenticated()) {
            return;
        }

        setUploadingFastTrackDocumentType(type);
        try {
            const result = await uploadDocument(type, file, {
                leadId: activeLead?.id || activeFastTrackCase?.leadId,
                fastTrackCaseId: activeFastTrackCase?.id,
                managerId: workflowManagerId || undefined,
                propertyId: property?.id,
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
        if (fastTrackRequestInFlightRef.current || !property || !ensureAuthenticated()) {
            return;
        }

        const fastTrackPropertyType = mapFastTrackPropertyType(property.listing_type);
        if (!fastTrackPropertyType) {
            toast.error('Fast-track is not available for short-term listings yet.');
            return;
        }

        fastTrackRequestInFlightRef.current = true;
        setIsStartingFastTrack(true);
        try {
            const currentWorkspace = await loadFastTrackWorkspace();
            const startAction = getFastTrackStartAction(currentWorkspace.lead, currentWorkspace.fastTrackCase);

            if (startAction === 'resume_existing_case') {
                openFastTrackDashboard(currentWorkspace.fastTrackCase);
                return;
            }
            let leadToUse = currentWorkspace.lead;
            if (!brokerRequestQuery && startAction === 'create_lead_and_case') {
                const leadResult = await createLead(property.id);
                if (leadResult.error || !leadResult.data) {
                    throw new Error(leadResult.error || 'Unable to create the fast-track lead.');
                }
                leadToUse = leadResult.data;
            }
            if (!brokerRequestQuery && !leadToUse) {
                throw new Error('Unable to prepare the fast-track lead.');
            }

            const fastTrackRequest = buildPropertyFastTrackStartRequest({
                property,
                lead: leadToUse,
                brokerRequestQuery,
                clientId: user!.id,
                clientName: displayName,
            });
            if (!fastTrackRequest) {
                toast.error('Fast-track is not available for short-term listings yet.');
                return;
            }

            const fastTrackResult = await requestFastTrack(fastTrackRequest);
            if (fastTrackResult.error || !fastTrackResult.requested) {
                throw new Error(fastTrackResult.error || 'Unable to send the Fast Track request.');
            }
            setActiveLead(leadToUse);
            setLiveWorkspaceLoaded(Boolean(leadToUse));
            if (!fastTrackResult.requestedAt) {
                throw new Error('The Fast Track request confirmation was incomplete. Please try again.');
            }
            if (fastTrackRequestStorageKey) {
                const pendingMarker = writeFastTrackRequestPending(
                    window.localStorage,
                    fastTrackRequestStorageKey,
                    fastTrackResult.requestedAt,
                );
                setFastTrackRequestPending(pendingMarker);
            }
            publishWorkspaceSync({
                source: 'mutation',
                tags: [
                    WORKSPACE_SYNC_TAGS.FAST_TRACK,
                    WORKSPACE_SYNC_TAGS.MANAGER_DASHBOARD,
                    WORKSPACE_SYNC_TAGS.LEADS,
                ],
                reason: 'User requested fast-track from property detail',
                ids: {
                    leadId: leadToUse?.id,
                    propertyId: property.id,
                },
            });
            toast.success('Fast Track requested. Your manager has been notified and will start it after review.');
        } catch (actionError: any) {
            const message = actionError?.message || 'Unable to request Fast Track right now.';
            const normalizedMessage = message.toLowerCase();

            if (normalizedMessage.includes('active lead') || normalizedMessage.includes('active fast-track case')) {
                const recoveredWorkspace = await loadFastTrackWorkspace();
                if (recoveredWorkspace.fastTrackCase) {
                    openFastTrackDashboard(recoveredWorkspace.fastTrackCase);
                }
                toast.success('Your live fast-track journey is already active for this property.');
            } else {
                toast.error(message);
            }
        } finally {
            fastTrackRequestInFlightRef.current = false;
            setIsStartingFastTrack(false);
        }
    };

    const handleFastTrackEntryAction = (trigger: HTMLButtonElement) => {
        fastTrackTriggerRef.current = trigger;
        if (
            fastTrackCtaState === 'start'
            && user
            && property
            && mapFastTrackPropertyType(property.listing_type)
        ) {
            setIsFastTrackRequestConfirmationOpen(true);
            return;
        }

        void handleStartFastTrack();
    };

    const confirmFastTrackRequest = () => {
        setIsFastTrackRequestConfirmationOpen(false);
        void handleStartFastTrack();
    };

    const handleOpenConversation = async () => {
        if (!property || !ensureAuthenticated()) {
            return;
        }

        const managerId = ensureWorkflowManagerReady();
        if (!managerId) {
            return;
        }

        try {
            const conversation = await messagesService.upsertDirectConversation(managerId, {
                propertyId: property.id,
                propertyTitle: property.title,
                propertyAddress,
                propertyImage: coverImage || undefined,
                listingType: property.listing_type,
                propertyPrice: property.price,
                senderName: displayName,
                senderEmail: user?.email || '',
                senderPhone: user?.phone || '',
                recipientName: workflowRecipientName,
                recipientEmail: workflowRecipientEmail,
                recipientPhone: workflowRecipientPhone,
                recipientAgency: workflowRecipientAgency,
            });

            navigate(`/user/dashboard/messages?conversation=${conversation.id}`);
        } catch (actionError: any) {
            toast.error(actionError?.message || 'Unable to open the message thread.');
        }
    };

    const handleSubmitOffer = async (event: React.FormEvent) => {
        event.preventDefault();

        if (offerInFlightRef.current) {
            return;
        }

        if (!ensureAuthenticated()) {
            return;
        }

        const { payload, error: payloadError } = buildSaleOfferPayload({
            property,
            lead: activeLead,
            fastTrackCase: activeFastTrackCase,
            amount: offerForm.amount,
            notes: offerForm.notes,
        });

        if (payloadError || !payload) {
            setOfferFormError(payloadError || 'Unable to prepare the offer.');
            toast.error(payloadError || 'Unable to prepare the offer.');
            return;
        }

        offerInFlightRef.current = true;
        setIsSubmittingOffer(true);
        setOfferFormError('');
        try {
            const offerResult = await createOffer(payload, { suppressErrorToast: true });
            if (offerResult.error || !offerResult.data) {
                throw new Error(offerResult.error || 'Unable to submit the offer.');
            }

            setOfferForm({ amount: '', notes: '' });
            toast.success('Offer submitted. Your broker can review it in the live sale workspace.');
            await loadFastTrackWorkspace({ silent: true });
        } catch (actionError: any) {
            setOfferFormError(actionError?.message || 'Unable to submit the offer.');
            toast.error(actionError?.message || 'Unable to submit the offer.');
        } finally {
            offerInFlightRef.current = false;
            setIsSubmittingOffer(false);
        }
    };

    const handleSaleOfferAmountChange = (amount: string) => {
        setOfferForm((previous) => ({ ...previous, amount }));
        setOfferFormError('');
    };

    const handleSaleOfferNotesChange = (notes: string) => {
        setOfferForm((previous) => ({ ...previous, notes }));
        if (
            notes.trim().replace(/\s+/g, ' ').length <=
            MAX_SALE_OFFER_NOTES_LENGTH
        ) {
            setOfferFormError('');
        } else {
            setOfferFormError('Offer notes must be 1000 characters or fewer.');
        }
    };

    const handleRentalApplicationChange = (field: keyof RentalApplicationForm, value: string) => {
        setRentalApplicationForm((previous) => ({ ...previous, [field]: value }));
        setRentalApplicationErrors((previous) => {
            if (!previous[field]) {
                return previous;
            }
            const next = { ...previous };
            delete next[field];
            return next;
        });
    };

    const handleSubmitRentalApplication = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!property || !ensureAuthenticated()) {
            return;
        }

        const managerId = ensureWorkflowManagerReady();
        if (!managerId) {
            return;
        }

        if (rentalApplicationFastTrackBlocker) {
            toast.error(rentalApplicationFastTrackBlocker);
            return;
        }

        const normalizedForm = normalizeRentalApplicationForm(rentalApplicationForm);
        const validationErrors = getRentalApplicationValidationErrors(normalizedForm, minimumRentalApplicationMoveInDate);
        setRentalApplicationErrors(validationErrors);
        if (Object.keys(validationErrors).length > 0) {
            toast.error('Please check the rental application details.');
            return;
        }

        if (rentalApplicationInFlightRef.current) {
            return;
        }

        rentalApplicationInFlightRef.current = true;
        setIsSubmittingRentalApplication(true);
        try {
            const leaseDurationMonths = Number(normalizedForm.leaseDurationMonths);
            const annualIncome = normalizedForm.annualIncome ? Number(normalizedForm.annualIncome) : undefined;
            const result = await submitRentalApplication({
                property_id: property.id,
                manager_id: managerId,
                lead_id: activeLead?.id || activeFastTrackCase?.leadId,
                fast_track_case_id: activeFastTrackCase?.id,
                applicant_name: displayName,
                applicant_email: user?.email,
                applicant_phone: user?.phone || user?.user_metadata?.phone || '',
                property_title: property.title,
                property_address: propertyAddress,
                property_country: property.country,
                property_image: coverImage,
                property_type: property.property_type,
                listing_type: 'rent',
                property_price: typeof property.price === 'number' ? property.price : undefined,
                agent_name: workflowRecipientName,
                agent_email: workflowRecipientEmail,
                agent_phone: workflowRecipientPhone,
                agent_agency: workflowRecipientAgency,
                move_in_date: normalizedForm.moveInDate,
                lease_duration_months: leaseDurationMonths,
                employment_status: normalizedForm.employmentStatus,
                employer_name: normalizedForm.employerName,
                annual_income: annualIncome,
                current_address: normalizedForm.currentAddress,
                message: normalizedForm.message,
            });

            if (result.error || !result.data) {
                throw new Error(result.error || 'Unable to submit the rental application.');
            }

            publishWorkspaceSync({
                source: 'mutation',
                tags: [
                    WORKSPACE_SYNC_TAGS.APPLICATIONS,
                    WORKSPACE_SYNC_TAGS.FAST_TRACK,
                    WORKSPACE_SYNC_TAGS.MANAGER_DASHBOARD,
                ],
                reason: 'User submitted rental application from property detail',
                ids: {
                    applicationId: result.data.id,
                    propertyId: property.id,
                    leadId: activeLead?.id || activeFastTrackCase?.leadId,
                    caseId: activeFastTrackCase?.id,
                },
            });
            toast.success('Rental application submitted.');
            navigate(buildWorkspacePath('/user/applications', {
                applicationId: result.data.id,
                propertyId: property.id,
                caseId: activeFastTrackCase?.id,
                leadId: activeLead?.id || activeFastTrackCase?.leadId,
            }));
        } catch (actionError: any) {
            toast.error(actionError?.message || 'Unable to submit the rental application.');
        } finally {
            rentalApplicationInFlightRef.current = false;
            setIsSubmittingRentalApplication(false);
        }
    };

    const handleScheduleViewing = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!property || !ensureAuthenticated()) {
            return;
        }

        const managerId = ensureWorkflowManagerReady();
        if (!managerId) {
            return;
        }

        const validationErrors = getViewingRequestValidationErrors(viewingForm);
        setViewingFormErrors(validationErrors);

        if (Object.keys(validationErrors).length > 0) {
            toast.error('Please choose a viewing date and time.');
            return;
        }

        setIsSchedulingViewing(true);
        try {
            const viewing = await bookingsService.createViewing({
                property_id: property.id,
                manager_id: managerId,
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
                agent_name: workflowRecipientName,
                agent_email: workflowRecipientEmail,
                agent_phone: workflowRecipientPhone,
                agent_agency: workflowRecipientAgency,
                requested_date: viewingForm.requested_date,
                requested_time: viewingForm.requested_time,
                user_notes: viewingForm.user_notes,
            });

            publishWorkspaceSync({
                source: 'mutation',
                tags: [
                    WORKSPACE_SYNC_TAGS.VIEWINGS,
                    WORKSPACE_SYNC_TAGS.APPLICATIONS,
                    WORKSPACE_SYNC_TAGS.FAST_TRACK,
                    WORKSPACE_SYNC_TAGS.MANAGER_DASHBOARD,
                ],
                reason: 'User requested viewing from property detail',
                ids: {
                    viewingId: viewing.id,
                    applicationId: viewing.application_id,
                    propertyId: property.id,
                    leadId: activeLead?.id || activeFastTrackCase?.leadId,
                    caseId: activeFastTrackCase?.id,
                },
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
        return <BrandLoadingScreen variant="section" label="Loading property details..." />;
    }

    if (error || !property) {
        return (
            <div className="max-w-4xl mx-auto py-20 px-4 text-center">
                <div className="bg-red-50 dark:bg-red-900/20 p-8 rounded-2xl border border-red-100 dark:border-red-900/30">
                    <Home className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{error || 'Property Not Found'}</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">The property you are looking for might have been removed or is temporarily unavailable.</p>
                    <button
                        type="button"
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
        <div className="relative mx-auto max-w-[1480px] px-3 py-3 pb-24 sm:px-4 sm:py-8 sm:pb-20">
            <p role="status" aria-live="polite" className="sr-only">
                {savedPropertyStatusMessage}
            </p>
            <div className="pointer-events-none absolute inset-x-10 top-12 -z-10 h-64 rounded-[3rem] bg-orange-50/90 blur-3xl dark:bg-orange-950/20" />
            <div className="pointer-events-none absolute right-0 top-72 -z-10 h-56 w-56 rounded-full bg-stone-100 blur-3xl dark:bg-zinc-900/80" />
            <div className="mb-3 flex min-h-11 items-center justify-between sm:mb-8">
                <button
                    type="button"
                    onClick={handleBackNavigation}
                    className="group flex min-h-11 items-center gap-1.5 rounded-full px-1 text-sm font-medium text-gray-600 transition-colors hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-300 sm:gap-2 sm:text-base"
                >
                    <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                    <span>{backLabel}</span>
                </button>
                <button
                    type="button"
                    onClick={() => void handleSaveToggle()}
                    disabled={isUpdatingSavedProperty}
                    aria-pressed={isSaved}
                    aria-label={isSaved ? `Remove ${property.title} from saved properties` : `Save ${property.title}`}
                    title={isSaved ? `Remove ${property.title} from saved properties` : `Save ${property.title}`}
                    className={`group flex min-h-11 items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-semibold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-70 sm:px-4 ${
                        isSaved
                            ? 'border-orange-200 bg-orange-50 text-orange-700 hover:border-orange-300 hover:text-orange-800 dark:border-orange-900/70 dark:bg-orange-950/40 dark:text-orange-300 dark:hover:border-orange-800 dark:hover:text-orange-200'
                            : 'border-stone-200 bg-white text-gray-700 hover:border-orange-300 hover:text-orange-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-gray-300 dark:hover:border-orange-800 dark:hover:text-orange-400'
                    }`}
                >
                    {isUpdatingSavedProperty ? (
                        <ActionSpinner size={16} className="" />
                    ) : (
                        <Heart size={16} className={isSaved ? 'fill-current' : 'text-gray-400 group-hover:text-orange-500'} />
                    )}
                    <span>{isUpdatingSavedProperty ? 'Saving...' : (isSaved ? 'Saved' : 'Save')}</span>
                </button>
            </div>

            <div className="grid gap-8 xl:grid-cols-[minmax(0,1.36fr)_minmax(420px,0.92fr)] xl:items-start">
                <div className="min-w-0 space-y-8">
                    <div data-mobile-property-hero className="overflow-hidden rounded-[1.35rem] border border-stone-200/80 bg-[#fcfbf8] shadow-[0_24px_64px_-40px_rgba(15,23,42,0.32)] dark:border-zinc-800 dark:bg-zinc-900 sm:rounded-[2.4rem] sm:shadow-[0_32px_80px_-42px_rgba(15,23,42,0.28)]">
                        <div className="relative">
                            {galleryDisplayState.hasImages ? (
                                <button
                                    type="button"
                                    onClick={(event) => openGallery(undefined, event.currentTarget)}
                                    className="relative block aspect-[16/10] w-full cursor-zoom-in overflow-hidden bg-gray-100 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:bg-zinc-800 sm:aspect-[4/3] md:aspect-[16/9]"
                                    aria-label={`Open image gallery for ${property.title}`}
                                >
                                    <img
                                        src={coverImage}
                                        alt={property.title}
                                        className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
                                        onError={(event) => {
                                            event.currentTarget.src = PROPERTY_PLACEHOLDER_IMAGE;
                                        }}
                                    />
                                    <div className="pointer-events-none absolute inset-0 bg-black/10" />
                                </button>
                            ) : (
                                <div className="relative block aspect-[16/10] w-full cursor-default overflow-hidden bg-gray-100 dark:bg-zinc-800 sm:aspect-[4/3] md:aspect-[16/9]">
                                    <img
                                        src={coverImage}
                                        alt={`Property media unavailable for ${property.title}`}
                                        className="h-full w-full object-cover"
                                    />
                                    <div className="pointer-events-none absolute inset-0 bg-black/10" />
                                </div>
                            )}
                            <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2 sm:left-5 sm:top-5">
                                <span className={`rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] shadow-lg sm:px-4 sm:text-xs sm:tracking-[0.18em] ${
                                    property.listing_type === 'rent'
                                        ? 'bg-sky-700 text-white'
                                        : 'bg-emerald-700 text-white'
                                }`}>
                                    {listingLabel}
                                </span>
                                {property.is_verified && (
                                    <span className="hidden rounded-full border border-white/80 bg-white/88 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gray-900 shadow-sm backdrop-blur sm:inline-flex">
                                        Verified listing
                                    </span>
                                )}
                            </div>
                            <div className="absolute right-3 top-3 flex items-center gap-2 sm:right-5 sm:top-5">
                                <div className="pointer-events-none rounded-full border border-white/75 bg-white/88 px-3 py-2 text-xs font-semibold text-gray-900 shadow-lg backdrop-blur sm:px-4 sm:text-sm">
                                    {galleryDisplayState.positionLabel}
                                </div>
                                {galleryDisplayState.hasImages && (
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            openGallery(undefined, event.currentTarget);
                                        }}
                                        className="hidden min-h-11 items-center gap-2 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-sm font-semibold text-gray-900 shadow-lg transition hover:bg-white sm:inline-flex"
                                    >
                                        <ImageIcon size={15} className="text-orange-500" />
                                        <span>Open gallery</span>
                                    </button>
                                )}
                            </div>
                            {images.length > 1 && (
                                <>
                                    <button
                                        type="button"
                                        onClick={(event) => {
                                            event.stopPropagation();
                                            showPreviousImage();
                                        }}
                                        className="absolute left-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/88 text-gray-900 shadow-lg transition hover:bg-white sm:left-5 sm:flex"
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
                                        className="absolute right-2 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 bg-white/88 text-gray-900 shadow-lg transition hover:bg-white sm:right-5 sm:flex"
                                        aria-label="Show next property image"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </>
                            )}
                            {galleryDisplayState.hasImages && (
                                <button
                                    type="button"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        openGallery(undefined, event.currentTarget);
                                    }}
                                    className="absolute bottom-3 right-3 inline-flex min-h-10 items-center gap-1.5 rounded-full border border-white/80 bg-white/94 px-3 py-2 text-xs font-semibold text-gray-900 shadow-lg backdrop-blur transition hover:bg-white sm:hidden"
                                    aria-label={`Open full-screen gallery for ${property.title}`}
                                >
                                    <ImageIcon size={16} className="text-orange-500" />
                                    Gallery
                                </button>
                            )}
                        </div>
                        <div className="border-t border-stone-200/80 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900 sm:px-6 sm:py-6">
                            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
                                <div className="min-w-0">
                                    <p className="hidden text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400 sm:block">Property gallery</p>
                                    <h1 className="break-words text-[1.35rem] font-semibold leading-[1.12] tracking-tight text-gray-900 sm:mt-3 sm:text-3xl md:text-[2.45rem] dark:text-white">
                                        {property.title}
                                    </h1>
                                    <div className="mt-2.5 flex items-start gap-1.5 text-[13px] leading-5 text-gray-500 dark:text-gray-400 sm:mt-3 sm:gap-2 sm:text-sm">
                                        <MapPin size={15} className="mt-0.5 shrink-0 text-orange-500 sm:size-4" />
                                        <span>{propertyAddress || locationLabel}</span>
                                    </div>
                                    <div data-mobile-property-summary className="mt-3.5 rounded-[1.15rem] border border-stone-200/80 bg-[#faf7f2] p-3.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:hidden">
                                        <div className="flex items-end justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-400">Guide price</p>
                                                <p className="mt-1 whitespace-nowrap text-[1.45rem] font-semibold leading-none tracking-tight text-gray-900 dark:text-white">
                                                    {priceLabel}
                                                    {property.listing_type === 'rent' && typeof property.price === 'number' && (
                                                        <span className="ml-1 text-[10px] font-medium text-gray-500 dark:text-gray-400">/month</span>
                                                    )}
                                                </p>
                                            </div>
                                            <span className="shrink-0 rounded-full bg-white px-2.5 py-1.5 text-[11px] font-semibold text-gray-600 shadow-sm dark:bg-zinc-900 dark:text-gray-300">
                                                {images.length} {images.length === 1 ? 'photo' : 'photos'}
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={(event) => handleFastTrackEntryAction(event.currentTarget)}
                                            disabled={isFastTrackCtaDisabled}
                                            className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-orange-600 px-3 py-2.5 text-[13px] font-semibold text-white shadow-lg shadow-orange-600/15 transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            {isFastTrackCtaBusy ? <ActionSpinner size={15} className="" /> : <Upload size={15} />}
                                            <span>{isStartingFastTrack ? fastTrackBusyActionLabel : fastTrackSidebarActionLabel}</span>
                                        </button>
                                    </div>
                                    <p className="mt-3 line-clamp-3 max-w-2xl text-[13px] leading-5 text-gray-500 dark:text-gray-400 sm:mt-4 sm:line-clamp-none sm:text-sm sm:leading-7">
                                        {propertyHeroSummary}
                                    </p>

                                    {images.length > 1 ? (
                                        <div className="mt-6 hidden sm:block">
                                            <div className="flex items-center justify-between gap-3">
                                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Switch photos directly</p>
                                                <button
                                                        type="button"
                                                        onClick={(event) => openGallery(selectedImageIndex, event.currentTarget)}
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
                                                        aria-pressed={index === selectedImageIndex}
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
                                            <span>{realImageCount === 0 ? 'No property photos available' : '1 curated photo available'}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    <div className="hidden rounded-[1.8rem] border border-stone-200/80 bg-[#faf7f2] p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 sm:block">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-gray-400">Guide price</p>
                                        <p className="mt-3 text-[2rem] font-semibold tracking-tight text-gray-900 dark:text-white">
                                            {priceLabel}
                                            {property.listing_type === 'rent' && typeof property.price === 'number' && (
                                                <span className="ml-1 text-sm font-medium text-gray-500 dark:text-gray-400">/month</span>
                                            )}
                                        </p>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {galleryDisplayState.hasImages && (
                                                <button
                                                    type="button"
                                                    onClick={(event) => openGallery(selectedImageIndex, event.currentTarget)}
                                                    className="inline-flex items-center gap-2 rounded-[1.1rem] bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                                                >
                                                    <ImageIcon size={16} />
                                                    <span>Open full-screen gallery</span>
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                onClick={(event) => {
                                                    handleFastTrackEntryAction(event.currentTarget);
                                                }}
                                                disabled={isFastTrackCtaDisabled}
                                                className="inline-flex items-center gap-2 rounded-[1.1rem] border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white"
                                            >
                                                {isFastTrackCtaBusy ? <ActionSpinner size={16} className="" /> : <Upload size={16} className="text-orange-500" />}
                                                <span>{isStartingFastTrack ? fastTrackBusyActionLabel : fastTrackSidebarActionLabel}</span>
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
                                                    {liveLeadDispatchLabel}
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
                                        {propertySnapshotNarrative}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {propertyVideos.length > 0 && (
                        <section
                            aria-labelledby="property-videos-heading"
                            className="rounded-[2.1rem] border border-stone-200/80 bg-white/95 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 md:p-7"
                        >
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 dark:bg-orange-950/30 dark:text-orange-300">
                                    <Video size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Property video</p>
                                    <h2 id="property-videos-heading" className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">
                                        Explore this home in motion
                                    </h2>
                                </div>
                            </div>
                            <div className="mt-6 grid gap-5 lg:grid-cols-2">
                                {propertyVideos.map((videoUrl, index) => (
                                    <video
                                        key={`${videoUrl}-${index}`}
                                        controls
                                        preload="metadata"
                                        className="aspect-video w-full rounded-[1.5rem] bg-black object-contain shadow-sm"
                                    >
                                        <source src={videoUrl} />
                                        Your browser does not support property videos.
                                    </video>
                                ))}
                            </div>
                        </section>
                    )}

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
                                {propertySnapshotIntro}
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
                                {propertySnapshotNarrative}
                            </div>
                        </section>
                    </div>

                    <section
                        aria-labelledby="property-reviews-heading"
                        className="rounded-[2.1rem] border border-stone-200/80 bg-white/95 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 md:p-7"
                    >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Reviews & ratings</p>
                                <h3 id="property-reviews-heading" className="mt-3 text-[1.9rem] font-semibold leading-tight tracking-tight text-gray-900 dark:text-white">
                                    Public feedback for this listing
                                </h3>
                            </div>
                            <div className="w-fit rounded-[1.4rem] border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-700 shadow-sm dark:border-yellow-900/50 dark:bg-yellow-950/30 dark:text-yellow-300">
                                {propertyReviewTotal > 0
                                    ? `${propertyReviewAverage.toFixed(1)} average from ${propertyReviewTotal} review${propertyReviewTotal === 1 ? '' : 's'}`
                                    : 'No public rating yet'}
                            </div>
                        </div>

                        {propertyReviewsLoading ? (
                            <div className="mt-6 rounded-[1.5rem] border border-dashed border-stone-200 bg-stone-50 p-6 text-sm font-medium text-gray-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-gray-400">
                                Loading public reviews...
                            </div>
                        ) : propertyReviews.length > 0 ? (
                            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {propertyReviews.slice(0, 3).map((review, index) => (
                                    <article
                                        key={review.id}
                                        className="rounded-[1.5rem] border border-stone-200/80 bg-stone-50 px-4 py-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
                                        aria-label={`Approved review ${index + 1}: ${review.rating} out of 5 stars`}
                                    >
                                        <div className="flex items-center gap-1" aria-hidden="true">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    size={16}
                                                    className={star <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 dark:text-gray-700'}
                                                />
                                            ))}
                                        </div>
                                        <p className="mt-4 text-sm font-medium leading-6 text-gray-700 dark:text-gray-300">
                                            "{review.comment}"
                                        </p>
                                        <div className="mt-4 flex items-center justify-between gap-3 text-xs font-semibold text-gray-500 dark:text-gray-400">
                                            <span>Approved review</span>
                                            <time dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString()}</time>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        ) : (
                            <div className="mt-6 rounded-[1.5rem] border border-dashed border-stone-300 bg-stone-50 p-6 text-sm leading-6 text-gray-600 dark:border-zinc-700 dark:bg-zinc-950 dark:text-gray-300">
                                No approved public reviews are available for this property yet. Reviews will appear here after admin moderation.
                            </div>
                        )}
                    </section>

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

                        <section className="rounded-[2.1rem] border border-stone-200/80 bg-white/95 p-6 shadow-sm backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 md:p-7">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Location & maps</p>
                                    <h3 className="mt-3 text-[1.9rem] font-semibold leading-tight tracking-tight text-gray-900 dark:text-white">
                                        Open the property in {preferredMapsLabel}
                                    </h3>
                                    <p className="mt-3 max-w-[34rem] text-sm leading-6 text-gray-600 dark:text-gray-300">
                                        {propertyMapState.statusDescription}
                                    </p>
                                </div>
                                {propertyMapState.externalUrl && (
                                    <a
                                        href={propertyMapState.externalUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-2 rounded-[1.2rem] border border-stone-200 bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition hover:border-orange-300 hover:bg-orange-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                                    >
                                        <span>Open in Maps</span>
                                        <ExternalLink size={16} />
                                    </a>
                                )}
                            </div>

                            {propertyMapState.externalUrl ? (
                                <a
                                    href={propertyMapState.externalUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="group mt-6 block"
                                    aria-label={`Open ${property?.title || 'property'} in ${preferredMapsLabel}`}
                                >
                                    <div className="relative aspect-[16/10] overflow-hidden rounded-[1.7rem] border border-stone-200/80 bg-stone-100 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                                        {propertyMapState.embedUrl ? (
                                            <iframe
                                                src={propertyMapState.embedUrl}
                                                title={`Map preview for ${property?.title || 'property'}`}
                                                className="pointer-events-none h-full w-full border-0"
                                                allowFullScreen
                                            />
                                        ) : (
                                            <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.18),transparent_38%),linear-gradient(135deg,#f8f3eb,#fff)] dark:bg-[radial-gradient(circle_at_top,rgba(251,146,60,0.18),transparent_38%),linear-gradient(135deg,#18181b,#09090b)]">
                                                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-orange-600 shadow-lg dark:bg-zinc-900 dark:text-orange-300">
                                                    <MapPin size={28} />
                                                </div>
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent transition-opacity group-hover:opacity-95" />
                                        <div className="absolute left-4 top-4 rounded-xl bg-white/95 px-3.5 py-2 text-sm font-semibold text-orange-700 shadow-lg ring-1 ring-black/5 backdrop-blur-sm dark:bg-zinc-900/90 dark:text-orange-200">
                                            <span className="inline-flex items-center gap-2">
                                                <span>Open in Maps</span>
                                                <ExternalLink size={15} />
                                            </span>
                                        </div>
                                        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/75">
                                                {propertyMapState.statusTitle}
                                            </p>
                                            <p className="mt-2 text-sm font-semibold text-white">
                                                {propertyMapAddress}
                                            </p>
                                            <p className="mt-1 text-sm text-white/80">
                                                Opens in {preferredMapsLabel} when you press the map.
                                            </p>
                                        </div>
                                    </div>
                                </a>
                            ) : (
                                <div className="mt-6 rounded-[1.7rem] border border-dashed border-stone-300 bg-stone-50 p-6 text-center dark:border-zinc-700 dark:bg-zinc-950">
                                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-orange-600 dark:bg-orange-950/40 dark:text-orange-200">
                                        <MapPin size={24} />
                                    </div>
                                    <h4 className="mt-4 text-lg font-semibold text-gray-900 dark:text-white">
                                        {propertyMapState.statusTitle}
                                    </h4>
                                    <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                                        {propertyMapState.statusDescription}
                                    </p>
                                </div>
                            )}
                        </section>

                    </div>
                </div>

                <div className="min-w-0 space-y-6 xl:sticky xl:top-8">
                    <div className="overflow-hidden rounded-[2.2rem] border border-stone-200/80 bg-white/95 p-6 shadow-[0_24px_70px_-40px_rgba(15,23,42,0.32)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/92 md:p-7">
                        <div className="rounded-[1.8rem] border border-stone-200/80 bg-[#f8f3eb] p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400">Viewing concierge</p>
                            <h3 className="mt-3 text-2xl font-semibold tracking-tight text-gray-900 dark:text-white">Interested in this property?</h3>
                            <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                                Request manager-approved Fast Track or send a polished viewing request without leaving the page.
                            </p>
                            <div className="mt-5 grid gap-2.5">
                                {conciergeHighlights.map((item) => {
                                    const Icon = item.icon;
                                    const isResponseAction = item.label === 'Response window';
                                    const isTourAction = item.label === 'Tour booking';
                                    const isBusy = isResponseAction && isFastTrackCtaBusy;
                                    const isDisabled = isBusy || (isResponseAction && isFastTrackApprovalPending);

                                    return (
                                        <button
                                            key={item.label}
                                            type="button"
                                            onClick={(event) => {
                                                if (isResponseAction) {
                                                    handleFastTrackEntryAction(event.currentTarget);
                                                    return;
                                                }
                                                if (isTourAction) {
                                                    focusViewingRequestForm();
                                                }
                                            }}
                                            disabled={isDisabled}
                                            className="group flex items-start gap-3 rounded-[1.25rem] border border-stone-200/80 bg-white px-3.5 py-3 text-left shadow-sm transition hover:border-orange-300 hover:bg-orange-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-orange-800 dark:hover:bg-zinc-900/80"
                                        >
                                            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 transition group-hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-200 dark:group-hover:bg-orange-950/70">
                                                {isBusy ? <ActionSpinner size={16} className="" /> : <Icon size={16} />}
                                            </div>
                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400">{item.label}</p>
                                                <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{isBusy ? 'Opening...' : item.value}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="mt-5 grid gap-3">
                            <button
                                ref={fastTrackTriggerRef}
                                type="button"
                                onClick={(event) => {
                                    handleFastTrackEntryAction(event.currentTarget);
                                }}
                                disabled={isFastTrackCtaDisabled}
                                className="w-full rounded-[1.35rem] bg-orange-500 py-4 font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isStartingFastTrack ? fastTrackBusyActionLabel : fastTrackPrimaryActionLabel}
                            </button>
                            <button
                                type="button"
                                onClick={() => openFastTrackDashboard()}
                                disabled={!hasActiveFastTrackJourney}
                                className="w-full rounded-[1.35rem] border border-stone-200 bg-white py-4 font-semibold text-gray-900 transition hover:border-orange-300 hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
                            >
                                {hasActiveFastTrackJourney ? 'Open live workspace' : 'Workspace opens after manager approval'}
                            </button>
                        </div>
                        <div className="mt-4 rounded-[1.35rem] border border-stone-200/80 bg-stone-50 px-4 py-3 text-sm leading-6 text-gray-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-gray-300">
                            Every action stays inside your dashboard, so follow-ups, confirmations, and messages remain in one place.
                        </div>

                        {isSaleOfferListingType(property.listing_type) && (
                            <div className="mt-5">
                                <SaleOfferEntryCard
                                    priceLabel={priceLabel}
                                    offerAmount={offerForm.amount}
                                    offerNotes={offerForm.notes}
                                    error={offerFormError}
                                    isSubmitting={isSubmittingOffer}
                                    onAmountChange={handleSaleOfferAmountChange}
                                    onNotesChange={handleSaleOfferNotesChange}
                                    onSubmit={handleSubmitOffer}
                                />
                            </div>
                        )}

                        {property.listing_type === 'rent' && (
                            <div className="mt-5">
                                <RentalApplicationEntryCard
                                    minimumMoveInDate={minimumRentalApplicationMoveInDate}
                                    form={rentalApplicationForm}
                                    errors={rentalApplicationErrors}
                                    isSubmitting={isSubmittingRentalApplication}
                                    submissionBlocker={rentalApplicationFastTrackBlocker}
                                    onChange={handleRentalApplicationChange}
                                    onSubmit={handleSubmitRentalApplication}
                                />
                            </div>
                        )}

                        <form ref={viewingFormRef} onSubmit={handleScheduleViewing} className="mt-6 w-full max-w-full scroll-mt-24 overflow-hidden rounded-[2rem] border border-stone-200/80 bg-[#faf7f2] shadow-[0_26px_90px_-44px_rgba(15,23,42,0.28)] dark:border-zinc-800 dark:bg-zinc-950">
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
                                                onClick={() => changeViewingCalendarMonth(-1)}
                                                disabled={!canGoToPreviousMonth}
                                                className="flex h-9 w-9 items-center justify-center rounded-full border border-stone-200 bg-white text-gray-700 transition hover:border-orange-300 hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-300"
                                                aria-label="Show previous month"
                                            >
                                                <ChevronLeft size={16} />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => changeViewingCalendarMonth(1)}
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
                                                    aria-label={getViewingCalendarDayAriaLabel(day, isSelected)}
                                                    aria-pressed={isSelected}
                                                    onClick={() => {
                                                        if (day.isDisabled) {
                                                            return;
                                                        }
                                                        setViewingForm((previous) => ({
                                                            ...previous,
                                                            requested_date: day.value,
                                                            requested_time: previous.requested_time && !isViewingTimeSlotUnavailable(day.value, previous.requested_time, bookedViewingSlotsByDate)
                                                                ? previous.requested_time
                                                                : '',
                                                        }));
                                                        setViewingFormErrors((previous) => ({
                                                            ...previous,
                                                            requested_date: undefined,
                                                        }));
                                                    }}
                                                    disabled={day.isDisabled}
                                                    className={`relative flex h-9 items-center justify-center rounded-lg border text-[13px] font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${
                                                        getViewingCalendarDayTone(day, isSelected)
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
                                    {viewingFormErrors.requested_date && (
                                        <p className="mt-3 text-xs font-semibold text-red-600 dark:text-red-300" role="alert">
                                            {viewingFormErrors.requested_date}
                                        </p>
                                    )}

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
                                                const unavailableReason = isPastViewingTimeSlot(viewingForm.requested_date, slot.value) ? 'Time passed' : 'Already booked';

                                                return (
                                                    <ViewingTimeSlotButton
                                                        key={slot.value}
                                                        slot={slot}
                                                        selected={isSelected}
                                                        unavailable={isUnavailable}
                                                        unavailableReason={unavailableReason}
                                                        onSelect={() => {
                                                            setViewingForm((previous) => ({ ...previous, requested_time: slot.value }));
                                                            setViewingFormErrors((previous) => ({
                                                                ...previous,
                                                                requested_time: undefined,
                                                            }));
                                                        }}
                                                    />
                                                );
                                            })}
                                        </div>
                                        {viewingFormErrors.requested_time && (
                                            <p className="mt-3 text-xs font-semibold text-red-600 dark:text-red-300" role="alert">
                                                {viewingFormErrors.requested_time}
                                            </p>
                                        )}
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
                                        {isSchedulingViewing && <ActionSpinner size={15} className="" />}
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
                                    <div className="mt-1 text-xs text-green-700 font-medium flex items-center gap-1 dark:text-green-300">
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
                onClose={closeFastTrackModal}
                onUploadDocument={handleUploadFastTrackDocument}
                onOpenDashboard={() => openFastTrackDashboard()}
                onOpenMessages={handleOpenConversation}
            />

            <FastTrackRequestConfirmationModal
                open={isFastTrackRequestConfirmationOpen}
                propertyTitle={property.title}
                propertyLocation={propertyAddress || locationLabel}
                isSubmitting={false}
                onClose={() => setIsFastTrackRequestConfirmationOpen(false)}
                onConfirm={confirmFastTrackRequest}
            />

            {isGalleryOpen && galleryDisplayState.hasImages && (
                <div
                    className="fixed inset-0 z-[140] overflow-hidden bg-[#05070b] p-0 sm:overflow-y-auto sm:bg-[rgba(8,15,30,0.92)] sm:px-5 sm:py-5 sm:backdrop-blur-md"
                    onClick={closeGallery}
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
                        role="dialog"
                        aria-modal="true"
                        aria-label={getImmersiveGalleryDialogLabel(property.title)}
                        className="relative mx-auto flex h-[100dvh] min-h-0 w-full min-w-0 max-w-[1500px] flex-col overflow-hidden sm:h-auto sm:min-h-full sm:overflow-x-hidden"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="flex min-h-[60px] shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-[#0b0f18]/96 px-3 py-2.5 text-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.7)] backdrop-blur-xl sm:items-start sm:gap-4 sm:rounded-[1.75rem] sm:border sm:bg-white/6 sm:px-5 sm:py-4">
                            <div className="min-w-0">
                                <p className="hidden text-[11px] font-semibold uppercase tracking-[0.24em] text-white/55 sm:block">Full-screen gallery</p>
                                <h2 className="truncate text-[15px] font-medium tracking-tight sm:mt-2 sm:text-[2rem] sm:font-semibold">{property.title}</h2>
                                <div className="mt-2 hidden items-center gap-2 text-sm text-white/70 sm:flex">
                                    <MapPin size={15} className="text-orange-400" />
                                    <span className="truncate">{propertyAddress || locationLabel}</span>
                                </div>
                            </div>
                            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                                <div className="whitespace-nowrap rounded-full border border-white/12 bg-white/8 px-2.5 py-1.5 text-[11px] font-medium text-white/80 sm:px-4 sm:py-2 sm:text-sm">
                                    {selectedImageIndex + 1} / {images.length}
                                </div>
                                <button
                                    ref={immersiveGalleryCloseButtonRef}
                                    type="button"
                                    onClick={closeGallery}
                                    className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/15"
                                    aria-label="Close property gallery"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="grid min-h-0 w-full min-w-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-0 sm:mt-4 sm:gap-4 lg:grid-cols-[minmax(0,1.18fr)_320px] lg:grid-rows-1">
                            <div
                                data-testid="immersive-gallery-stage"
                                className="relative min-h-0 min-w-0 overflow-hidden bg-[#05070b] shadow-[0_32px_80px_-38px_rgba(15,23,42,0.88)] sm:aspect-video sm:rounded-[2.2rem] sm:border sm:border-white/10 sm:bg-black/25 lg:aspect-auto lg:min-h-[58vh]"
                            >
                                <img
                                    src={coverImage}
                                    alt=""
                                    aria-hidden="true"
                                    className="absolute inset-0 h-full w-full scale-110 object-cover opacity-30 blur-3xl sm:scale-105 sm:opacity-28 sm:blur-2xl"
                                    onError={(event) => {
                                        event.currentTarget.src = PROPERTY_PLACEHOLDER_IMAGE;
                                    }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/45 sm:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_30%),linear-gradient(180deg,rgba(9,14,27,0.08),rgba(9,14,27,0.48)_45%,rgba(9,14,27,0.8)_100%)]" />

                                {images.length > 1 && (
                                    <>
                                        <button
                                            type="button"
                                            onClick={showPreviousImage}
                                            className="absolute left-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white shadow-lg backdrop-blur transition hover:bg-black/60 sm:left-4"
                                            aria-label="Show previous property image"
                                        >
                                            <ChevronLeft size={18} />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={showNextImage}
                                            className="absolute right-2 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white shadow-lg backdrop-blur transition hover:bg-black/60 sm:right-4"
                                            aria-label="Show next property image"
                                        >
                                            <ChevronRight size={18} />
                                        </button>
                                    </>
                                )}

                                <div
                                    data-testid="immersive-gallery-zoom-surface"
                                    className={`relative z-10 flex h-full items-center justify-center overflow-hidden p-0 sm:px-8 sm:py-10 ${
                                        isImmersiveZoomActive ? 'lg:cursor-zoom-out' : 'lg:cursor-zoom-in'
                                    }`}
                                    onMouseMove={handleImmersiveGalleryMouseMove}
                                    onMouseLeave={handleImmersiveGalleryMouseLeave}
                                >
                                    <div className="pointer-events-none absolute left-5 top-5 z-20 hidden rounded-full border border-white/15 bg-black/24 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/82 shadow-lg backdrop-blur-md lg:block">
                                        {isImmersiveZoomActive ? 'Move to inspect details' : 'Hover to zoom'}
                                    </div>
                                    <img
                                        ref={immersiveGalleryImageRef}
                                        src={coverImage}
                                        alt={`${property.title} full view ${selectedImageIndex + 1}`}
                                        data-testid="immersive-gallery-image"
                                        className="h-full w-full object-contain shadow-[0_30px_80px_-34px_rgba(0,0,0,0.88)] transition-transform duration-200 ease-out will-change-transform sm:h-auto sm:max-h-[74vh] sm:w-auto sm:max-w-full sm:rounded-[1.7rem]"
                                        style={{
                                            transform: `scale(${isImmersiveZoomActive ? 2.35 : 1})`,
                                            transformOrigin: formatImmersiveGalleryTransformOrigin(immersiveZoomPoint),
                                        }}
                                        onError={(event) => {
                                            event.currentTarget.src = PROPERTY_PLACEHOLDER_IMAGE;
                                        }}
                                    />
                                </div>

                                <div className="absolute inset-x-0 bottom-0 z-20 p-2.5 sm:p-5">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                        <div className="max-w-lg rounded-full border border-white/10 bg-black/50 px-3 py-1.5 text-white shadow-lg backdrop-blur-md sm:rounded-[1.5rem] sm:px-4 sm:py-3">
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/72 sm:text-[11px] sm:tracking-[0.22em] sm:text-white/55">
                                                {images.length > 1 ? `Photo ${selectedImageIndex + 1} of ${images.length}` : 'Featured property view'}
                                            </p>
                                        </div>
                                        <div className="hidden flex-wrap gap-2 sm:flex">
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
                                className="min-w-0 border-t border-white/10 bg-[#0b0f18] px-3 py-3 lg:flex lg:flex-col lg:gap-4 lg:border-0 lg:bg-transparent lg:p-0"
                            >
                                <div className="hidden rounded-[1.8rem] border border-white/10 bg-white/6 p-5 text-white shadow-[0_18px_50px_-28px_rgba(15,23,42,0.7)] backdrop-blur-xl lg:block">
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
                                    <div data-mobile-gallery-dock className="min-w-0 lg:rounded-[1.8rem] lg:border lg:border-white/10 lg:bg-white/6 lg:p-4 lg:shadow-[0_18px_50px_-28px_rgba(15,23,42,0.7)] lg:backdrop-blur-xl">
                                        <div className="hidden items-center justify-between gap-3 lg:flex">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/55">Photo rail</p>
                                            <span className="text-xs font-medium text-white/55">Switch instantly</span>
                                        </div>
                                        <div className="flex max-w-full justify-center gap-2 overflow-x-auto px-0.5 py-0.5 lg:mt-4 lg:flex-col lg:justify-start lg:gap-3 lg:overflow-y-auto lg:overflow-x-hidden lg:pr-1">
                                            {images.map((image, index) => (
                                                    <button
                                                        key={`${image}-${index}-fullscreen`}
                                                        type="button"
                                                        aria-pressed={index === selectedImageIndex}
                                                        onClick={() => setSelectedImageIndex(index)}
                                                        className={`group relative h-14 w-16 shrink-0 overflow-hidden rounded-xl border transition lg:h-28 lg:w-full lg:rounded-[1.25rem] ${
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
                                                    <div className="absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black/70 to-transparent px-3 py-2 text-left text-[11px] font-semibold text-white lg:block">
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
