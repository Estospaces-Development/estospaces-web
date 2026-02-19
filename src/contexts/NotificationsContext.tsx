"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import * as notificationsService from '../services/notificationsService';
import type { Notification } from '../services/notificationsService';

interface NotificationsContextType {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    fetchNotifications: () => Promise<void>;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    createNotification: (type: string, title: string, message: string, data?: Record<string, any>) => Promise<Notification | null>;
    deleteNotification: (notificationId: string) => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export { NOTIFICATION_TYPES } from '../services/notificationsService';

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchNotifications = useCallback(async () => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            return;
        }

        setLoading(true);
        try {
            const result = await notificationsService.getNotifications();
            setNotifications(result.notifications || []);
            setUnreadCount(result.unread_count || 0);
        } catch (err) {
            console.error('Error fetching notifications:', err);
            // Gracefully degrade — keep existing state
        } finally {
            setLoading(false);
        }
    }, [user]);

    const markAsRead = useCallback(async (notificationId: string) => {
        try {
            await notificationsService.markRead(notificationId);
            setNotifications(prev =>
                prev.map(n => n.id === notificationId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error marking notification as read:', err);
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            await notificationsService.markAllRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true, read_at: new Date().toISOString() })));
            setUnreadCount(0);
        } catch (err) {
            console.error('Error marking all as read:', err);
        }
    }, []);

    const createNotification = useCallback(async (type: string, title: string, message: string, data: Record<string, any> = {}) => {
        if (!user?.id) return null;
        try {
            const success = await notificationsService.createNotification({
                userId: user.id,
                type: type as any,
                title,
                message,
                data,
            });
            if (success) {
                // Optimistically add to local state
                const newNotification: Notification = {
                    id: `local-${Date.now()}`,
                    user_id: user.id,
                    type,
                    title,
                    message,
                    data: JSON.stringify(data),
                    is_read: false,
                    channel: 'in_app',
                    created_at: new Date().toISOString(),
                };
                setNotifications(prev => [newNotification, ...prev]);
                setUnreadCount(prev => prev + 1);
                return newNotification;
            }
            return null;
        } catch (err) {
            console.error('Error creating notification:', err);
            return null;
        }
    }, [user?.id]);

    const deleteNotification = useCallback((notificationId: string) => {
        const notification = notifications.find(n => n.id === notificationId);
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        if (notification && !notification.is_read) {
            setUnreadCount(prev => Math.max(0, prev - 1));
        }
    }, [notifications]);

    // Fetch on mount and when user changes
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    // Poll every 30 seconds for new notifications
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, [user, fetchNotifications]);

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
