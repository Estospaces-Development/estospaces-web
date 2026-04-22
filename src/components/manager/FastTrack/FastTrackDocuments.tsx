import React from 'react';
import { FastTrackDocuments as IFastTrackDocuments } from '../../../services/fastTrackService';
import { Check, Clock } from 'lucide-react';

interface FastTrackDocumentsProps {
    documents: IFastTrackDocuments;
    onVerify?: (docType: keyof IFastTrackDocuments) => void;
    isReadOnly?: boolean;
}

const FastTrackDocuments: React.FC<FastTrackDocumentsProps> = ({ documents }) => {
    const docLabels: { key: keyof IFastTrackDocuments; label: string }[] = [
        { key: 'identityProof', label: 'Identity proof' },
        { key: 'addressProof', label: 'Address proof' },
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
                            <span className="flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300 px-2 py-0.5 rounded-full">
                                <Clock className="w-3 h-3" /> Pending review
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FastTrackDocuments;
