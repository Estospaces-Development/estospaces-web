import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';
import { getServiceUrl } from '@/lib/apiUtils';
import { normalizeRecoveryEmail, validateRecoveryEmail } from '@/lib/authRecovery';
import AuthBrand from '@/components/auth/AuthBrand';

const API_URL = getServiceUrl('core');
const authFocusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const submitDisabled = loading || Boolean(validateRecoveryEmail(email));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;

        const normalizedEmail = normalizeRecoveryEmail(email);
        const emailErr = validateRecoveryEmail(email);
        if (emailErr) {
            setError(emailErr);
            return;
        }

        setError('');
        setLoading(true);

        try {
            await axios.post(`${API_URL}/api/v1/auth/forgot-password`, { email: normalizedEmail });
            setEmail(normalizedEmail);
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to send reset email. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center w-full max-w-md mx-auto">
            <AuthBrand />

            <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2 text-center">
                Reset your password
            </h1>

            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 text-center px-4">
                Enter the email address associated with your account and we'll send you a link to reset your password.
            </p>

            {success ? (
                <div className="w-full text-center">
                    <div className="mb-6 flex justify-center">
                        <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <CheckCircle className="text-green-500 h-8 w-8" />
                        </div>
                    </div>
                    <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Check your email</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                        We have sent a password reset link to <strong>{email}</strong>.
                    </p>
                    <Link
                        to="/login"
                        className="w-full inline-block py-3 bg-primary text-white font-medium rounded-md hover:bg-opacity-90 transition-all text-center"
                    >
                        Return to Sign In
                    </Link>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="w-full px-4 sm:px-0">
                    <div className="mb-6">
                        <label htmlFor="forgot-password-email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                            Email Address
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Mail className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                id="forgot-password-email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                maxLength={254}
                                placeholder="Enter your email address"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    setError('');
                                }}
                                className={`w-full pl-10 pr-4 py-3 border rounded-md outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${authFocusClass} ${error ? 'border-red-400 focus:border-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-primary'
                                    }`}
                            />
                        </div>
                        {error && (
                            <div className="mt-2 flex items-center break-words text-red-500 text-sm" role="alert">
                                <AlertCircle className="w-4 h-4 mr-1 flex-shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={submitDisabled}
                        className={`w-full py-3 bg-primary text-white font-medium rounded-md hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${authFocusClass}`}
                    >
                        {loading ? 'Sending link...' : 'Send Reset Link'}
                    </button>

                    <div className="mt-6 text-center">
                        <Link to="/login" className={`text-primary text-sm font-medium hover:underline ${authFocusClass}`}>
                            Back to Sign In
                        </Link>
                    </div>
                </form>
            )}
        </div>
    );
}
