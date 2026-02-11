import React from 'react';
import { FastTrackDocuments as IFastTrackDocuments } from '../../../mocks/fastTrackCases';
import { Check, Loader2 } from 'lucide-react';

interface FastTrackDocumentsProps {
    documents: IFastTrackDocuments;
    onVerify: (docType: keyof IFastTrackDocuments) => void;
    isReadOnly: boolean;
}

const FastTrackDocuments: React.FC<FastTrackDocumentsProps> = ({ documents, onVerify, isReadOnly }) => {
    const docLabels: { key: keyof IFastTrackDocuments; label: string }[] = [
        { key: 'idProof', label: 'ID Proof' },
        { key: 'incomeProof', label: 'Income Proof' },
        { key: 'propertyDocs', label: 'Property Docs' },
    ];

    return (
        <div className="bg-gray-50 dark:bg-zinc-900/50 rounded-lg p-3 border border-gray-100 dark:border-zinc-800 my-2">
            <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Required Documents</h4>
            <div className="space-y-2">
                {docLabels.map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 dark:text-gray-300">{label}</span>
                        {documents[key] === 'verified' ? (
                            <span className="flex items-center gap-1 text-green-600 text-xs font-medium bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                                <Check className="w-3 h-3" /> Verified
                            </span>
                        ) : (
                            <button
                                onClick={() => onVerify(key)}
                                disabled={isReadOnly}
                                className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors
                        ${isReadOnly
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        : 'bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40'}
                    `}
                            >
                                {isReadOnly ? 'Pending' : 'Verify'}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FastTrackDocuments;
