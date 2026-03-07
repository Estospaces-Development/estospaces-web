import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle, KeyRound } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_CORE_SERVICE_URL || 'http://localhost:8080';

interface PasswordRule {
    label: string;
    test: (pw: string) => boolean;
}

const rules: PasswordRule[] = [
    { label: 'At least 8 characters', test: (pw) => pw.length >= 8 },
    { label: 'One uppercase letter', test: (pw) => /[A-Z]/.test(pw) },
    { label: 'One lowercase letter', test: (pw) => /[a-z]/.test(pw) },
    { label: 'One number', test: (pw) => /[0-9]/.test(pw) },
];

export default function ResetPasswordPage() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const allRulesPassed = rules.every(r => r.test(password));
    const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!token) {
            setError('Invalid or missing reset token. Please request a new link.');
            return;
        }

        if (!allRulesPassed) {
            setError('Please meet all password requirements.');
            return;
        }

        if (!passwordsMatch) {
            setError('Passwords do not match.');
            return;
        }

        setError('');
        setLoading(true);

        try {
            await axios.post(`${API_URL}/api/v1/auth/reset-password`, {
                token,
                new_password: password,
            });
            setSuccess(true);
        } catch (err: any) {
            const msg = err.response?.data?.error || '';
            if (msg.includes('expired') || msg.includes('invalid') || msg.includes('used')) {
                setError('This reset link has expired or already been used. Please request a new one.');
            } else {
                setError('Something went wrong. Please try again or request a new link.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Success state
    if (success) {
        return (
            <div className="flex flex-col items-center w-full max-w-md mx-auto text-center">
                <div className="mb-8">
                    <img src="/images/auth/logo.jpg" alt="Estospaces" width={160} height={40} className="h-10 w-auto" />
                </div>

                <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                    <CheckCircle className="text-green-500 h-8 w-8" />
                </div>

                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-3">
                    Password Reset Successfully!
                </h2>

                <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                    Your password has been updated. You can now sign in with your new password.
                </p>

                <button
                    onClick={() => navigate('/login')}
                    className="w-full py-3 bg-primary text-white font-medium rounded-md hover:bg-opacity-90 transition-all"
                >
                    Continue to Sign In
                </button>
            </div>
        );
    }

    // No token — show error immediately
    if (!token) {
        return (
            <div className="flex flex-col items-center w-full max-w-md mx-auto text-center">
                <div className="mb-8">
                    <img src="/images/auth/logo.jpg" alt="Estospaces" width={160} height={40} className="h-10 w-auto" />
                </div>

                <div className="h-16 w-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                    <AlertCircle className="text-red-500 h-8 w-8" />
                </div>

                <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-3">
                    Invalid Reset Link
                </h2>

                <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                    This link is missing a reset token. Please request a new password reset link.
                </p>

                <Link
                    to="/forgot-password"
                    className="w-full inline-block py-3 bg-primary text-white font-medium rounded-md hover:bg-opacity-90 transition-all text-center"
                >
                    Request New Reset Link
                </Link>
            </div>
        );
    }

    // Normal form state
    return (
        <div className="flex flex-col items-center w-full max-w-md mx-auto">
            {/* Logo */}
            <div className="mb-8">
                <img src="/images/auth/logo.jpg" alt="Estospaces" width={160} height={40} className="h-10 w-auto" />
            </div>

            {/* Icon */}
            <div className="h-14 w-14 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-5">
                <KeyRound className="text-primary h-7 w-7" />
            </div>

            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2 text-center">
                Create New Password
            </h2>

            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 text-center px-4">
                Your new password must be at least 8 characters and meet the requirements below.
            </p>

            {/* Error banner */}
            {error && (
                <div className="w-full mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-start gap-2">
                    <AlertCircle className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" size={18} />
                    <div className="flex-1">
                        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                        {(error.includes('expired') || error.includes('used')) && (
                            <Link
                                to="/forgot-password"
                                className="text-red-700 dark:text-red-300 text-sm font-medium hover:underline mt-2 inline-block"
                            >
                                Request a new link →
                            </Link>
                        )}
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="w-full">
                {/* New Password */}
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        New Password
                    </label>
                    <div className="relative">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            placeholder="Enter your new password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value);
                                setError('');
                            }}
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

                    {/* Password rules */}
                    {password.length > 0 && (
                        <ul className="mt-2 space-y-1">
                            {rules.map((rule) => (
                                <li
                                    key={rule.label}
                                    className={`flex items-center gap-1.5 text-xs ${rule.test(password) ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}
                                >
                                    <span>{rule.test(password) ? '✓' : '○'}</span>
                                    {rule.label}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Confirm Password */}
                <div className="mb-8">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Confirm New Password
                    </label>
                    <div className="relative">
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            placeholder="Re-enter your new password"
                            value={confirmPassword}
                            onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                setError('');
                            }}
                            className={`w-full px-4 py-3 pr-12 border rounded-md outline-none focus:border-primary transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${confirmPassword.length > 0 && !passwordsMatch
                                ? 'border-red-400'
                                : 'border-gray-300 dark:border-gray-600'
                                }`}
                        />
                        <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>
                    {confirmPassword.length > 0 && !passwordsMatch && (
                        <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
                    )}
                    {confirmPassword.length > 0 && passwordsMatch && (
                        <p className="text-green-600 text-xs mt-1">✓ Passwords match</p>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={loading || !allRulesPassed || !passwordsMatch}
                    className="w-full py-3 bg-primary text-white font-medium rounded-md hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            Resetting Password...
                        </span>
                    ) : (
                        'Reset Password'
                    )}
                </button>
            </form>

            <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 text-center">
                Remember your password?{' '}
                <Link to="/login" className="text-primary font-medium hover:underline">
                    Back to Sign In
                </Link>
            </p>
        </div>
    );
}
