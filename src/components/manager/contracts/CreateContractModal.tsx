import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, FileText, Calendar, DollarSign, AlertCircle } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { createContract, CreateContractRequest } from '@/services/contractsService';

interface CreateContractModalProps {
    applicationId: string;
    propertyPrice: number;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateContractModal({ applicationId, propertyPrice, onClose, onSuccess }: CreateContractModalProps) {
    const { success: toastSuccess, error: toastError } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<CreateContractRequest>({
        application_id: applicationId,
        start_date: '',
        end_date: '',
        monthly_rent: propertyPrice || 0,
        deposit_amount: (propertyPrice || 0) * 1.2, // Default 5 weeks deposit approx
        terms_and_conditions: 'Standard Assured Shorthold Tenancy Agreement terms apply.'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const { data, error } = await createContract(formData);

        if (error) {
            toastError(error);
            setIsLoading(false);
            return;
        }

        toastSuccess('Contract drafted successfully');
        onSuccess();
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 font-outfit">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText className="text-orange-500" />
                        Draft Tenancy Agreement
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <form id="contract-form" onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Rent & Deposit */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Monthly Rent (£)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={formData.monthly_rent}
                                        onChange={(e) => setFormData({ ...formData, monthly_rent: parseFloat(e.target.value) })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Security Deposit (£)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="number"
                                        required
                                        min="0"
                                        value={formData.deposit_amount}
                                        onChange={(e) => setFormData({ ...formData, deposit_amount: parseFloat(e.target.value) })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Dates */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Start Date</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="date"
                                        required
                                        value={formData.start_date}
                                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">End Date (Optional)</label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="date"
                                        value={formData.end_date}
                                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Terms */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Special Terms & Conditions</label>
                            <textarea
                                rows={6}
                                value={formData.terms_and_conditions}
                                onChange={(e) => setFormData({ ...formData, terms_and_conditions: e.target.value })}
                                className="w-full p-4 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 dark:bg-gray-700 dark:text-white resize-none"
                                placeholder="Enter any specific clauses or terms..."
                            />
                        </div>

                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex gap-3 text-sm text-blue-800 dark:text-blue-300">
                            <AlertCircle className="flex-shrink-0 mt-0.5" size={16} />
                            <p>
                                Once drafted, the tenant will be notified to review and sign the agreement.
                                You will need to countersign after they have signed.
                            </p>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-b-2xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="contract-form"
                        disabled={isLoading}
                        className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium transition-colors shadow-sm disabled:opacity-70 flex items-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                creating...
                            </>
                        ) : (
                            <>
                                <FileText size={18} />
                                Draft Contract
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
}
