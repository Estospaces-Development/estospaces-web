"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getServiceUrl } from '@/lib/apiUtils';
import { getAuthPath, getHostedLoginRedirectUrl, getLoginPath, getRedirectPath, requiresHostedLoginRedirect } from '@/lib/authUtils';
import AuthBrand from '@/components/auth/AuthBrand';
import TermsDocument, { TERMS_LAST_UPDATED, TERMS_VERSION } from '@/components/legal/TermsDocument';
import { Check, X, Eye, EyeOff, User, Briefcase, RefreshCw, FileText, Shield } from 'lucide-react';
import axios from 'axios';

const API_URL = getServiceUrl('core');
const authFocusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900';
export const REGISTER_DRAFT_STORAGE_KEY = 'estospaces:register:draft:v1';

type RegisterDraft = {
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    country: string;
};

const MANAGER_COUNTRIES = ['India', 'United Kingdom'] as const;

function normalizeRegisterCountry(value: string): string {
    return (MANAGER_COUNTRIES as readonly string[]).includes(value) ? value : '';
}

const commonMistypedEmailTlds = new Set([
    'cim',
    'cmo',
    'cm',
    'con',
    'comm',
    'coom',
    'nett',
    'orrg',
]);

export function normalizeRegisterEmail(value: string): string {
    return value.trim().toLowerCase();
}

export function validateRegisterName(value: string, label = 'Name'): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
        return `Please enter your ${label.toLowerCase()}`;
    }
    if (trimmed.length < 2) {
        return `${label} must be at least 2 characters`;
    }
    if (trimmed.length > 80) {
        return `${label} must be 80 characters or fewer`;
    }
    if (!/^[A-Za-z .'-]+$/.test(trimmed)) {
        return `${label} can only include letters, spaces, apostrophes, periods, and hyphens`;
    }
    if ((trimmed.match(/[A-Za-z]/g) || []).length < 2) {
        return `${label} must include at least 2 letters`;
    }
    return null;
}

export function buildRegisterFullName(firstName: string, lastName: string): string {
    return [firstName.trim(), lastName.trim()].filter(Boolean).join(' ');
}

export function validateRegisterEmail(value: string): string | null {
    const trimmed = normalizeRegisterEmail(value);
    if (!trimmed) {
        return 'Please enter a valid email address';
    }
    if (trimmed.length > 254 || /\s/.test(trimmed)) {
        return 'Please enter a valid email address';
    }
    if (!/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,24}$/.test(trimmed)) {
        return 'Please enter a valid email address';
    }

    const tld = trimmed.split('.').pop() || '';
    if (commonMistypedEmailTlds.has(tld)) {
        return 'Please enter a valid email address';
    }

    return null;
}

function normalizeRegisterRole(value: string): string {
    return value === 'manager' ? 'manager' : 'user';
}

function readRegisterDraft(): RegisterDraft | null {
    if (typeof window === 'undefined') {
        return null;
    }

    try {
        const rawDraft = window.sessionStorage.getItem(REGISTER_DRAFT_STORAGE_KEY);
        if (!rawDraft) {
            return null;
        }
        const parsed = JSON.parse(rawDraft) as Partial<RegisterDraft> & { name?: unknown };
        const legacyName = typeof parsed.name === 'string' ? parsed.name.trim() : '';
        const legacyNameParts = legacyName.split(/\s+/).filter(Boolean);
        return {
            firstName: typeof parsed.firstName === 'string' ? parsed.firstName : (legacyNameParts[0] || ''),
            lastName: typeof parsed.lastName === 'string' ? parsed.lastName : legacyNameParts.slice(1).join(' '),
            email: typeof parsed.email === 'string' ? parsed.email : '',
            role: normalizeRegisterRole(typeof parsed.role === 'string' ? parsed.role : 'user'),
            country: normalizeRegisterCountry(typeof parsed.country === 'string' ? parsed.country : ''),
        };
    } catch {
        window.sessionStorage.removeItem(REGISTER_DRAFT_STORAGE_KEY);
        return null;
    }
}

function saveRegisterDraft(draft: RegisterDraft) {
    if (typeof window === 'undefined') {
        return;
    }

    window.sessionStorage.setItem(
        REGISTER_DRAFT_STORAGE_KEY,
        JSON.stringify({
            firstName: draft.firstName,
            lastName: draft.lastName,
            email: draft.email,
            role: normalizeRegisterRole(draft.role),
            country: normalizeRegisterCountry(draft.country),
        }),
    );
}

function clearRegisterDraft() {
    if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(REGISTER_DRAFT_STORAGE_KEY);
    }
}

type TermsAcceptanceModalProps = {
    isOpen: boolean;
    canAccept: boolean;
    onClose: () => void;
    onAccept: () => void;
    onReachedEnd: () => void;
};

type PrivacyPolicyModalProps = {
    isOpen: boolean;
    onClose: () => void;
};

function PrivacyPolicyModal({ isOpen, onClose }: PrivacyPolicyModalProps) {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={onClose} />
            <div
                className="relative w-full max-w-3xl rounded-[2rem] bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-labelledby="privacy-dialog-title"
            >
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-600 mb-3">
                            <Shield size={12} />
                            Your Privacy
                        </div>
                        <h3 id="privacy-dialog-title" className="text-xl font-black text-gray-900 dark:text-white">Privacy Policy</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${authFocusClass}`}
                    >
                        Close
                    </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto px-6 py-6 bg-gray-50/80 dark:bg-gray-950/60">
                    <div className="rounded-[1.5rem] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 md:p-8 space-y-4 text-sm text-gray-600 dark:text-gray-400">
                        <p>Last updated: July 2026</p>
                        <h4 className="font-bold text-gray-900 dark:text-white">Information We Collect</h4>
                        <p>We collect information you provide directly to us, such as your name, email address, phone number, and property preferences when you register or use our services.</p>
                        <h4 className="font-bold text-gray-900 dark:text-white">How We Use Your Information</h4>
                        <p>We use your information to provide and improve our property platform, connect you with property managers and agents, and communicate important updates about your inquiries.</p>
                        <h4 className="font-bold text-gray-900 dark:text-white">Data Sharing</h4>
                        <p>We share your information with property managers and agents only when you make a property inquiry or use our Fast Track service. We never sell your personal data to third parties.</p>
                        <h4 className="font-bold text-gray-900 dark:text-white">Your Rights</h4>
                        <p>You can access, update, or delete your personal information at any time through your account settings. For any privacy concerns, contact us at privacy@estospaces.com.</p>
                    </div>
                </div>
                <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 rounded-2xl bg-orange-500 text-white font-bold hover:bg-orange-600 transition-colors"
                    >
                        Got It
                    </button>
                </div>
            </div>
        </div>
    );
}

export function TermsAcceptanceModal({
    isOpen,
    canAccept,
    onClose,
    onAccept,
    onReachedEnd,
}: TermsAcceptanceModalProps) {
    const closeButtonRef = useRef<HTMLButtonElement | null>(null);
    const previousFocusedElementRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        previousFocusedElementRef.current = document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        window.setTimeout(() => closeButtonRef.current?.focus(), 0);

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', handleEscape);

        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handleEscape);
            previousFocusedElementRef.current?.focus();
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={onClose} />
            <div
                className="relative w-full max-w-4xl rounded-[2rem] bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden"
                role="dialog"
                aria-modal="true"
                aria-labelledby="terms-dialog-title"
                aria-describedby="terms-dialog-description"
            >
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-orange-600 mb-3">
                            <FileText size={12} />
                            Required Read-Through
                        </div>
                        <h3 id="terms-dialog-title" className="text-xl font-black text-gray-900 dark:text-white">Review Terms & Conditions</h3>
                        <p id="terms-dialog-description" className="text-sm text-gray-500 mt-1">
                            Scroll through the full terms before accepting. Last updated: {TERMS_LAST_UPDATED}
                        </p>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        onClick={onClose}
                        className={`px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${authFocusClass}`}
                    >
                        Close
                    </button>
                </div>

                <div
                    className="max-h-[60vh] overflow-y-auto px-6 py-6 bg-gray-50/80 dark:bg-gray-950/60"
                    onScroll={(event) => {
                        const element = event.currentTarget;
                        const remaining = element.scrollHeight - element.scrollTop - element.clientHeight;
                        if (remaining <= 16) {
                            onReachedEnd();
                        }
                    }}
                >
                    <div className="rounded-[1.5rem] bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 p-6 md:p-8">
                        <TermsDocument compact />
                    </div>
                </div>

                <div className="px-6 py-5 border-t border-gray-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <p
                        className={`break-words text-sm font-medium ${canAccept ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}
                        aria-live="polite"
                    >
                        {canAccept
                            ? 'You have reached the end of the terms. You can now accept and continue.'
                            : 'Scroll to the bottom of the terms to enable acceptance.'}
                    </p>
                    <button
                        type="button"
                        onClick={onAccept}
                        disabled={!canAccept}
                        className={`px-6 py-3 rounded-2xl bg-orange-500 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors ${authFocusClass}`}
                    >
                        I Have Read and Agree
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function RegisterPage() {
    const navigate = useNavigate();
    const { isAuthenticated, loading: authLoading, getRole, register, signOut, user: authUser } = useAuth();
    const resendCooldownTimerRef = useRef<number | null>(null);
    const registerDraftSaveReadyRef = useRef(false);

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [firstNameError, setFirstNameError] = useState('');
    const [lastNameError, setLastNameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [country, setCountry] = useState('');
    const [countryError, setCountryError] = useState('');
    const [success, setSuccess] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [termsAcceptedAt, setTermsAcceptedAt] = useState('');
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);
    const [hasScrolledTermsToEnd, setHasScrolledTermsToEnd] = useState(false);
    const [resending, setResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [resendMessage, setResendMessage] = useState('');

    const rules: Record<string, boolean> = {
        length: password.length >= 8,
        upper: /[A-Z]/.test(password),
        lower: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        symbol: /[^A-Za-z0-9]/.test(password),
    };

    const allRulesPassed = Object.values(rules).every(Boolean);
    const acceptedTermsLabel = termsAcceptedAt
        ? new Date(termsAcceptedAt).toLocaleString()
        : '';

    const isSwitching = new URLSearchParams(window.location.search).get('switch') === 'true';
    const loginPath = getLoginPath();
    const registerPath = getAuthPath('/register');

    const continueWithRole = async (nextRole?: string) => {
        if (requiresHostedLoginRedirect(nextRole)) {
            await signOut();
            window.location.replace(getHostedLoginRedirectUrl(nextRole));
            return;
        }

        navigate(getRedirectPath(nextRole));
    };

    useEffect(() => () => {
        if (resendCooldownTimerRef.current !== null) {
            window.clearInterval(resendCooldownTimerRef.current);
        }
    }, []);

    useEffect(() => {
        const draft = readRegisterDraft();
        if (!draft) {
            return;
        }

        setFirstName(draft.firstName);
        setLastName(draft.lastName);
        setEmail(draft.email);
        setRole(normalizeRegisterRole(draft.role));
        setCountry(normalizeRegisterCountry(draft.country));
    }, []);

    useEffect(() => {
        if (success) {
            return;
        }
        if (!registerDraftSaveReadyRef.current) {
            registerDraftSaveReadyRef.current = true;
            return;
        }

        saveRegisterDraft({ firstName, lastName, email, role, country });
    }, [country, email, firstName, lastName, role, success]);

    const openTermsModal = () => {
        setHasScrolledTermsToEnd(agreedToTerms);
        setIsTermsModalOpen(true);
    };

    const openPrivacyModal = () => {
        setIsPrivacyModalOpen(true);
    };

    const clearTermsAcceptance = () => {
        setAgreedToTerms(false);
        setTermsAcceptedAt('');
        setHasScrolledTermsToEnd(false);
    };

    const handleTermsCheckboxChange = (checked: boolean) => {
        if (checked) {
            setError('');
            openTermsModal();
            return;
        }

        clearTermsAcceptance();
    };

    const handleAcceptTerms = () => {
        setAgreedToTerms(true);
        setTermsAcceptedAt(new Date().toISOString());
        setError('');
        setIsTermsModalOpen(false);
    };

    const handleFirstNameChange = (value: string) => {
        setFirstName(value);
        setError('');
        if (firstNameError) {
            setFirstNameError(validateRegisterName(value, 'First name') || '');
        }
    };

    const handleLastNameChange = (value: string) => {
        setLastName(value);
        setError('');
        if (lastNameError) {
            setLastNameError(validateRegisterName(value, 'Last name') || '');
        }
    };

    const handleEmailChange = (value: string) => {
        setEmail(value);
        setError('');
        if (emailError) {
            setEmailError(validateRegisterEmail(value) || '');
        }
    };

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        const nextFirstNameError = validateRegisterName(firstName, 'First name');
        const nextLastNameError = lastName.trim() ? (validateRegisterName(lastName, 'Last name') || '') : 'Last name is required.';
        const nextEmailError = validateRegisterEmail(email);
        setFirstNameError(nextFirstNameError || '');
        setLastNameError(nextLastNameError);
        setEmailError(nextEmailError || '');

        const nextCountryError = role === 'manager' && !country ? 'Please select your country' : '';
        setCountryError(nextCountryError);

        if (nextFirstNameError) {
            setError(nextFirstNameError);
            return;
        }
        if (nextLastNameError) {
            setError(nextLastNameError);
            return;
        }
        if (nextCountryError) {
            setError(nextCountryError);
            return;
        }
        if (nextEmailError) {
            setError(nextEmailError);
            return;
        }
        if (!allRulesPassed) {
            setError('Please meet all password requirements');
            return;
        }
        if (!agreedToTerms || !termsAcceptedAt) {
            setError('Please read and accept the Terms and Conditions before creating an account.');
            return;
        }

        setLoading(true);
        setError('');
        const normalizedEmail = normalizeRegisterEmail(email);
        setEmail(normalizedEmail);

        try {
            const result = await register(buildRegisterFullName(firstName, lastName), normalizedEmail, password, role, {
                acceptedAt: termsAcceptedAt,
                version: TERMS_VERSION,
                country: role === 'manager' ? country : undefined,
            });

            if (!result.success) {
                setError(result.error || 'Sign-up failed. Please try again.');
                setLoading(false);
                return;
            }

            clearRegisterDraft();
            setSuccess(true);
        } catch {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>
            </div>
        );
    }

    if (isAuthenticated && !isSwitching) {
        return (
            <div className="flex flex-col items-center text-center w-full">
                <AuthBrand className="mb-6" />

                <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                    Already signed in
                </h1>

                <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                    You are currently signed in as <strong>{authUser?.email}</strong>.
                </p>

                <div className="space-y-3 w-full">
                    <button
                        type="button"
                        onClick={() => void continueWithRole(getRole())}
                        className="w-full py-3 bg-primary text-white font-medium rounded-md hover:bg-opacity-90 transition-all"
                    >
                        Continue to Dashboard
                    </button>
                    <button
                        type="button"
                        onClick={async () => {
                            await signOut();
                            navigate(`${registerPath}?switch=true`);
                        }}
                        className="w-full py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                    >
                        Sign out and create another account
                    </button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="flex flex-col items-center text-center">
                <AuthBrand />

                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                    <Check className="text-green-600 dark:text-green-400" size={32} />
                </div>

                <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                    Account Created!
                </h1>

                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                    We sent a verification link to <strong>{email}</strong>.
                    <br />
                    Please check your inbox and click the link to activate your account.
                </p>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-4 py-3 mb-6 w-full text-left">
                    <p className="text-blue-700 dark:text-blue-300 text-xs font-medium mb-1">Check your email</p>
                    <p className="text-blue-600 dark:text-blue-400 text-xs">The activation link expires in 24 hours. Check your spam folder too.</p>
                </div>

                {resendMessage && (
                    <p className="text-green-600 dark:text-green-400 text-sm mb-4">{resendMessage}</p>
                )}

                <button
                    type="button"
                    onClick={async () => {
                        setResending(true);
                        setResendMessage('');
                        try {
                            await axios.post(`${API_URL}/api/v1/auth/resend-verification`, { email });
                            setResendMessage('Verification email resent! Check your inbox.');
                            setResendCooldown(60);
                            if (resendCooldownTimerRef.current !== null) {
                                window.clearInterval(resendCooldownTimerRef.current);
                            }
                            resendCooldownTimerRef.current = window.setInterval(() => {
                                setResendCooldown((prev) => {
                                    if (prev <= 1) {
                                        if (resendCooldownTimerRef.current !== null) {
                                            window.clearInterval(resendCooldownTimerRef.current);
                                            resendCooldownTimerRef.current = null;
                                        }
                                        return 0;
                                    }
                                    return prev - 1;
                                });
                            }, 1000);
                        } catch {
                            setResendMessage('Failed to resend. Please try again later.');
                        } finally {
                            setResending(false);
                        }
                    }}
                    disabled={resending || resendCooldown > 0}
                    className="w-full py-3 mb-3 bg-primary text-white font-medium rounded-md hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    <RefreshCw size={16} className={resending ? 'animate-spin' : ''} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : resending ? 'Resending...' : 'Resend Verification Email'}
                </button>

                <Link
                    to={loginPath}
                    className="w-full inline-block py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-center"
                >
                    Back to Sign In
                </Link>
            </div>
        );
    }

    return (
        <>
            <div className="flex flex-col items-center">
                <AuthBrand className="mb-6" />

                <h1 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2 text-center">
                    Sign up for Estospaces
                </h1>

                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 text-center">
                    Create your account to get started
                </p>

                <form onSubmit={handleSignup} className="w-full">
                    <div className="mb-5">
                        <p id="register-role-label" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">I am a</p>
                        <div role="group" aria-labelledby="register-role-label" className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                aria-pressed={role === 'user'}
                                onClick={() => setRole('user')}
                                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 ${role === 'user'
                                    ? 'border-primary bg-orange-50 dark:bg-orange-900/20 text-primary'
                                    : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                    } ${authFocusClass}`}
                            >
                                <User size={24} className={role === 'user' ? 'text-primary' : 'text-gray-400'} />
                                <span className="mt-2 font-medium text-sm">User</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">Looking for property</span>
                            </button>
                            <button
                                type="button"
                                aria-pressed={role === 'manager'}
                                onClick={() => setRole('manager')}
                                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 ${role === 'manager'
                                    ? 'border-primary bg-orange-50 dark:bg-orange-900/20 text-primary'
                                    : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                    } ${authFocusClass}`}
                            >
                                <Briefcase size={24} className={role === 'manager' ? 'text-primary' : 'text-gray-400'} />
                                <span className="mt-2 font-medium text-sm">Manager</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">Managing properties</span>
                            </button>
                        </div>
                        {role === 'manager' && (
                            <div className="mt-1">
                                <label htmlFor="register-country" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Country</label>
                                <select
                                    id="register-country"
                                    value={country}
                                    onChange={(e) => { setCountry(e.target.value); setCountryError(''); }}
                                    onBlur={() => setCountryError(role === 'manager' && !country ? 'Please select your country' : '')}
                                    className={`w-full px-4 py-3 border rounded-md outline-none focus:border-primary transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${countryError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'} ${authFocusClass}`}
                                >
                                    <option value="">Select country</option>
                                    {MANAGER_COUNTRIES.map((item) => (
                                        <option key={item} value={item}>{item}</option>
                                    ))}
                                </select>
                                {countryError && (
                                    <p id="register-country-error" role="alert" className="mt-1 text-xs font-medium text-red-500">
                                        {countryError}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="mb-4 grid gap-4 sm:grid-cols-2">
                        <div>
                            <label htmlFor="register-first-name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">First name</label>
                            <input
                                id="register-first-name"
                                name="firstName"
                                type="text"
                                autoComplete="given-name"
                                placeholder="Enter your first name"
                                value={firstName}
                                onChange={(e) => handleFirstNameChange(e.target.value)}
                                onBlur={() => setFirstNameError(validateRegisterName(firstName, 'First name') || '')}
                                maxLength={80}
                                aria-invalid={Boolean(firstNameError)}
                                aria-describedby={firstNameError ? 'register-first-name-error' : undefined}
                                className={`w-full px-4 py-3 border rounded-md outline-none focus:border-primary transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${firstNameError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'} ${authFocusClass}`}
                            />
                            {firstNameError && (
                                <p id="register-first-name-error" role="alert" className="mt-1 text-xs font-medium text-red-500">
                                    {firstNameError}
                                </p>
                            )}
                        </div>
                        <div>
                            <label htmlFor="register-last-name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Last name</label>
                            <input
                                id="register-last-name"
                                name="lastName"
                                type="text"
                                autoComplete="family-name"
                                placeholder="Enter your last name"
                                value={lastName}
                                onChange={(e) => handleLastNameChange(e.target.value)}
                                onBlur={() => setLastNameError(validateRegisterName(lastName, 'Last name') || '')}
                                maxLength={80}
                                aria-invalid={Boolean(lastNameError)}
                                aria-describedby={lastNameError ? 'register-last-name-error' : undefined}
                                className={`w-full px-4 py-3 border rounded-md outline-none focus:border-primary transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${lastNameError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'} ${authFocusClass}`}
                            />
                            {lastNameError && (
                                <p id="register-last-name-error" role="alert" className="mt-1 text-xs font-medium text-red-500">
                                    {lastNameError}
                                </p>
                            )}
                        </div>
                    </div>
                    <div className="mb-4">
                        <label htmlFor="register-email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
                        <input
                            id="register-email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => handleEmailChange(e.target.value)}
                            onBlur={() => setEmailError(validateRegisterEmail(email) || '')}
                            aria-invalid={Boolean(emailError)}
                            aria-describedby={emailError ? 'register-email-error' : undefined}
                            className={`w-full px-4 py-3 border rounded-md outline-none focus:border-primary transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${emailError ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'} ${authFocusClass}`}
                        />
                        {emailError && (
                            <p id="register-email-error" role="alert" className="mt-1 text-xs font-medium text-red-500">
                                {emailError}
                            </p>
                        )}
                    </div>

                    <div className="mb-4">
                        <label htmlFor="register-password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password</label>
                        <div className="relative">
                            <input
                                id="register-password"
                                name="password"
                                type={showPassword ? 'text' : 'password'}
                                autoComplete="new-password"
                                placeholder="Create a password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className={`w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-md outline-none focus:border-primary transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${authFocusClass}`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 ${authFocusClass}`}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <ul className="mb-4 space-y-1">
                        {[
                            { key: 'length', text: 'At least 8 characters' },
                            { key: 'upper', text: 'One uppercase letter' },
                            { key: 'lower', text: 'One lowercase letter' },
                            { key: 'number', text: 'One number' },
                            { key: 'symbol', text: 'One special symbol' },
                        ].map(({ key, text }) => (
                            <li
                                key={key}
                                className={`flex items-center gap-2 text-xs ${rules[key] ? 'text-green-600' : 'text-gray-400'}`}
                            >
                                {rules[key] ? <Check size={14} /> : <X size={14} />}
                                {text}
                            </li>
                        ))}
                    </ul>

                    {error && (
                        <p role="alert" className="mb-4 break-words text-center text-sm text-red-500">{error}</p>
                    )}

                    <div className="mb-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 p-4">
                        <div className="flex items-start gap-3">
                            <div className="flex items-center h-5">
                                <input
                                    id="terms"
                                    type="checkbox"
                                    checked={agreedToTerms}
                                    onChange={(e) => handleTermsCheckboxChange(e.target.checked)}
                                    className={`w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer ${authFocusClass}`}
                                />
                            </div>
                            <div className="flex-1">
                                <label htmlFor="terms" className="text-sm font-medium text-gray-700 dark:text-gray-200 cursor-pointer">
                                    I have read and agree to the Terms & Conditions
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                                    Public signup is only available for User and Manager accounts. To complete this checkbox,
                                    you must open the full terms, review them, and scroll to the end before accepting.
                                </p>
                            </div>
                        </div>

                        <div className="mt-4 flex flex-wrap items-center gap-3">
                            <button
                                type="button"
                                onClick={openTermsModal}
                                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 text-orange-600 font-bold text-sm hover:bg-orange-100 transition-colors ${authFocusClass}`}
                            >
                                <FileText size={16} />
                                {agreedToTerms ? 'Review Terms Again' : 'Read Terms & Conditions'}
                            </button>
                            <button
                                type="button"
                                onClick={openPrivacyModal}
                                className={`text-sm font-medium text-primary hover:underline ${authFocusClass}`}
                            >
                                Privacy Policy
                            </button>
                            {acceptedTermsLabel && (
                                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                    Accepted on {acceptedTermsLabel}
                                </span>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !agreedToTerms || !termsAcceptedAt}
                        className={`w-full py-3 bg-primary text-white font-medium rounded-md hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${authFocusClass}`}
                    >
                        {loading ? 'Creating account...' : 'Sign Up'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                    Already have an account?{' '}
                    <Link to={loginPath} className={`text-primary font-medium hover:underline ${authFocusClass}`}>
                        Sign in
                    </Link>
                </div>
            </div>

            <TermsAcceptanceModal
                isOpen={isTermsModalOpen}
                canAccept={hasScrolledTermsToEnd || agreedToTerms}
                onClose={() => setIsTermsModalOpen(false)}
                onAccept={handleAcceptTerms}
                onReachedEnd={() => setHasScrolledTermsToEnd(true)}
            />
            <PrivacyPolicyModal
                isOpen={isPrivacyModalOpen}
                onClose={() => setIsPrivacyModalOpen(false)}
            />
        </>
    );
}
