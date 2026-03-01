'use client';

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { getRedirectPath } from '@/lib/authUtils';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading, getRole, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [generalError, setGeneralError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      const role = getRole();
      navigate(getRedirectPath(role));
    }
  }, [isAuthenticated, authLoading, getRole, navigate]);

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
        setGeneralError(result.error || 'Login failed. Please try again.');
        setLoading(false);
        return;
      }

      // Successfully logged in — redirect
      const role = getRole();
      navigate(getRedirectPath(role));
    } catch {
      setGeneralError('An unexpected error occurred. Please try again.');
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

  return (
    <div className="flex flex-col items-center">
      {/* Logo */}
      <div className="mb-8">
        <img src="/images/auth/logo.jpg" alt="Estospaces" width={160} height={40} className="h-10 w-auto" />
      </div>

      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-2 text-center">
        Sign in to Estospaces
      </h2>

      <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 text-center">
        Enter your email and password to continue
      </p>

      <form onSubmit={handleLogin} className="w-full">
        {/* Email Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Email</label>
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError('');
            }}
            className={`w-full px-4 py-3 border rounded-md outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${emailError ? 'border-red-400 focus:border-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-primary'
              }`}
          />
          {emailError && <p className="text-red-500 text-xs mt-1">{emailError}</p>}
        </div>

        {/* Password Input */}
        <div className="mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError('');
              }}
              className={`w-full px-4 py-3 pr-12 border rounded-md outline-none transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 ${passwordError ? 'border-red-400 focus:border-red-500' : 'border-gray-300 dark:border-gray-600 focus:border-primary'
                }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          {passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
        </div>

        {/* Forgot Password Link */}
        <div className="text-right mb-6">
          <span className="text-primary text-sm font-medium cursor-pointer hover:underline">
            Forgot Password?
          </span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary text-white font-medium rounded-md hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>

        {/* General Error Message */}
        {generalError && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-center gap-2">
            <AlertCircle className="text-red-500 dark:text-red-400 flex-shrink-0" size={18} />
            <p className="text-red-600 dark:text-red-400 text-sm">{generalError}</p>
          </div>
        )}
      </form>

      {/* Demo credentials hint */}
      <div className="mt-4 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-md w-full">
        <p className="text-orange-700 dark:text-orange-300 text-xs font-medium mb-1">Demo Credentials:</p>
        <p className="text-orange-600 dark:text-orange-400 text-xs">Manager: manager@gmail.com / Estospaces@123</p>
        <p className="text-orange-600 dark:text-orange-400 text-xs">User: user@gmail.com / Estospaces@123</p>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400 mt-6">
        Don&apos;t have an account?{' '}
        <Link to="/register" className="text-primary font-medium hover:underline">
          Sign Up
        </Link>
      </p>

      <p className="text-xs text-gray-400 dark:text-gray-500 mt-12 text-center leading-relaxed">
        By continuing you agree to Estospaces<br />
        <Link to="/terms" className="text-primary hover:underline">terms &amp; conditions</Link>
        {' · '}
        <Link to="/privacy" className="text-primary hover:underline">privacy policy</Link>
      </p>
    </div>
  );
}

