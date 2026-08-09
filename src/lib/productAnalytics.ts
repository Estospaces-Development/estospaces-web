import axios from 'axios';

const CONSENT_KEY = 'estospaces_cookie_consent';
const SALESIQ_SCRIPT_ID = 'zsiqscript';
const SALESIQ_WIDGET_URL =
    'https://salesiq.zoho.in/widget?wc=siq338477be5e895c804b660f4765d048440ae1b20b437769a0cdecedd3b5619524';

const EVENT_NAMES = new Set([
    'api_operation_failed',
    'api_operation_succeeded',
    'product_route_viewed',
    'registration_completed',
    'user_identified',
]);

const PROPERTY_NAMES = new Set([
    'action',
    'area',
    'method',
    'outcome',
    'resource',
    'role',
    'service',
    'status',
]);

const RESOURCE_MATCHERS: Array<[RegExp, string]> = [
    [/\/auth\/login(?:\/|$)/, 'auth_login'],
    [/\/auth\/register(?:\/|$)/, 'auth_registration'],
    [/\/auth\/logout(?:\/|$)/, 'auth_logout'],
    [/\/auth\/me(?:\/|$)/, 'auth_session'],
    [/\/auth(?:\/|$)/, 'auth'],
    [/\/(?:saved-properties|favorites)(?:\/|$)/, 'saved_property'],
    [/\/(?:broker-requests|leads)(?:\/|$)/, 'lead'],
    [/\/applications(?:\/|$)/, 'application'],
    [/\/(?:appointments|viewings)(?:\/|$)/, 'viewing'],
    [/\/bookings(?:\/|$)/, 'booking'],
    [/\/(?:fast-track|fasttrack|case-files)(?:\/|$)/, 'fast_track'],
    [/\/documents?(?:\/|$)/, 'document'],
    [/\/contracts?(?:\/|$)/, 'contract'],
    [/\/(?:payments?|checkout|refunds?)(?:\/|$)/, 'payment'],
    [/\/(?:messages?|conversations?|support)(?:\/|$)/, 'messaging'],
    [/\/(?:media|uploads?)(?:\/|$)/, 'media'],
    [/\/notifications?(?:\/|$)/, 'notification'],
    [/\/reviews?(?:\/|$)/, 'review'],
    [/\/users?\/profile(?:\/|$)/, 'profile'],
    [/\/preferences(?:\/|$)/, 'preferences'],
    [/\/(?:managers?|brokers?)(?:\/|$)/, 'professional'],
    [/\/search(?:\/|$)/, 'property_search'],
    [/\/properties?(?:\/|$)/, 'property'],
    [/\/admin(?:\/|$)/, 'admin'],
];

const ACTION_MATCHERS: Array<[RegExp, string]> = [
    [/\/login(?:\/|$)/, 'login'],
    [/\/register(?:\/|$)/, 'register'],
    [/\/logout(?:\/|$)/, 'logout'],
    [/\/forgot-password(?:\/|$)/, 'recover'],
    [/\/reset-password(?:\/|$)/, 'reset'],
    [/\/resend-verification(?:\/|$)/, 'resend'],
    [/\/(?:search|suggestions?)(?:\/|$)/, 'search'],
    [/\/(?:favorite|save)(?:\/|$)/, 'save'],
    [/\/share(?:\/|$)/, 'share'],
    [/\/(?:inquiry|enquiry|contact)(?:\/|$)/, 'enquire'],
    [/\/upload(?:\/|$)/, 'upload'],
    [/\/download(?:\/|$)/, 'download'],
    [/\/verify(?:\/|$)/, 'verify'],
    [/\/accept(?:\/|$)/, 'accept'],
    [/\/reject(?:\/|$)/, 'reject'],
    [/\/cancel(?:\/|$)/, 'cancel'],
    [/\/complete(?:\/|$)/, 'complete'],
    [/\/schedule(?:\/|$)/, 'schedule'],
];

const ROUTE_AREAS: Array<[RegExp, string]> = [
    [/^\/auth\/login\/?$/, 'auth.login'],
    [/^\/auth\/register\/?$/, 'auth.register'],
    [/^\/auth\/verify-email\/?$/, 'auth.verify_email'],
    [/^\/auth\/forgot-password\/?$/, 'auth.forgot_password'],
    [/^\/auth\/reset-password\/?$/, 'auth.reset_password'],
    [/^\/user\/search(?:\/|$)/, 'user.search'],
    [/^\/user\/properties(?:\/|$)/, 'user.property'],
    [/^\/user\/bookings(?:\/|$)/, 'user.booking'],
    [/^\/user\/dashboard\/fast-track(?:\/|$)/, 'user.fast_track'],
    [/^\/user\/dashboard\/viewings(?:\/|$)/, 'user.viewing'],
    [/^\/user\/dashboard\/messages(?:\/|$)/, 'user.messages'],
    [/^\/user\/dashboard\/payments(?:\/|$)/, 'user.payments'],
    [/^\/user\/dashboard\/contracts(?:\/|$)/, 'user.contracts'],
    [/^\/user\/dashboard(?:\/|$)/, 'user.dashboard'],
    [/^\/manager\/analytics(?:\/|$)/, 'manager.analytics'],
    [/^\/manager\/(?:dashboard\/)?properties(?:\/|$)/, 'manager.properties'],
    [/^\/manager\/fast-track(?:\/|$)/, 'manager.fast_track'],
    [/^\/manager\/messages(?:\/|$)/, 'manager.messages'],
    [/^\/manager\/contracts(?:\/|$)/, 'manager.contracts'],
    [/^\/manager\/profile(?:\/|$)/, 'manager.profile'],
    [/^\/manager\/dashboard(?:\/|$)/, 'manager.dashboard'],
    [/^\/admin\/analytics(?:\/|$)/, 'admin.analytics'],
    [/^\/admin(?:\/|$)/, 'admin.workspace'],
    [/^\/$/, 'public.home'],
];

interface SalesIqVisitorApi {
    customaction?: (action: string) => void;
    email?: (email: string) => void;
    id?: (id: string) => void;
    name?: (name: { firstname: string; lastname: string; salutation: string }) => void;
}

interface SalesIqApi {
    domain?: (domain: string) => void;
    privacy?: { updateCookieConsent?: (categories: string[]) => void };
    ready?: () => void;
    reset?: () => void;
    visitor?: SalesIqVisitorApi;
}

interface SalesIqWindow extends Window {
    $zoho?: { salesiq?: SalesIqApi };
}

export interface ProductAnalyticsIdentity {
    email: string;
    firstName: string;
    id: string;
    lastName: string;
    role: string;
}

export interface ApiActivity {
    action: string;
    method: string;
    resource: string;
    service: string;
}

const queuedActions: string[] = [];
const recentEvents = new Map<string, number>();
let currentIdentity: ProductAnalyticsIdentity | null = null;
let salesIqInitialized = false;
let axiosResponseInterceptor: number | null = null;

function getAnalyticsWindow() {
    return typeof window === 'undefined' ? null : (window as SalesIqWindow);
}

export function getProductAnalyticsConsent() {
    try {
        return globalThis.localStorage?.getItem(CONSENT_KEY) || 'unset';
    } catch {
        return 'unset';
    }
}

export function setProductAnalyticsConsent(value: 'accepted' | 'rejected') {
    try {
        globalThis.localStorage?.setItem(CONSENT_KEY, value);
    } catch {
        // Consent remains in component state when storage is unavailable.
    }
}

function sanitizeValue(value: unknown) {
    if (!['boolean', 'number', 'string'].includes(typeof value)) return '';
    return String(value).replace(/[|=\r\n]/g, '_').trim().slice(0, 40);
}

export function buildSalesIqAction(name: string, properties: Record<string, unknown> = {}) {
    if (!EVENT_NAMES.has(name)) return null;

    const context = Object.entries(properties)
        .filter(([key]) => PROPERTY_NAMES.has(key))
        .map(([key, value]) => [key, sanitizeValue(value)] as const)
        .filter(([, value]) => value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => `${key}=${value}`)
        .join('|');
    const action = context ? `estospaces:${name}|${context}` : `estospaces:${name}`;
    return action.slice(0, 250);
}

function salesIq() {
    return getAnalyticsWindow()?.$zoho?.salesiq;
}

function applyIdentity() {
    if (!currentIdentity || getProductAnalyticsConsent() !== 'accepted') return;
    const visitor = salesIq()?.visitor;
    if (!visitor) return;

    if (currentIdentity.id) {
        visitor.id?.(currentIdentity.id.slice(0, 100));
    }
    visitor.email?.(currentIdentity.email.slice(0, 160));
    visitor.name?.({
        firstname: currentIdentity.firstName.slice(0, 80),
        lastname: currentIdentity.lastName.slice(0, 80),
        salutation: '',
    });
}

function flushActions() {
    const send = salesIq()?.visitor?.customaction;
    if (typeof send !== 'function') return;
    while (queuedActions.length) send(queuedActions.shift()!);
}

export function startProductAnalytics() {
    // Zoho SalesIQ chatbot removed from the application.
    // The built-in messaging system is used instead.
    // Consent is still recorded for cookie preference management.
    return false;
}

export function startAxiosProductAnalytics() {
    // Zoho SalesIQ removed — no API event tracking.
}

export function setProductAnalyticsIdentity(_identity: ProductAnalyticsIdentity) {
    // Zoho SalesIQ removed — identity is no longer pushed to the widget.
}

export function resetProductAnalyticsIdentity() {
    // Zoho SalesIQ removed — nothing to reset.
}

export function trackProductEvent(_name: string, _properties: Record<string, unknown> = {}): boolean {
    // Zoho SalesIQ removed — events are no longer sent to the widget.
    return false;
}

function serviceFromUrl(url: URL) {
    const match = url.pathname.match(/\/(?:__api|__dev_proxy)\/(core|booking|payment|notification|search|media|messaging)(?:\/|$)/);
    if (match) return match[1];
    const hostMatch = url.hostname.match(/estospaces-(core|booking|payment|notification|search|media|messaging)-service/);
    return hostMatch?.[1] || 'unknown';
}

export function classifyApiActivity(input: string, method = 'GET'): ApiActivity {
    const url = new URL(input, 'https://app.estospaces.com');
    const path = url.pathname.toLowerCase();
    const resource = RESOURCE_MATCHERS.find(([pattern]) => pattern.test(path))?.[1] || 'other';
    const explicitAction = ACTION_MATCHERS.find(([pattern]) => pattern.test(path))?.[1];
    const normalizedMethod = method.toUpperCase();
    const action = explicitAction || ({ GET: 'read', POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete' }[normalizedMethod] || 'request');

    return {
        action,
        method: normalizedMethod,
        resource,
        service: serviceFromUrl(url),
    };
}

function statusClass(status: number | 'application' | 'network') {
    return typeof status === 'number' ? `${Math.floor(status / 100)}xx` : status;
}

export function trackApiOutcome(
    _url: string,
    _method: string,
    _succeeded: boolean,
    _status: number | 'application' | 'network',
): void {
    // Zoho SalesIQ removed — no API event tracking.
}

export function classifyProductRoute(pathname: string) {
    const normalizedPath = `/${pathname}`.replace(/\/{2,}/g, '/').toLowerCase();
    return ROUTE_AREAS.find(([pattern]) => pattern.test(normalizedPath))?.[1] || 'product.other';
}

export { CONSENT_KEY as PRODUCT_ANALYTICS_CONSENT_KEY };
