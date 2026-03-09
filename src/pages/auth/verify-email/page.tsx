import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader, RefreshCw } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_CORE_SERVICE_URL || 'http://localhost:8080';

export default function VerifyEmailPage() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const [resendEmail, setResendEmail] = useState('');
    const [resending, setResending] = useState(false);
    const [resendMessage, setResendMessage] = useState('');
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('No verification token found. Please check the link in your email.');
            return;
        }

        const verify = async () => {
            try {
                await axios.get(`${API_URL}/api/v1/auth/verify-email`, {
                    params: { token },
                });
                setStatus('success');
                setMessage('Your email has been verified successfully! You can now sign in.');
            } catch (err: any) {
                const errMsg = err.response?.data?.error || '';
                if (errMsg.includes('already')) {
                    setStatus('success');
                    setMessage('Your email has already been verified. You can sign in.');
                } else if (errMsg.includes('expired')) {
                    setStatus('error');
                    setMessage('This verification link has expired. Enter your email below to get a new one.');
                } else {
                    setStatus('error');
                    setMessage('This verification link is invalid or has already been used.');
                }
            }
        };

        verify();
    }, [token]);

    const handleResend = async () => {
        if (!resendEmail || resendCooldown > 0) return;
        setResending(true);
        setResendMessage('');
        try {
            await axios.post(`${API_URL}/api/v1/auth/resend-verification`, { email: resendEmail });
            setResendMessage('If an unverified account exists for this email, a new verification link has been sent.');
            setResendCooldown(60);
            const timer = setInterval(() => {
                setResendCooldown((prev) => {
                    if (prev <= 1) { clearInterval(timer); return 0; }
                    return prev - 1;
                });
            }, 1000);
        } catch {
            setResendMessage('Failed to resend. Please try again later.');
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="flex flex-col items-center w-full max-w-md mx-auto text-center">
            {/* Logo */}
            <div className="mb-8">
                <img src="/images/auth/logo.jpg" alt="Estospaces" width={160} height={40} className="h-10 w-auto" />
            </div>

            {status === 'loading' && (
                <>
                    <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
                        <Loader className="text-blue-500 h-8 w-8 animate-spin" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                        Verifying your email...
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Please wait a moment.</p>
                </>
            )}

            {status === 'success' && (
                <>
                    <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                        <CheckCircle className="text-green-500 h-8 w-8" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                        Email Verified!
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">{message}</p>
                    <Link
                        to="/login"
                        className="w-full inline-block py-3 bg-primary text-white font-medium rounded-md hover:bg-opacity-90 transition-all text-center"
                    >
                        Continue to Sign In
                    </Link>
                </>
            )}

            {status === 'error' && (
                <>
                    <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                        <XCircle className="text-red-500 h-8 w-8" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                        Verification Failed
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{message}</p>

                    {/* Resend verification section */}
                    <div className="w-full mb-6">
                        <input
                            type="email"
                            placeholder="Enter your email address"
                            value={resendEmail}
                            onChange={(e) => setResendEmail(e.target.value)}
                            className="w-full px-4 py-3 mb-3 border border-gray-300 dark:border-gray-600 rounded-md outline-none focus:border-primary transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                        {resendMessage && (
                            <p className="text-green-600 dark:text-green-400 text-xs mb-3">{resendMessage}</p>
                        )}
                        <button
                            onClick={handleResend}
                            disabled={resending || resendCooldown > 0 || !resendEmail}
                            className="w-full py-3 bg-primary text-white font-medium rounded-md hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={16} className={resending ? 'animate-spin' : ''} />
                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : resending ? 'Sending...' : 'Resend Verification Email'}
                        </button>
                    </div>

                    <div className="flex flex-col gap-3 w-full">
                        <Link
                            to="/register"
                            className="w-full inline-block py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-center"
                        >
                            Register Again
                        </Link>
                        <Link
                            to="/login"
                            className="w-full inline-block py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-800 transition-all text-center"
                        >
                            Back to Sign In
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}
