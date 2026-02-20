'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Phone, CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';

interface VerificationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVerified: () => void;
    email: string;
    phone?: string;
}

const VerificationModal = ({ isOpen, onClose, onVerified, email, phone }: VerificationModalProps) => {
    const [step, setStep] = useState<'email' | 'phone' | 'complete'>('email');
    const [emailCode, setEmailCode] = useState('');
    const [phoneCode, setPhoneCode] = useState('');
    const [emailSent, setEmailSent] = useState(false);
    const [phoneCodeSent, setPhoneCodeSent] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState('');

    const handleSendEmailCode = () => {
        setEmailSent(true);
        setError('');
        console.log('Verification code sent to:', email);
    };

    const handleSendPhoneCode = () => {
        setPhoneCodeSent(true);
        setError('');
        console.log('Verification code sent to:', phone);
    };

    const handleVerifyEmail = () => {
        if (!emailCode.trim()) {
            setError('Please enter the verification code');
            return;
        }

        setIsVerifying(true);
        setError('');

        setTimeout(() => {
            setIsVerifying(false);
            if (emailCode.length === 6) {
                if (phone) {
                    setStep('phone');
                } else {
                    setStep('complete');
                }
            } else {
                setError('Invalid verification code. Please try again.');
            }
        }, 1000);
    };

    const handleVerifyPhone = () => {
        if (!phoneCode.trim()) {
            setError('Please enter the verification code');
            return;
        }

        setIsVerifying(true);
        setError('');

        setTimeout(() => {
            setIsVerifying(false);
            if (phoneCode.length === 6) {
                setStep('complete');
            } else {
                setError('Invalid verification code. Please try again.');
            }
        }, 1000);
    };

    const handleComplete = () => {
        onVerified();
        onClose();
        setStep('email');
        setEmailCode('');
        setPhoneCode('');
        setEmailSent(false);
        setPhoneCodeSent(false);
    };

    const handleClose = () => {
        onClose();
        setStep('email');
        setEmailCode('');
        setPhoneCode('');
        setEmailSent(false);
        setPhoneCodeSent(false);
        setError('');
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6 relative">
                <button onClick={handleClose} className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                </button>

                {step === 'email' && (
                    <div className="space-y-4">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Mail className="w-8 h-8 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Verify Your Email</h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                We&apos;ll send a verification code to <span className="font-medium">{email}</span>
                            </p>
                        </div>

                        {!emailSent ? (
                            <div className="space-y-4">
                                <button onClick={handleSendEmailCode} className="w-full px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors font-medium">
                                    Send Verification Code
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Enter Verification Code</label>
                                    <input type="text" value={emailCode} onChange={(e) => { setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }} placeholder="000000" className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-center text-2xl tracking-widest" maxLength={6} />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">Code sent to {email}</p>
                                </div>

                                {error && (
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button onClick={handleSendEmailCode} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        Resend Code
                                    </button>
                                    <button onClick={handleVerifyEmail} disabled={isVerifying || emailCode.length !== 6} className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                        {isVerifying ? 'Verifying...' : 'Verify'}
                                        {!isVerifying && <ArrowRight className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {step === 'phone' && phone && (
                    <div className="space-y-4">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Phone className="w-8 h-8 text-primary" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Verify Your Phone</h2>
                            <p className="text-gray-600 dark:text-gray-400">
                                We&apos;ll send a verification code to <span className="font-medium">{phone}</span>
                            </p>
                        </div>

                        {!phoneCodeSent ? (
                            <div className="space-y-4">
                                <button onClick={handleSendPhoneCode} className="w-full px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors font-medium">
                                    Send Verification Code
                                </button>
                                <button onClick={() => setStep('email')} className="w-full px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors flex items-center justify-center gap-2">
                                    <ArrowLeft className="w-4 h-4" />
                                    Back to Email
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Enter Verification Code</label>
                                    <input type="text" value={phoneCode} onChange={(e) => { setPhoneCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setError(''); }} placeholder="000000" className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-center text-2xl tracking-widest" maxLength={6} />
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">Code sent to {phone}</p>
                                </div>

                                {error && (
                                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                                        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button onClick={() => setStep('email')} className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
                                        <ArrowLeft className="w-4 h-4" />
                                        Back
                                    </button>
                                    <button onClick={handleSendPhoneCode} className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                        Resend Code
                                    </button>
                                    <button onClick={handleVerifyPhone} disabled={isVerifying || phoneCode.length !== 6} className="flex-1 px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                                        {isVerifying ? 'Verifying...' : 'Verify'}
                                        {!isVerifying && <ArrowRight className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {step === 'complete' && (
                    <div className="space-y-4 text-center">
                        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Verification Complete!</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Your account has been successfully verified. You can now access all features.
                        </p>
                        <button onClick={handleComplete} className="w-full px-4 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors font-medium">
                            Continue
                        </button>
                    </div>
                )}
            </div>
        </div>,
        document.body,
    );
};

export default VerificationModal;
