"use client";

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../../contexts/ToastContext';
import Toast from './Toast';

const NotificationContainer = () => {
    const { toasts, removeToast } = useToast();

    // Group toasts by position
    const toastsByPosition = toasts.reduce<Record<string, typeof toasts>>((acc, toast) => {
        const position = toast.position || 'top-right';
        if (!acc[position]) {
            acc[position] = [];
        }
        acc[position].push(toast);
        return acc;
    }, {});

    return (
        <>
            {Object.entries(toastsByPosition).map(([position, positionToasts]) => {
                // Calculate position styles
                const getPositionStyles = () => {
                    const styles: React.CSSProperties = {};
                    if (position.includes('top')) {
                        styles.top = '1rem';
                    } else {
                        styles.bottom = '1rem';
                    }

                    if (position.includes('left')) {
                        styles.left = '1rem';
                    } else if (position.includes('right')) {
                        styles.right = '1rem';
                    } else if (position.includes('center')) {
                        styles.left = '50%';
                        styles.transform = 'translateX(-50%)';
                    }
                    return styles;
                };

                return (
                    <div
                        key={position}
                        className="fixed z-[9998] pointer-events-none"
                        style={getPositionStyles()}
                    >
                        <div className="flex flex-col gap-3">
                            <AnimatePresence mode="popLayout">
                                {positionToasts.map((toast, index) => (
                                    <motion.div
                                        key={toast.id}
                                        layout
                                        initial={{ opacity: 0, y: position.includes('bottom') ? 20 : -20, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, y: position.includes('bottom') ? 20 : -20, scale: 0.95 }}
                                        transition={{ duration: 0.2, delay: index * 0.05 }}
                                        className="pointer-events-auto"
                                    >
                                        <Toast
                                            id={toast.id}
                                            message={toast.message}
                                            title={toast.title}
                                            type={toast.type}
                                            isVisible={toast.isVisible}
                                            onClose={() => removeToast(toast.id)}
                                            duration={toast.duration}
                                            position={toast.position}
                                        />
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    </div>
                );
            })}
        </>
    );
};

export default NotificationContainer;
