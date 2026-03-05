import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_CORE_SERVICE_URL || import.meta.env.NEXT_PUBLIC_CORE_SERVICE_URL || 'http://localhost:8080';

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

    useEffect(() => {
        if (!token) {
            setError('Invalid or missing password reset token. Please request a new link.');
        }
    }, [token]);

    const validatePassword = () => {
        if (!password) return 'Password is required';
        if (password.length < 8) return 'Password must be at least 8 characters';
        if (password !== confirmPassword) return 'Passwords do not match';
        return '';
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading || !token) return;

        const passErr = validatePassword();
        if (passErr) {
            setError(passErr);
            return;
        }

        setError('');
        setLoading(true);

        try {
            await axios.post(`${API_URL}/api/v1/auth/reset-password`, {
                token,
                new_password: password
            });
            setSuccess(true);
        } catch (err: any) {
            setError(err.response?.data?.error || 'Failed to reset password. The link might have expired.');
        } finally {
            setLoading(false);
        }
    };

    // If no token, show error state immediately
    if (!token && !error) {
        return null;
    }

    return (
        <div className="flex flex-col items-center w-full max-w-md mx-auto">
            {/* Logo */}
            <div className="mb-8">
                <img src="/images/auth/logo.jpg" alt="Estospaces" width={160} height={40} className="h-10 w-auto" />
            </div>

            <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-2 text-center">
                Create new password
            </h2>

            <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 text-center px-4">
                Your new password must be different from previous used passwords and at least 8 characters long.
            </p>

            {success ? (
                <div className="w-full text-center">
                    <div className="mb-6 flex justify-center">
                        <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                            <CheckCircle className="text-green-500 h-8 w-8" />
                        </div>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Password reset</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-8">
                        Your password has been successfully reset. You can now sign in with your new password.
                    </p>
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full py-3 bg-primary text-white font-medium rounded-md hover:bg-opacity-90 transition-all"
                    >
                        Continue to Sign In
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="w-full px-4 sm:px-0">
                    {(!token || error) && (
                        <div className="mb-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-start gap-2">
                            <AlertCircle className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" size={18} />
                            <div className="flex-1">
                                <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                                {(!token || error.includes('expired') || error.includes('invalid')) && (
                                    <Link to="/forgot-password" className="text-red-700 dark:text-red-300 text-sm font-medium hover:underline mt-2 inline-block">
                                        Request a new link
                                    </Link>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                            New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                placeholder="At least 8 characters"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (error && password.length >= 7) setError('');
                                }}
                                disabled={!token}
                                className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-md outline-none focus:border-primary transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-900"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                disabled={!token}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div className="mb-8">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                            Confirm New Password
                        </label>
                        <div className="relative">
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                placeholder="Type password again"
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    if (error && e.target.value === password) setError('');
                                }}
                                disabled={!token}
                                className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-md outline-none focus:border-primary transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:bg-gray-50 dark:disabled:bg-gray-900"
                            />
                            <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                disabled={!token}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 disabled:opacity-50"
                            >
                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading || !token || !password || !confirmPassword}
                        className="w-full py-3 bg-primary text-white font-medium rounded-md hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Resetting Password...' : 'Reset Password'}
                    </button>
                </form>
            )}
        </div>
    );
}
