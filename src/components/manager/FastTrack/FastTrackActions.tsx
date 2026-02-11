import React from 'react';
import { FastTrackStep } from '../../../mocks/fastTrackCases';
import { CheckCircle, Home, Scale, CreditCard, ArrowRight } from 'lucide-react';

interface FastTrackActionsProps {
    currentStep: FastTrackStep;
    onAdvance: () => void;
    isDocumentsVerified: boolean;
    isReadOnly: boolean;
}

const FastTrackActions: React.FC<FastTrackActionsProps> = ({ currentStep, onAdvance, isDocumentsVerified, isReadOnly }) => {

    if (isReadOnly && currentStep !== 'completed') {
        return (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800 text-center">
                <p className="text-sm text-red-500 font-medium">Case Expired. Actions Locked.</p>
            </div>
        )
    }

    if (currentStep === 'completed') {
        return (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800 text-center">
                <p className="text-sm text-green-600 font-medium flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" /> Deal Ready
                </p>
            </div>
        )
    }

    const getButtonConfig = () => {
        switch (currentStep) {
            case 'documents':
                return {
                    label: 'Request Owner Approval',
                    icon: Home,
                    disabled: !isDocumentsVerified,
                    hint: !isDocumentsVerified ? 'Verify all documents first' : undefined
                };
            case 'owner_approval':
                return {
                    label: 'Mark Legal Check Complete',
                    icon: Scale,
                    disabled: false
                };
            case 'legal_check':
                return {
                    label: 'Confirm Payment Ready',
                    icon: CreditCard,
                    disabled: false
                };
            case 'payment_ready':
                return {
                    label: 'Mark Deal Ready',
                    icon: CheckCircle,
                    disabled: false
                };
            default:
                return { label: 'Continue', icon: ArrowRight, disabled: false };
        }
    };

    const config = getButtonConfig();
    const Icon = config.icon;

    return (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
            <button
                onClick={onAdvance}
                disabled={config.disabled}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-300
          ${config.disabled
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-zinc-800 dark:text-gray-600'
                        : 'bg-orange-600 text-white hover:bg-orange-700 hover:shadow-md hover:scale-[1.02]'
                    }
        `}
                title={config.hint}
            >
                <Icon className="w-4 h-4" />
                {config.label}
            </button>
            {config.hint && (
                <p className="text-xs text-center text-amber-500 mt-2">{config.hint}</p>
            )}
        </div>
    );
};

export default FastTrackActions;
