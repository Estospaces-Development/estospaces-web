import React from 'react';
import { FastTrackStep } from '@/services/fastTrackService';
import { ArrowRight, CheckCircle, FileCheck2 } from 'lucide-react';

interface FastTrackActionsProps {
    currentStep: FastTrackStep;
    onAdvance: () => void;
    isDocumentsVerified: boolean;
    isReadOnly: boolean;
    nextAction?: string;
    statusReason?: string;
    pendingRequirements?: string[];
    completedRequirements?: string[];
    overrideReason?: string;
    onOverrideReasonChange?: (value: string) => void;
}

const FastTrackActions: React.FC<FastTrackActionsProps> = ({
    currentStep,
    onAdvance,
    isDocumentsVerified,
    isReadOnly,
    nextAction,
    statusReason,
    pendingRequirements = [],
    completedRequirements = [],
    overrideReason = '',
    onOverrideReasonChange,
}) => {

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
            case 'documents_requested':
                if (!isDocumentsVerified) {
                    return {
                        label: 'Continue with manager override',
                        icon: ArrowRight,
                        disabled: !overrideReason.trim(),
                        hint: 'Add a transparent override reason before moving forward without both approved documents.'
                    };
                }
                return {
                    label: 'Mark documents verified',
                    icon: FileCheck2,
                    disabled: !isDocumentsVerified,
                    hint: !isDocumentsVerified ? 'Verify all documents first' : undefined
                };
            default:
                return null;
        }
    };

    const config = getButtonConfig();

    return (
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-zinc-800">
            {(nextAction || statusReason) && (
                <div className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-zinc-700 dark:bg-zinc-900/40">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">Guided next step</p>
                    {nextAction ? (
                        <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{nextAction}</p>
                    ) : null}
                    {statusReason ? (
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{statusReason}</p>
                    ) : null}
                </div>
            )}
            {currentStep === 'documents_requested' && !isDocumentsVerified && onOverrideReasonChange ? (
                <div className="mb-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-4 dark:border-orange-900/40 dark:bg-orange-950/20">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-500">Manager override</p>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        If you need to move this case forward before both documents are approved, leave a visible reason for the client and audit trail.
                    </p>
                    <textarea
                        value={overrideReason}
                        onChange={(event) => onOverrideReasonChange(event.target.value)}
                        rows={3}
                        placeholder="Explain why this case is being advanced manually"
                        className="mt-3 w-full rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-orange-400 dark:border-orange-900/40 dark:bg-black dark:text-gray-100"
                    />
                </div>
            ) : null}
            {(pendingRequirements.length > 0 || completedRequirements.length > 0) && (
                <div className="mb-4 grid gap-3 md:grid-cols-2">
                    {pendingRequirements.length > 0 ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">Still pending</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {pendingRequirements.map((item) => (
                                    <span key={item} className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs font-medium text-amber-700 dark:border-amber-900/40 dark:bg-black dark:text-amber-200">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : null}
                    {completedRequirements.length > 0 ? (
                        <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-4 dark:border-green-900/40 dark:bg-green-950/20">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-600">Completed</p>
                            <div className="mt-3 flex flex-wrap gap-2">
                                {completedRequirements.map((item) => (
                                    <span key={item} className="rounded-full border border-green-200 bg-white px-3 py-1 text-xs font-medium text-green-700 dark:border-green-900/40 dark:bg-black dark:text-green-200">
                                        {item}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </div>
            )}
            {config ? (
                <>
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
                        <config.icon className="w-4 h-4" />
                        {config.label}
                    </button>
                    {config.hint && (
                        <p className="text-xs text-center text-amber-500 mt-2">{config.hint}</p>
                    )}
                </>
            ) : (
                <div className="rounded-2xl border border-dashed border-gray-200 px-4 py-4 text-sm text-gray-500 dark:border-zinc-700 dark:text-gray-400">
                    The operational actions for this stage are shown above from the linked viewing, review, contract, or billing records.
                </div>
            )}
        </div>
    );
};

export default FastTrackActions;
