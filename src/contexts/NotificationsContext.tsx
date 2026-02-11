"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';

const NotificationsContext = createContext<any>(undefined);

export const NOTIFICATION_TYPES = {
    APPOINTMENT_APPROVED: 'appointment_approved',
    APPOINTMENT_REJECTED: 'appointment_rejected',
    APPOINTMENT_REMINDER: 'appointment_reminder',
    VIEWING_BOOKED: 'viewing_booked',
    VIEWING_CONFIRMED: 'viewing_confirmed',
    VIEWING_CANCELLED: 'viewing_cancelled',
    VIEWING_RESCHEDULED: 'viewing_rescheduled',
    APPLICATION_UPDATE: 'application_update',
    APPLICATION_SUBMITTED: 'application_submitted',
    APPLICATION_APPROVED: 'application_approved',
    APPLICATION_REJECTED: 'application_rejected',
    DOCUMENTS_REQUESTED: 'documents_requested',
    DOCUMENT_VERIFIED: 'document_verified',
    PROFILE_VERIFIED: 'profile_verified',
    MESSAGE_RECEIVED: 'message_received',
    TICKET_RESPONSE: 'ticket_response',
    PROPERTY_SAVED: 'property_saved',
    PRICE_DROP: 'price_drop',
    NEW_PROPERTY_MATCH: 'new_property_match',
    PROPERTY_AVAILABLE: 'property_available',
    PROPERTY_UNAVAILABLE: 'property_unavailable',
    PAYMENT_REMINDER: 'payment_reminder',
    PAYMENT_RECEIVED: 'payment_received',
    PAYMENT_FAILED: 'payment_failed',
    CONTRACT_UPDATE: 'contract_update',
    CONTRACT_EXPIRING: 'contract_expiring',
    SYSTEM: 'system',
    WELCOME: 'welcome',
};

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    // Fetch notifications
    const fetchNotifications = useCallback(async () => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        setLoading(true);
        try {
            // MOCK DATA for now
            const mocks = [
                {
                    id: 'mock-1',
                    title: 'New Lead: Alex Mercer',
                    message: 'Alex Mercer inquired about "Stunning 4-Bedroom Victorian House".',
                    created_at: new Date(Date.now() - 3600000).toISOString(),
                    read: false,
                    type: 'message_received'
                },
                {
                    id: 'mock-2',
                    title: 'Welcome to Estospaces',
                    message: 'Your account has been created successfully.',
                    created_at: new Date(Date.now() - 86400000).toISOString(),
                    read: true,
                    type: 'welcome'
                }
            ];
            setNotifications(mocks);
            setUnreadCount(mocks.filter(n => !n.read).length);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Mark notification as read
    const markAsRead = useCallback(async (notificationId: string) => {
        setNotifications(prev =>
            prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
    }, []);

    // Mark all as read
    const markAllAsRead = useCallback(async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
    }, []);

    // Create a notification (used by other parts of the app)
    const createNotification = useCallback(async (type: string, title: string, message: string, data = {}) => {
        const newNotification = {
            id: `new-${Date.now()}`,
            type,
            title,
            message,
            data,
            read: false,
            created_at: new Date().toISOString()
        };
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        return newNotification;
    }, []);

    // Delete notification
    const deleteNotification = useCallback(async (notificationId: string) => {
        const notification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        if (notification && !notification.read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
    }, [notifications]);

    // Fetch on mount and when user changes
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    return (
        <NotificationsContext.Provider
            value={{
                notifications,
                unreadCount,
                loading,
                fetchNotifications,
                markAsRead,
                markAllAsRead,
                createNotification,
                deleteNotification,
            }}
        >
            {children}
        </NotificationsContext.Provider>
    );
};

export const useNotifications = () => {
    const context = useContext(NotificationsContext);
    if (!context) {
        throw new Error('useNotifications must be used within a NotificationsProvider');
    }
    return context;
};

export default NotificationsContext;
