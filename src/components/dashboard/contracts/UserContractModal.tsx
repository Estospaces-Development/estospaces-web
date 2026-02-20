import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, CheckCircle, PenTool, Download } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { Contract, signContract } from '@/services/contractsService';

interface UserContractModalProps {
    contract: Contract;
    onClose: () => void;
    onSigned: () => void;
}

export default function UserContractModal({ contract: initialContract, onClose, onSigned }: UserContractModalProps) {
    const { success: toastSuccess, error: toastError } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [contract, setContract] = useState<Contract>(initialContract);
    const [agreed, setAgreed] = useState(false);

    const isUserSigned = !!contract.user_signed_at;
    const isManagerSigned = !!contract.manager_signed_at;
    const isActive = contract.status === 'active';

    const handleSign = async () => {
        if (!agreed) {
            toastError('You must agree to the terms and conditions');
            return;
        }

        setIsLoading(true);
        const { data, error } = await signContract(contract.id, 'user');

        if (error) {
            toastError(error);
            setIsLoading(false);
            return;
        }

        if (data) {
            setContract(data);
            toastSuccess('Contract signed successfully!');
            onSigned();
        }
        setIsLoading(false);
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 font-outfit">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-3xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FileText className="text-orange-500" />
                            Tenancy Agreement
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            Ref: {contract.id.substring(0, 8).toUpperCase()}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${isActive
                                ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800'
                                : 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800'
                            }`}>
                            {isActive ? 'Active Contract' : 'Pending Signatures'}
                        </span>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                            <X size={20} className="text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-gray-50 dark:bg-gray-900/50">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 max-w-2xl mx-auto">

                        {/* Contract Title */}
                        <div className="text-center mb-8 border-b border-gray-100 dark:border-gray-700 pb-6">
                            <h1 className="text-2xl font-serif font-bold text-gray-900 dark:text-white mb-2">AST Tenancy Agreement</h1>
                            <p className="text-gray-500 dark:text-gray-400">Assured Shorthold Tenancy</p>
                        </div>

                        {/* Key Terms */}
                        <div className="grid grid-cols-2 gap-6 mb-8">
                            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Monthly Rent</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">£{contract.monthly_rent?.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Security Deposit</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">£{contract.deposit_amount?.toLocaleString()}</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Start Date</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{formatDate(contract.start_date)}</p>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">End Date</p>
                                <p className="text-lg font-bold text-gray-900 dark:text-white">{contract.end_date ? formatDate(contract.end_date) : 'Rolling'}</p>
                            </div>
                        </div>

                        {/* Clauses */}
                        <div className="space-y-6 text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-8">
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">1. Agreement</h3>
                                <p>This agreement creates a tenancy that starts on {formatDate(contract.start_date)}.</p>
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900 dark:text-white mb-2">2. Rent</h3>
                                <p>The tenant agrees to pay a rent of £{contract.monthly_rent?.toLocaleString()} per month, payable in advance.</p>
                            </div>
                            {contract.terms_and_conditions && (
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">3. Special Terms</h3>
                                    <div className="whitespace-pre-wrap p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-100 dark:border-yellow-800/30">
                                        {contract.terms_and_conditions}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Signatures Area */}
                        <div className="grid grid-cols-2 gap-8 border-t border-gray-200 dark:border-gray-700 pt-8">
                            {/* Tenant Sig */}
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Tenant Signature</p>
                                {isUserSigned ? (
                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                        <div className="text-2xl text-green-700 dark:text-green-400 mb-1 italic">Signed Digitally</div>
                                        <p className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1">
                                            <CheckCircle size={12} />
                                            {formatDate(contract.user_signed_at)}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800">
                                        Pending Signature
                                    </div>
                                )}
                            </div>

                            {/* Manager Sig */}
                            <div>
                                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Landlord/Agent Signature</p>
                                {isManagerSigned ? (
                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                                        <div className="text-2xl text-green-700 dark:text-green-400 mb-1 italic">Signed Digitally</div>
                                        <p className="text-xs text-green-600 dark:text-green-500 flex items-center gap-1">
                                            <CheckCircle size={12} />
                                            {formatDate(contract.manager_signed_at)}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="h-24 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-800">
                                        Pending Signature
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-b-2xl">
                    {!isUserSigned ? (
                        <div className="flex flex-col gap-4">
                            <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                                <div className="relative flex items-center mt-1">
                                    <input
                                        type="checkbox"
                                        className="w-5 h-5 border-gray-300 rounded focus:ring-orange-500 text-orange-600"
                                        checked={agreed}
                                        onChange={(e) => setAgreed(e.target.checked)}
                                    />
                                </div>
                                <span className="text-sm text-gray-600 dark:text-gray-300">
                                    I have read and agree to the terms of this Tenancy Agreement. I understand that my digital signature is legally binding.
                                </span>
                            </label>

                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    Review Later
                                </button>
                                <button
                                    onClick={handleSign}
                                    disabled={!agreed || isLoading}
                                    className="px-6 py-2.5 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-xl font-medium transition-colors shadow-lg shadow-orange-200 dark:shadow-none flex items-center gap-2"
                                >
                                    {isLoading ? (
                                        <>
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            Signing...
                                        </>
                                    ) : (
                                        <>
                                            <PenTool size={18} />
                                            Sign Contract
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                                <CheckCircle size={20} />
                                <span>You have signed this contract</span>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                                >
                                    <Download size={18} />
                                    Download PDF
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-6 py-2.5 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-xl font-medium hover:opacity-90 transition-opacity"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}
