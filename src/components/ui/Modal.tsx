"use client";

import React, { useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    children: React.ReactNode;
    showCloseButton?: boolean;
    closeOnBackdrop?: boolean;
    footer?: React.ReactNode;
}

const sizeClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-[95vw]',
};

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    title,
    size = 'md',
    children,
    showCloseButton = true,
    closeOnBackdrop = true,
    footer,
}) => {
    const handleEscape = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        },
        [onClose]
    );

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = '';
        };
    }, [isOpen, handleEscape]);

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-end justify-center sm:items-center sm:p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? 'modal-title' : undefined}
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={closeOnBackdrop ? onClose : undefined}
            />

            {/* Panel */}
            <div
                className={`relative flex max-h-[calc(100dvh-1rem)] min-w-0 w-full ${sizeClasses[size]} flex-col rounded-t-3xl border border-gray-100 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 dark:border-zinc-800 dark:bg-zinc-900 sm:max-h-[90dvh] sm:rounded-2xl sm:pb-0 sm:zoom-in-95`}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-4 dark:border-zinc-800 sm:p-5">
                        {title && (
                            <h2
                                id="modal-title"
                                className="mobile-safe-text text-lg font-semibold text-gray-900 dark:text-white"
                            >
                                {title}
                            </h2>
                        )}
                        {showCloseButton && (
                            <button
                                type="button"
                                onClick={onClose}
                                className="ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:hover:bg-zinc-800"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                            </button>
                        )}
                    </div>
                )}

                {/* Body */}
                <div className="min-w-0 flex-1 overflow-y-auto p-4 sm:p-5">{children}</div>

                {/* Footer */}
                {footer && (
                    <div className="mobile-modal-footer border-t border-gray-100 p-4 dark:border-zinc-800 sm:p-5">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default Modal;
