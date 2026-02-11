"use client";

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, X, AlertTriangle, Info } from 'lucide-react';
import type { ToastMessage } from '../../contexts/ToastContext';

interface ToastProps extends Omit<ToastMessage, 'isVisible'> {
    isVisible?: boolean;
    onClose: () => void;
}

const Toast = ({ id, message, title, type = 'success', isVisible = true, onClose, duration = 5000, position = 'top-right' }: ToastProps) => {
    useEffect(() => {
        if (isVisible && duration > 0) {
            const timer = setTimeout(() => {
                onClose();
            }, duration);
            return () => clearTimeout(timer);
        }
    }, [isVisible, duration, onClose]);

    const styles = {
        success: {
            bg: 'bg-green-500',
            border: 'border-green-600',
            icon: CheckCircle,
            iconColor: 'text-white',
        },
        error: {
            bg: 'bg-red-500',
            border: 'border-red-600',
            icon: XCircle,
            iconColor: 'text-white',
        },
        warning: {
            bg: 'bg-yellow-500',
            border: 'border-yellow-600',
            icon: AlertTriangle,
            iconColor: 'text-white',
        },
        info: {
            bg: 'bg-blue-500',
            border: 'border-blue-600',
            icon: Info,
            iconColor: 'text-white',
        },
    };

    const positionClasses = {
        'top-right': 'top-4 right-4',
        'top-left': 'top-4 left-4',
        'top-center': 'top-4 left-1/2 -translate-x-1/2',
        'bottom-right': 'bottom-4 right-4',
        'bottom-left': 'bottom-4 left-4',
        'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
    };

    const currentStyle = styles[type] || styles.success;
    const Icon = currentStyle.icon;
    // const positionClass = positionClasses[position] || positionClasses['top-right']; // Handled by container usually, but ok here if used independently

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    key={id}
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className={`relative ${currentStyle.bg} ${currentStyle.border} border-2 text-white rounded-xl shadow-2xl flex items-start gap-3 min-w-[320px] max-w-[420px] p-4 pointer-events-auto`}
                >
                    <Icon className={`${currentStyle.iconColor} flex-shrink-0 mt-0.5`} size={22} />
                    <div className="flex-1 min-w-0">
                        {title && (
                            <h4 className="font-semibold text-sm mb-1 text-white">{title}</h4>
                        )}
                        <p className="text-sm font-medium leading-relaxed text-white/90">{message}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/20 rounded-full transition-colors flex-shrink-0 text-white"
                        aria-label="Close notification"
                    >
                        <X size={18} />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default Toast;
