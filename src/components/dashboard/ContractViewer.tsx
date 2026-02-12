'use client';

import React, { useState, useEffect } from 'react';
import { FileText, Download, X } from 'lucide-react';

interface Contract {
    id?: string;
    name?: string;
    property?: string;
    type?: string;
    location?: string;
    category?: string;
}

interface ContractViewerProps {
    contract: Contract;
    onClose: () => void;
}

const ContractViewer = ({ contract, onClose }: ContractViewerProps) => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 800);
        return () => clearTimeout(timer);
    }, []);

    const currentDate = new Date().toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-5xl h-[85vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <FileText className="text-orange-600" size={24} />
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{contract.name || contract.property}</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{contract.type || 'Document'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => { const link = document.createElement('a'); link.href = '#'; link.download = `${contract.name || 'document'}.pdf`; link.click(); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors" title="Download">
                            <Download size={20} className="text-gray-600 dark:text-gray-400" />
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                            <X size={24} className="text-gray-600 dark:text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Document Content */}
                <div className="flex-1 overflow-y-auto bg-gray-100 dark:bg-gray-950 p-8">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
                                <p className="text-gray-600 dark:text-gray-400">Loading document...</p>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto bg-white dark:bg-gray-900 shadow-lg min-h-[800px] p-12">
                            {/* Document Header */}
                            <div className="text-center mb-12 border-b border-gray-200 dark:border-gray-800 pb-8">
                                <div className="flex items-center justify-center gap-2 mb-4">
                                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center text-white font-bold">E</div>
                                    <span className="text-xl font-bold text-gray-900 dark:text-white">ESTOSPACES</span>
                                </div>
                                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 uppercase tracking-wide">
                                    {contract.type || 'AGREEMENT'}
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Document Reference: {contract.id?.toUpperCase() || 'REF-001'}</p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Date: {currentDate}</p>
                            </div>

                            {/* Document Body */}
                            <div className="space-y-6 text-gray-800 dark:text-gray-200 text-justify leading-relaxed font-serif">
                                <p>
                                    <strong>THIS AGREEMENT</strong> is made on this day, {currentDate}, between <strong>ESTOSPACES PROPERTY MANAGEMENT</strong> (&quot;The Agent&quot;) and the undersigned party (&quot;The Tenant/Applicant&quot;).
                                </p>
                                <h3 className="font-bold text-lg mt-6 mb-2">1. PROPERTY DETAILS</h3>
                                <p>
                                    The property subject to this agreement is located at: <strong>{contract.location || '123 Example Street, London, UK'}</strong>.
                                    The property is being offered for {contract.category === 'sale' ? 'sale' : 'lease'} under the terms specified herein.
                                </p>
                                <h3 className="font-bold text-lg mt-6 mb-2">2. TERMS AND CONDITIONS</h3>
                                <p>
                                    The Tenant/Applicant agrees to the following terms:<br />
                                    (a) To maintain the property in good condition.<br />
                                    (b) To pay all applicable fees and rent on time.<br />
                                    (c) To comply with all building regulations and local laws.
                                </p>
                                <h3 className="font-bold text-lg mt-6 mb-2">3. {contract.type === 'Pet Policy Agreement' ? 'PET POLICY' : 'GENERAL PROVISIONS'}</h3>
                                <p>
                                    {contract.type === 'Pet Policy Agreement'
                                        ? "The Tenant is permitted to keep pets on the premises subject to the landlord's approval and adherence to the building's pet policy rules. The Tenant accepts full responsibility for any damage caused by the pet."
                                        : 'This agreement constitutes the entire understanding between the parties and supersedes all prior discussions, agreements, or understandings of any kind. This agreement may not be amended or modified except in writing signed by both parties.'}
                                </p>
                                <p className="mt-8 text-sm text-gray-500 dark:text-gray-400 italic">
                                    * This is a sample document generated for demonstration purposes. The content herein is not legally binding in this context.
                                </p>
                            </div>

                            {/* Signature Section */}
                            <div className="mt-16 pt-8 border-t border-gray-200 dark:border-gray-800">
                                <div className="grid grid-cols-2 gap-12">
                                    <div>
                                        <div className="h-16 border-b border-gray-300 dark:border-gray-700 mb-2"></div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Signature of Agent</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Authorized Representative</p>
                                    </div>
                                    <div>
                                        <div className="h-16 border-b border-gray-300 dark:border-gray-700 mb-2"></div>
                                        <p className="text-sm font-medium text-gray-900 dark:text-white">Signature of Applicant</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Tenant / Buyer</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ContractViewer;
