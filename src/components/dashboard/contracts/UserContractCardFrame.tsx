import type { ReactNode } from 'react';

interface UserContractCardFrameProps {
    needsSignature: boolean;
    isLinked: boolean;
    children: ReactNode;
}

export const UserContractCardFrame = ({ needsSignature, isLinked, children }: UserContractCardFrameProps) => (
    <div aria-current={isLinked ? 'true' : undefined} className={`p-6 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border transition-all group ${
        needsSignature
            ? 'border-orange-300 dark:border-orange-700 shadow-orange-100 dark:shadow-orange-900/20 shadow-sm'
            : 'border-gray-200 dark:border-gray-700'
    } ${isLinked ? 'ring-2 ring-gray-300 dark:ring-gray-600' : ''}`}>
        {(needsSignature || isLinked) && (
            <div className="mb-3 flex flex-wrap gap-2 text-xs font-medium">
                {isLinked && (
                    <span className="rounded-full bg-gray-200 px-2.5 py-1 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                        Linked contract
                    </span>
                )}
                {needsSignature && (
                    <span className="rounded-full bg-orange-50 px-2.5 py-1 text-orange-700 dark:bg-orange-950 dark:text-orange-200">
                        Your signature needed
                    </span>
                )}
            </div>
        )}
        {children}
    </div>
);
