"use client";

import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    ReactNode,
    useRef,
} from 'react';
import { useAuth } from './AuthContext';
import { useToast } from './ToastContext';
import * as notificationsService from '../services/notificationsService';
import {
    getNotificationNavigationPath,
    NOTIFICATION_TYPES as NOTIFICATION_TYPE_VALUES,
    type Notification,
} from '../services/notificationsService';
import { buildHostedWorkspaceUrl } from '@/lib/utils/hostUtils';

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

const HIGH_PRIORITY_NOTIFICATION_TYPES = new Set([
    NOTIFICATION_TYPE_VALUES.VIEWING_BOOKED,
    NOTIFICATION_TYPE_VALUES.VIEWING_CONFIRMED,
    NOTIFICATION_TYPE_VALUES.VIEWING_COMPLETED,
    NOTIFICATION_TYPE_VALUES.VIEWING_RESCHEDULED,
    NOTIFICATION_TYPE_VALUES.VIEWING_CANCELLED,
    NOTIFICATION_TYPE_VALUES.APPOINTMENT_REMINDER,
    NOTIFICATION_TYPE_VALUES.MESSAGE_RECEIVED,
    NOTIFICATION_TYPE_VALUES.DOCUMENTS_REQUESTED,
    NOTIFICATION_TYPE_VALUES.SALE_JOURNEY_UPDATED,
    NOTIFICATION_TYPE_VALUES.SALE_JOURNEY_COMPLETED,
    NOTIFICATION_TYPE_VALUES.FAST_TRACK_STARTED,
    NOTIFICATION_TYPE_VALUES.FAST_TRACK_UPDATED,
    NOTIFICATION_TYPE_VALUES.FAST_TRACK_COMPLETED,
    NOTIFICATION_TYPE_VALUES.SYSTEM,
]);

const BROWSER_NOTIFICATION_ICON = '/images/logo-icon.png';

const supportsBrowserNotifications = () =>
    typeof window !== 'undefined' && 'Notification' in window;

const showBrowserNotification = (notification: Notification, role: string) => {
    if (!supportsBrowserNotifications() || window.Notification.permission !== 'granted') {
        return;
    }

    const browserNotification = new window.Notification(notification.title || 'New notification', {
        body: notification.message,
        icon: BROWSER_NOTIFICATION_ICON,
        badge: BROWSER_NOTIFICATION_ICON,
        tag: `estospaces-${notification.id}`,
        requireInteraction: HIGH_PRIORITY_NOTIFICATION_TYPES.has(notification.type as any),
    });

    browserNotification.onclick = () => {
        window.focus();
        const targetPath = getNotificationNavigationPath(notification, role);
        if (targetPath) {
            window.location.href = buildHostedWorkspaceUrl(targetPath, role);
        }
        browserNotification.close();
    };

    if (!HIGH_PRIORITY_NOTIFICATION_TYPES.has(notification.type as any)) {
        window.setTimeout(() => browserNotification.close(), 10000);
    }
};

export const NotificationsProvider = ({ children }: { children: ReactNode }) => {
    const { user } = useAuth();
    const toast = useToast();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const hasHydratedRef = useRef(false);
    const previousUnreadIDsRef = useRef<Set<string>>(new Set());

    const loadNotifications = useCallback(async (silent: boolean) => {
        if (!user) {
            setNotifications([]);
            setUnreadCount(0);
            previousUnreadIDsRef.current = new Set();
            hasHydratedRef.current = false;
            return;
        }

        if (!silent) {
            setLoading(true);
        }

        try {
            const result = await notificationsService.getNotifications();
            const nextNotifications = result.notifications || [];
            const nextUnreadIDs = new Set(
                nextNotifications
                    .filter((notification) => !notification.is_read)
                    .map((notification) => notification.id),
            );
            const isDocumentHidden =
                typeof document !== 'undefined' && document.visibilityState === 'hidden';

            if (hasHydratedRef.current) {
                const freshNotifications = nextNotifications
                    .filter((notification) => !notification.is_read && !previousUnreadIDsRef.current.has(notification.id))
                    .slice(0, 3);

                freshNotifications.forEach((notification) => {
                    const isHighPriority = HIGH_PRIORITY_NOTIFICATION_TYPES.has(notification.type as any);
                    if (!isDocumentHidden) {
                        const toastMethod = isHighPriority ? toast.warning : toast.info;

                        toastMethod(notification.message, {
                            title: notification.title || 'New notification',
                            duration: isHighPriority ? 9000 : 5000,
                            position: 'top-right',
                        });
                    }

                    showBrowserNotification(notification, user?.role || 'user');
                });
            }

            previousUnreadIDsRef.current = nextUnreadIDs;
            hasHydratedRef.current = true;
            setNotifications(nextNotifications);
            setUnreadCount(result.unread_count || 0);
        } catch {
            // Keep the current state if polling fails.
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, [toast, user]);

    const fetchNotifications = useCallback(async () => {
        await loadNotifications(false);
    }, [loadNotifications]);

    const markAsRead = useCallback(async (notificationId: string) => {
        try {
            await notificationsService.markRead(notificationId);
            setNotifications((previous) =>
                previous.map((notification) =>
                    notification.id === notificationId
                        ? { ...notification, is_read: true, read_at: new Date().toISOString() }
                        : notification,
                ),
            );
            previousUnreadIDsRef.current.delete(notificationId);
            setUnreadCount((previous) => Math.max(0, previous - 1));
        } catch {
            // Leave the current state unchanged if the API call fails.
        }
    }, []);

    const markAllAsRead = useCallback(async () => {
        try {
            await notificationsService.markAllRead();
            setNotifications((previous) =>
                previous.map((notification) => ({
                    ...notification,
                    is_read: true,
                    read_at: new Date().toISOString(),
                })),
            );
            previousUnreadIDsRef.current = new Set();
            setUnreadCount(0);
        } catch {
            // Leave the current state unchanged if the API call fails.
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
                const newNotification: Notification = {
                    id: `local-${Date.now()}`,
                    user_id: user.id,
                    type,
                    title,
                    message,
                    data,
                    is_read: false,
                    channel: 'in_app',
                    created_at: new Date().toISOString(),
                };
                setNotifications((previous) => [newNotification, ...previous]);
                previousUnreadIDsRef.current.add(newNotification.id);
                setUnreadCount((previous) => previous + 1);
                return newNotification;
            }
            return null;
        } catch {
            return null;
        }
    }, [user?.id]);

    const deleteNotification = useCallback((notificationId: string) => {
        const notification = notifications.find((entry) => entry.id === notificationId);
        setNotifications((previous) => previous.filter((entry) => entry.id !== notificationId));
        previousUnreadIDsRef.current.delete(notificationId);
        if (notification && !notification.is_read) {
            setUnreadCount((previous) => Math.max(0, previous - 1));
        }
    }, [notifications]);

    useEffect(() => {
        void fetchNotifications();
    }, [fetchNotifications]);

    useEffect(() => {
        if (!user) return;
        const refreshNotifications = () => {
            void loadNotifications(true);
        };

        const interval = setInterval(refreshNotifications, 5000);
        window.addEventListener('focus', refreshNotifications);
        document.addEventListener('visibilitychange', refreshNotifications);

        return () => {
            clearInterval(interval);
            window.removeEventListener('focus', refreshNotifications);
            document.removeEventListener('visibilitychange', refreshNotifications);
        };
    }, [loadNotifications, user]);

    useEffect(() => {
        if (!user || !supportsBrowserNotifications() || window.Notification.permission !== 'default') {
            return;
        }

        const requestPermission = () => {
            void window.Notification.requestPermission();
            window.removeEventListener('click', requestPermission);
            window.removeEventListener('keydown', requestPermission);
            window.removeEventListener('touchstart', requestPermission);
        };

        window.addEventListener('click', requestPermission, { once: true, passive: true });
        window.addEventListener('keydown', requestPermission, { once: true });
        window.addEventListener('touchstart', requestPermission, { once: true, passive: true });

        return () => {
            window.removeEventListener('click', requestPermission);
            window.removeEventListener('keydown', requestPermission);
            window.removeEventListener('touchstart', requestPermission);
        };
    }, [user]);

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
