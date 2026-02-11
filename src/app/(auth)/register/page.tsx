'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth, getRedirectPath } from '@/contexts/AuthContext';
import AuthLayout from '@/components/auth/AuthLayout';
import { Check, X, Eye, EyeOff, User, Briefcase } from 'lucide-react';

export default function RegisterPage() {
    const router = useRouter();
    const { isAuthenticated, loading: authLoading, getRole, register } = useAuth();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const rules: Record<string, boolean> = {
        length: password.length >= 8,
        upper: /[A-Z]/.test(password),
        lower: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        symbol: /[^A-Za-z0-9]/.test(password),
    };

    const allRulesPassed = Object.values(rules).every(Boolean);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated && !authLoading) {
            const userRole = getRole();
            router.replace(getRedirectPath(userRole));
        }
    }, [isAuthenticated, authLoading, getRole, router]);

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

        setLoading(true);
        setError('');

        try {
            const result = await register(name, email, password, role);

            if (!result.success) {
                setError(result.error || 'Sign-up failed. Please try again.');
                setLoading(false);
                return;
            }

            // Registration successful — redirect to appropriate dashboard
            setSuccess(true);
            setTimeout(() => {
                router.replace(getRedirectPath(role));
            }, 1500);
        } catch {
            setError('An unexpected error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <AuthLayout>
                <div className="flex flex-col items-center justify-center min-h-[300px]">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>
                </div>
            </AuthLayout>
        );
    }

    if (success) {
        return (
            <AuthLayout>
                <div className="flex flex-col items-center text-center">
                    <div className="mb-8">
                        <Image src="/images/auth/logo.jpg" alt="Estospaces" width={160} height={40} className="h-10 w-auto" />
                    </div>

                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                        <Check className="text-green-600 dark:text-green-400" size={32} />
                    </div>

                    <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                        Account Created!
                    </h2>

                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                        Redirecting to your dashboard...
                    </p>

                    <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg px-4 py-2 mb-4">
                        <p className="text-primary text-sm font-medium">
                            Signed up as: {role === 'manager' ? 'Property Manager' : 'User'}
                        </p>
                    </div>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout>
            <div className="flex flex-col items-center">
                {/* Logo */}
                <div className="mb-8">
                    <Image src="/images/auth/logo.jpg" alt="Estospaces" width={160} height={40} className="h-10 w-auto" />
                </div>

                <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2 text-center">
                    Sign up for Estospaces
                </h2>

                <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 text-center">
                    Create your account to get started
                </p>

                <form onSubmit={handleSignup} className="w-full">
                    {/* Role Selection */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-3">I am a</label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setRole('user')}
                                className={`flex flex-col items-center justify-center p-4 rounded-lg border-2 transition-all duration-200 ${role === 'user'
                                        ? 'border-primary bg-orange-50 dark:bg-orange-900/20 text-primary'
                                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
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
                                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                    }`}
                            >
                                <Briefcase size={24} className={role === 'manager' ? 'text-primary' : 'text-gray-400'} />
                                <span className="mt-2 font-medium text-sm">Manager</span>
                                <span className="text-xs text-gray-400 dark:text-gray-500 mt-1">Managing properties</span>
                            </button>
                        </div>
                    </div>

                    {/* Name Input */}
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

                    {/* Email Input */}
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

                    {/* Password Input */}
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

                    {/* Password Rules */}
                    <ul className="mb-6 space-y-1">
                        {[
                            { key: 'length', text: 'At least 8 characters' },
                            { key: 'upper', text: 'One uppercase letter' },
                            { key: 'lower', text: 'One lowercase letter' },
                            { key: 'number', text: 'One number' },
                            { key: 'symbol', text: 'One special symbol' },
                        ].map(({ key, text }) => (
                            <li
                                key={key}
                                className={`flex items-center gap-2 text-xs ${rules[key] ? 'text-green-600' : 'text-gray-400'
                                    }`}
                            >
                                {rules[key] ? <Check size={14} /> : <X size={14} />}
                                {text}
                            </li>
                        ))}
                    </ul>

                    {error && (
                        <p className="text-red-500 text-sm mb-4 text-center">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-primary text-white font-medium rounded-md hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Creating account...' : 'Sign Up'}
                    </button>
                </form>

                <p className="text-sm text-gray-600 dark:text-gray-400 mt-6">
                    Already have an account?{' '}
                    <Link href="/login" className="text-primary font-medium hover:underline">
                        Sign in
                    </Link>
                </p>
            </div>
        </AuthLayout>
    );
}
