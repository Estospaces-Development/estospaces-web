'use client';

import { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Search, Heart, FileCheck, Sparkles } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface StepData {
    icon: LucideIcon;
    iconBg: string;
    title: string;
    description: string;
}

interface WelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const WelcomeModal = ({ isOpen, onClose }: WelcomeModalProps) => {
    const [currentStep, setCurrentStep] = useState(0);

    const steps: StepData[] = [
        {
            icon: Search,
            iconBg: 'from-violet-500 to-purple-600',
            title: 'Find Your Perfect Property',
            description: "Search thousands of properties across the UK. Filter by location, price, and features to find exactly what you're looking for.",
        },
        {
            icon: Heart,
            iconBg: 'from-rose-500 to-pink-600',
            title: 'Save Your Favorites',
            description: 'Save properties you love and compare them side by side. Get notified when prices change or new properties match your criteria.',
        },
        {
            icon: FileCheck,
            iconBg: 'from-emerald-500 to-teal-600',
            title: 'Apply with Confidence',
            description: 'Apply for properties directly through the platform. Track your applications in real-time and get instant updates.',
        },
    ];

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrevious = () => {
        if (currentStep > 0) setCurrentStep(currentStep - 1);
    };

    const handleComplete = () => {
        localStorage.setItem('estospaces_welcome_seen', 'true');
        onClose();
    };

    const handleSkip = () => {
        localStorage.setItem('estospaces_welcome_seen', 'true');
        onClose();
    };

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    if (!isOpen) return null;

    const currentStepData = steps[currentStep];
    const Icon = currentStepData.icon;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] animate-fade-in" />

            {/* Modal */}
            <div className="fixed inset-0 z-[101] flex items-center justify-center p-4 animate-scale-in">
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden relative">
                    {/* Close button */}
                    <div className="absolute top-4 right-4 z-10">
                        <button onClick={handleSkip} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-8 pt-12 text-center">
                        {/* Icon */}
                        <div className="mb-6">
                            <div className={`inline-flex p-5 rounded-3xl bg-gradient-to-br ${currentStepData.iconBg} shadow-xl`}>
                                <Icon size={40} className="text-white" strokeWidth={1.5} />
                            </div>
                        </div>

                        {/* Welcome badge - only on first step */}
                        {currentStep === 0 && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-xs font-medium mb-4">
                                <Sparkles size={12} />
                                Welcome to Estospaces
                            </div>
                        )}

                        {/* Title & Description */}
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                                {currentStepData.title}
                            </h2>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed max-w-md mx-auto">
                                {currentStepData.description}
                            </p>
                        </div>

                        {/* Step Indicators */}
                        <div className="flex items-center justify-center gap-2 mt-8 mb-6">
                            {steps.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentStep(index)}
                                    className={`h-2 rounded-full transition-all duration-300 ${index === currentStep
                                            ? 'w-8 bg-orange-500'
                                            : 'w-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                                        }`}
                                />
                            ))}
                        </div>

                        {/* Navigation Buttons */}
                        <div className="flex items-center justify-between gap-4">
                            <button onClick={handlePrevious} disabled={currentStep === 0} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all ${currentStep === 0 ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                <ChevronLeft size={18} />
                                Back
                            </button>

                            <button onClick={handleSkip} className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                                Skip
                            </button>

                            <button onClick={handleNext} className="flex items-center gap-2 px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-orange-500/25">
                                {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
                                {currentStep < steps.length - 1 && <ChevronRight size={18} />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default WelcomeModal;
