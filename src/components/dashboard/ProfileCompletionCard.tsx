"use client";

import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const ProfileCompletionCard = () => {
    const navigate = useNavigate();
    const { user, loading } = useAuth(); // User might be null, handle safely
    const [isVisible, setIsVisible] = useState(true);

    // Check if profile is incomplete
    const isProfileIncomplete = useMemo(() => {
        if (loading || !user) return false;

        // Check for missing essential fields
        const hasName = user?.name || user?.user_metadata?.full_name;
        const hasPhone = user?.user_metadata?.phone;

        return !hasName || !hasPhone;
    }, [user, loading]);

    // DEMO: Force visibility for user review if user is logged in
    // In production, uncomment checking isProfileIncomplete
    // if (!isProfileIncomplete || !isVisible) return null;
    if (!user || !isVisible) return null;

    return (
        <div id="profile-widget" className="animate-slideInRight">
            <div className="relative group">
                {/* Blinking/Pulsing Glow Effect - Refined for elegance */}
                <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-400/50 to-pink-600/50 rounded-xl opacity-50 blur-sm group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse"></div>

                <div className="relative flex items-center gap-4 bg-white dark:bg-gray-800 p-3 pr-8 rounded-xl shadow-lg max-w-sm hover:shadow-xl transition-shadow duration-300">

                    {/* Icon */}
                    <div className="flex-shrink-0 w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center">
                        <Sparkles size={18} className="text-orange-500" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 mr-2">
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                            Complete Profile
                        </h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-tight">
                            Unlock verified access
                        </p>
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={() => navigate('/user/dashboard/profile')}
                        className="flex-shrink-0 flex items-center justify-center w-8 h-8 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full hover:scale-105 transition-transform shadow-md"
                    >
                        <ArrowRight size={14} />
                    </button>

                    {/* Close Button - More subtle */}
                    <button
                        onClick={() => setIsVisible(false)}
                        className="absolute top-2 right-2 w-5 h-5 bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 rounded-full flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                        <X size={10} />
                    </button>

                </div>
            </div>
        </div>
    );
};

export default ProfileCompletionCard;

