"use client";

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getHostedLoginRedirectUrl, getRedirectPath, requiresHostedLoginRedirect } from '@/lib/authUtils';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import AuthBrand from '@/components/auth/AuthBrand';

const authFocusClass = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-gray-900';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, getRole, login, signOut, user: authUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

  const validateEmail = (value: string) => {
    if (!value) return 'Email is required';
    if (!/^\S+@\S+\.\S+$/.test(value)) return 'Enter a valid email';
    return '';
  };

  const validatePassword = (value: string) => {
    if (!value) return 'Password is required';
    if (value.length < 6) return 'Password must be at least 6 characters';
    return '';
  };

  const continueWithRole = async (role?: string) => {
    if (requiresHostedLoginRedirect(role)) {
      await signOut();
      window.location.replace(getHostedLoginRedirectUrl(role));
      return;
    }

    navigate(getRedirectPath(role));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    const emailErr = validateEmail(email);
    const passErr = validatePassword(password);

    setEmailError(emailErr);
    setPasswordError(passErr);
    setGeneralError('');

    if (emailErr || passErr) return;

    setLoading(true);

    try {
      const result = await login(email, password);

      if (!result.success) {
        // Check for unverified account specifically
        const errMsg = result.error || '';
        if (errMsg.toLowerCase().includes('not active') || errMsg.toLowerCase().includes('verify')) {
          setGeneralError('Your email is not verified. Please check your inbox for the verification link.');
        } else {
          setGeneralError(errMsg || 'Login failed. Please try again.');
        }
        setLoading(false);
        return;
      }

      // Successfully logged in â€” redirect using role from response
      const role = result.role || getRole();
      await continueWithRole(role);
    } catch (err: any) {
      setGeneralError(err.message || 'An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Checking session...</p>
      </div>
    );
  }

  const isSwitching = new URLSearchParams(window.location.search).get('switch') === 'true';

  return (
    <main className="flex flex-col items-center" aria-labelledby="login-heading">
      <AuthBrand />

      {isAuthenticated && !isSwitching ? (
          <div className="text-center w-full max-w-sm">
              <h1 id="login-heading" className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2">
                Already signed in
              </h1>
              <p className="text-gray-500 dark:text-gray-300 text-sm mb-8">
                You are currently signed in as <strong>{authUser?.email}</strong>
              </p>
              <div className="space-y-3">
                <button 
                    onClick={() => void continueWithRole(getRole())}
                    className="w-full py-3 bg-primary text-white font-medium rounded-md hover:bg-opacity-90 transition-all shadow-lg shadow-primary/20"
                >
                    Continue to Dashboard
                </button>
                <button 
                    onClick={async () => {
                        await signOut();
                        navigate('/login?switch=true');
                    }}
                    className="w-full py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-200 font-medium rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                    Sign out and switch account
                </button>
              </div>
          </div>
      ) : (
          <>
            <h1 id="login-heading" className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2 text-center">
                {isSwitching ? 'Sign in with another account' : 'Sign in to Estospaces'}
            </h1>

            <p className="text-gray-500 dark:text-gray-300 text-sm mb-8 text-center">
                Enter your email and password to continue
            </p>

            <form onSubmit={handleLogin} className="w-full">
                {/* Email Input */}
                <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
                <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    maxLength={254}
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => {
                    setEmail(e.target.value);
                    setEmailError('');
                    }}
                    className={`w-full px-4 py-3 border rounded-md outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${authFocusClass} ${emailError ? 'border-red-400 focus:border-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-primary'
                    }`}
                />
                {emailError && <p role="alert" className="mt-2 break-words text-xs text-red-500">{emailError}</p>}
                </div>

                {/* Password Input */}
                <div className="mb-2">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password</label>
                <div className="relative">
                    <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    maxLength={128}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                    }}
                    className={`w-full px-4 py-3 pr-12 border rounded-md outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${authFocusClass} ${passwordError ? 'border-red-400 focus:border-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-primary'
                    }`}
                    />
                    <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white ${authFocusClass}`}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                </div>
                {passwordError && <p role="alert" className="mt-2 break-words text-xs text-red-500">{passwordError}</p>}
                </div>

                {/* Forgot Password Link */}
                <div className="text-right mb-6">
                <Link to="/forgot-password" className={`text-primary text-sm font-semibold hover:underline ${authFocusClass}`}>
                    Forgot Password?
                </Link>
                </div>

                <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 bg-primary text-white font-medium rounded-md hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${authFocusClass}`}
                >
                {loading ? 'Signing in...' : 'Sign In'}
                </button>

                {/* General Error Message */}
                {generalError && (
                <div role="alert" className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                    <AlertCircle className="text-red-500 dark:text-red-400 flex-shrink-0" size={18} />
                    <p className="min-w-0 break-words text-sm text-red-600 dark:text-red-400">{generalError}</p>
                </div>
                )}
            </form>
          </>
      )}

      <p className="text-sm text-gray-700 dark:text-gray-300 mt-6">
        Don&apos;t have an account?{' '}
        <Link to="/register" className={`text-primary font-semibold hover:underline ${authFocusClass}`}>
          Sign Up
        </Link>
      </p>

      <p className="text-xs text-gray-500 dark:text-gray-300 mt-12 text-center leading-relaxed">
        By continuing you agree to Estospaces<br />
        <Link to="/terms" className={`text-primary hover:underline ${authFocusClass}`}>terms &amp; conditions</Link>
        {' \u00B7 '}
        <Link to="/privacy" className={`text-primary hover:underline ${authFocusClass}`}>privacy policy</Link>
      </p>
    </main>
  );
}

