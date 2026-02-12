'use client';

import { useState } from 'react';
import { Clock, Info } from 'lucide-react';

const PromiseBanner = () => {
    const [showTooltip, setShowTooltip] = useState(false);

    return (
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg p-4 md:p-5 text-white relative">
            <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                        <Clock size={24} className="text-white" />
                    </div>
                </div>

                <div className="flex-1">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-lg mb-1">24-Hour Process & Key Handover Promise</h3>
                            <p className="text-orange-50 text-sm">
                                Fast-track your property application and get keys within 24 hours of approval
                            </p>
                        </div>

                        <button
                            onMouseEnter={() => setShowTooltip(true)}
                            onMouseLeave={() => setShowTooltip(false)}
                            onClick={() => setShowTooltip(!showTooltip)}
                            className="flex-shrink-0 w-6 h-6 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
                        >
                            <Info size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {showTooltip && (
                <div className="absolute right-4 top-16 w-64 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg shadow-xl p-4 z-50 border border-gray-200 dark:border-gray-700">
                    <h4 className="font-semibold text-sm mb-2">Conditions Apply:</h4>
                    <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-1.5 list-disc list-inside">
                        <li>Complete application submitted with all required documents</li>
                        <li>Credit check and background verification completed</li>
                        <li>Initial payment and deposit cleared</li>
                        <li>Property inspection completed (if required)</li>
                        <li>Available only for select properties</li>
                        <li>Subject to property availability and approval</li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default PromiseBanner;
