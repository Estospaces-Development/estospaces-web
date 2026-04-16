"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getHostedLoginRedirectUrl, getRedirectPath, requiresHostedLoginRedirect } from '@/lib/authUtils';
import TermsDocument, { TERMS_LAST_UPDATED, TERMS_VERSION } from '@/components/legal/TermsDocument';
import { Check, X, Eye, EyeOff, User, Briefcase, RefreshCw, FileText } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_CORE_SERVICE_URL || 'http://localhost:8080';

type TermsAcceptanceModalProps = {
    isOpen: boolean;
    canAccept: boolean;
    onClose: () => void;
    onAccept: () => void;
    onReachedEnd: () => void;
};

function TermsAcceptanceModal({
    isOpen,
    canAccept,
    onClose,
    onAccept,
    onReachedEnd,
}: TermsAcceptanceModalProps) {
    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

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
        };
    }, [isOpen, onClose]);

    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-4xl rounded-[2rem] bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-4">
                    <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-orange-600 mb-3">
                            <FileText size={12} />
                            Required Read-Through
                        </div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white">Review Terms & Conditions</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Scroll through the full terms before accepting. Last updated: {TERMS_LAST_UPDATED}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
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
                    <p className={`text-sm font-medium ${canAccept ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {canAccept
                            ? 'You have reached the end of the terms. You can now accept and continue.'
                            : 'Scroll to the bottom of the terms to enable acceptance.'}
                    </p>
                    <button
                        type="button"
                        onClick={onAccept}
                        disabled={!canAccept}
                        className="px-6 py-3 rounded-2xl bg-orange-500 text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors"
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

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [termsAcceptedAt, setTermsAcceptedAt] = useState('');
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
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

    const openTermsModal = () => {
        setHasScrolledTermsToEnd(agreedToTerms);
        setIsTermsModalOpen(true);
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

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim()) {
            setError('Please enter your name');
            return;
        }
        if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
            setError('Please enter a valid email');
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

        try {
            const result = await register(name, email, password, role, {
                acceptedAt: termsAcceptedAt,
                version: TERMS_VERSION,
            });

            if (!result.success) {
                setError(result.error || 'Sign-up failed. Please try again.');
                setLoading(false);
                return;
            }

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
                <div className="mb-6">
                    <img src="/images/auth/logo.jpg" alt="Estospaces" width={160} height={40} className="h-10 w-auto" />
                </div>

                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                    Already signed in
                </h2>

                <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                    You are currently signed in as <strong>{authUser?.email}</strong>.
                </p>

                <div className="space-y-3 w-full">
                    <button
                        onClick={() => void continueWithRole(getRole())}
                        className="w-full py-3 bg-primary text-white font-medium rounded-md hover:bg-opacity-90 transition-all"
                    >
                        Continue to Dashboard
                    </button>
                    <button
                        onClick={async () => {
                            await signOut();
                            navigate('/register?switch=true');
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
                <div className="mb-8">
                    <img src="/images/auth/logo.jpg" alt="Estospaces" width={160} height={40} className="h-10 w-auto" />
                </div>

                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                    <Check className="text-green-600 dark:text-green-400" size={32} />
                </div>

                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                    Account Created!
                </h2>

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
                    to="/login"
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
                <div className="mb-6">
                    <img src="/images/auth/logo.jpg" alt="Estospaces" width={160} height={40} className="h-10 w-auto" />
                </div>

                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2 text-center">
                    Sign up for Estospaces
                </h2>

                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 text-center">
                    Create your account to get started
                </p>

                <form onSubmit={handleSignup} className="w-full">
                    <div className="mb-5">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">I am a</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setRole('user')}
                                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 ${role === 'user'
                                    ? 'border-primary bg-orange-50 dark:bg-orange-900/20 text-primary'
                                    : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <User size={24} className={role === 'user' ? 'text-primary' : 'text-gray-400'} />
                                <span className="mt-2 font-medium text-sm">User</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">Looking for property</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setRole('manager')}
                                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 ${role === 'manager'
                                    ? 'border-primary bg-orange-50 dark:bg-orange-900/20 text-primary'
                                    : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <Briefcase size={24} className={role === 'manager' ? 'text-primary' : 'text-gray-400'} />
                                <span className="mt-2 font-medium text-sm">Manager</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">Managing properties</span>
                            </button>
                        </div>
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Full Name</label>
                        <input
                            type="text"
                            placeholder="Enter your full name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md outline-none focus:border-primary transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
                        <input
                            type="email"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-md outline-none focus:border-primary transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                    </div>

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Create a password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-md outline-none focus:border-primary transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
                        <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
                    )}

                    <div className="mb-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/90 dark:bg-gray-900/60 p-4">
                        <div className="flex items-start gap-3">
                            <div className="flex items-center h-5">
                                <input
                                    id="terms"
                                    type="checkbox"
                                    checked={agreedToTerms}
                                    onChange={(e) => handleTermsCheckboxChange(e.target.checked)}
                                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary cursor-pointer"
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
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-50 text-orange-600 font-bold text-sm hover:bg-orange-100 transition-colors"
                            >
                                <FileText size={16} />
                                {agreedToTerms ? 'Review Terms Again' : 'Read Terms & Conditions'}
                            </button>
                            <Link to="/privacy" className="text-sm font-medium text-primary hover:underline">
                                Privacy Policy
                            </Link>
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
                        className="w-full py-3 bg-primary text-white font-medium rounded-md hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creating account...' : 'Sign Up'}
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                    Already have an account?{' '}
                    <Link to="/login" className="text-primary font-medium hover:underline">
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
        </>
    );
}
