'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, Loader2 } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    isLoading?: boolean;
}

const ConfirmationModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = false,
    isLoading = false
}: ConfirmationModalProps) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={isLoading ? undefined : onClose}
            />
            
            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 fade-in duration-200">
                <button 
                    onClick={onClose}
                    disabled={isLoading}
                    className="absolute top-4 right-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50"
                >
                    <X size={20} className="text-gray-400" />
                </button>

                <div className="flex flex-col items-center text-center space-y-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                        <AlertCircle size={24} />
                    </div>
                    
                    <div className="space-y-2">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {title}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400">
                            {message}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
                        <button
                            onClick={onClose}
                            disabled={isLoading}
                            className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            disabled={isLoading}
                            className={`flex-1 px-4 py-2.5 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 ${
                                isDestructive 
                                    ? 'bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/20' 
                                    : 'bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20'
                            } disabled:opacity-50`}
                        >
                            {isLoading && <Loader2 size={18} className="animate-spin" />}
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ConfirmationModal;
