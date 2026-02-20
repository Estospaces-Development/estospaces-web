"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';

export type ToastType = 'success' | 'error' | 'warning' | 'info';
export type ToastPosition = 'top-right' | 'top-left' | 'top-center' | 'bottom-right' | 'bottom-left' | 'bottom-center';

export interface ToastMessage {
    id: string;
    message: string;
    type: ToastType;
    title?: string;
    duration?: number;
    position?: ToastPosition;
    isVisible: boolean;
}

interface ToastOptions {
    type?: ToastType;
    title?: string;
    duration?: number;
    position?: ToastPosition;
}

interface ToastContextType {
    toasts: ToastMessage[];
    showToast: (message: string, options?: ToastOptions) => string;
    removeToast: (id: string) => void;
    success: (message: string, options?: Omit<ToastOptions, 'type'>) => string;
    error: (message: string, options?: Omit<ToastOptions, 'type'>) => string;
    warning: (message: string, options?: Omit<ToastOptions, 'type'>) => string;
    info: (message: string, options?: Omit<ToastOptions, 'type'>) => string;
    clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider = ({ children }: { children: ReactNode }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = useCallback((message: string, options: ToastOptions = {}) => {
        const {
            type = 'success',
            title,
            duration = 5000,
            position = 'top-right',
        } = options;

        const id = uuidv4();
        const newToast: ToastMessage = {
            id,
            message,
            title,
            type,
            duration,
            position,
            isVisible: true,
        };

        setToasts((prev) => [...prev, newToast]);
        return id;
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const success = useCallback((message: string, options: Omit<ToastOptions, 'type'> = {}) => {
        return showToast(message, { ...options, type: 'success' });
    }, [showToast]);

    const error = useCallback((message: string, options: Omit<ToastOptions, 'type'> = {}) => {
        return showToast(message, { ...options, type: 'error' });
    }, [showToast]);

    const warning = useCallback((message: string, options: Omit<ToastOptions, 'type'> = {}) => {
        return showToast(message, { ...options, type: 'warning' });
    }, [showToast]);

    const info = useCallback((message: string, options: Omit<ToastOptions, 'type'> = {}) => {
        return showToast(message, { ...options, type: 'info' });
    }, [showToast]);

    const clearAll = useCallback(() => {
        setToasts([]);
    }, []);

    return (
        <ToastContext.Provider
            value={{
                toasts,
                showToast,
                removeToast,
                success,
                error,
                warning,
                info,
                clearAll,
            }}
        >
            {children}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export default ToastContext;
