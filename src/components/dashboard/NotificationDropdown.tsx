"use client";

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Bell, Check, X, Calendar, FileText, Home, MessageSquare, CreditCard, Info, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import BrandLoadingScreen from '@/components/ui/BrandLoadingScreen';
import {
    getNotificationNavigationPath,
    getNotificationsPagePath,
    isPropertyWorkflowNotification,
    NOTIFICATION_TYPES,
    type Notification,
} from '@/services/notificationsService';
import { buildHostedWorkspaceUrl } from '@/lib/utils/hostUtils';
import { getNotificationIconColorClass } from '@/lib/notificationVisuals';
import { PAYMENTS_ENABLED } from '@/lib/launchFlags';
import { getLaunchSafeNotificationCopy } from '@/lib/notificationLaunchCopy';

interface NotificationDropdownProps {
    appearance?: 'surface' | 'brand';
}

const NotificationDropdown = ({ appearance = 'surface' }: NotificationDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const navigate = useNavigate();
    const { user } = useAuth();
    const {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
    } = useNotifications();

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') return;

            event.preventDefault();
            setIsOpen(false);
            buttonRef.current?.focus();
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    const safeNotifications = useMemo(() => {
        if (!Array.isArray(notifications)) {
            return [];
        }
        return notifications.filter((notification) => notification && typeof notification === 'object');
    }, [notifications]);

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }

        setIsOpen(false);

        const targetPath = getNotificationNavigationPath(notification, user?.role || 'user');
        if (targetPath) {
            const targetUrl = buildHostedWorkspaceUrl(targetPath, user?.role || 'user');
            const resolved = new URL(targetUrl, window.location.origin);
            if (resolved.origin === window.location.origin) {
                navigate(`${resolved.pathname}${resolved.search}${resolved.hash}`);
            } else {
                window.location.href = resolved.toString();
            }
            return;
        }

        // Fallback: navigate to the notifications list page for notifications
        // without a specific destination so the user always lands somewhere.
        const fallbackPath = getNotificationsPagePath(user?.role || 'user');
        navigate(fallbackPath);
    };

    const getIcon = (notification: Notification) => {
        const iconClass = getNotificationIconColorClass(notification);

        if (isPropertyWorkflowNotification(notification)) {
            return <Home size={18} className={iconClass} />;
        }

        const { type } = notification;
        switch (type) {
            case NOTIFICATION_TYPES.VIEWING_CONFIRMED:
            case NOTIFICATION_TYPES.VIEWING_COMPLETED:
            case NOTIFICATION_TYPES.VIEWING_BOOKED:
            case NOTIFICATION_TYPES.VIEWING_CANCELLED:
            case NOTIFICATION_TYPES.VIEWING_RESCHEDULED:
            case NOTIFICATION_TYPES.APPOINTMENT_REMINDER:
                return <Calendar size={18} className={iconClass} />;
            case NOTIFICATION_TYPES.APPLICATION_UPDATE:
            case NOTIFICATION_TYPES.APPLICATION_SUBMITTED:
            case NOTIFICATION_TYPES.APPLICATION_APPROVED:
            case NOTIFICATION_TYPES.APPLICATION_REJECTED:
            case NOTIFICATION_TYPES.DOCUMENTS_REQUESTED:
            case NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REQUESTED:
            case NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_UPLOADED:
            case NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REVIEWED:
                return <FileText size={18} className={iconClass} />;
            case NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REUPLOAD_REQUESTED:
                return <Shield size={18} className={iconClass} />;
            case NOTIFICATION_TYPES.FAST_TRACK_STARTED:
            case NOTIFICATION_TYPES.FAST_TRACK_UPDATED:
            case NOTIFICATION_TYPES.FAST_TRACK_COMPLETED:
            case NOTIFICATION_TYPES.SALE_JOURNEY_UPDATED:
            case NOTIFICATION_TYPES.SALE_JOURNEY_COMPLETED:
                return <Zap size={18} className={iconClass} />;
            case NOTIFICATION_TYPES.USER_VERIFICATION_SUBMITTED:
            case NOTIFICATION_TYPES.MANAGER_VERIFICATION_SUBMITTED:
            case NOTIFICATION_TYPES.USER_VERIFICATION_REUPLOAD_REQUESTED:
            case NOTIFICATION_TYPES.MANAGER_VERIFICATION_REUPLOAD_REQUESTED:
            case NOTIFICATION_TYPES.DOCUMENT_VERIFIED:
            case NOTIFICATION_TYPES.PROFILE_VERIFIED:
                return <Shield size={18} className={iconClass} />;
            case NOTIFICATION_TYPES.MESSAGE_RECEIVED:
            case NOTIFICATION_TYPES.TICKET_RESPONSE:
            case NOTIFICATION_TYPES.SUPPORT_TICKET_CREATED:
            case NOTIFICATION_TYPES.SUPPORT_TICKET_STATUS_UPDATED:
            case NOTIFICATION_TYPES.SUPPORT_TICKET_ASSIGNED:
                return <MessageSquare size={18} className={iconClass} />;
            case NOTIFICATION_TYPES.PROPERTY_SAVED:
            case NOTIFICATION_TYPES.PRICE_DROP:
            case NOTIFICATION_TYPES.NEW_PROPERTY_MATCH:
            case NOTIFICATION_TYPES.PROPERTY_AVAILABLE:
            case NOTIFICATION_TYPES.PROPERTY_UNAVAILABLE:
                return <Home size={18} className={iconClass} />;
            case NOTIFICATION_TYPES.PAYMENT_RECEIVED:
            case NOTIFICATION_TYPES.PAYMENT_REMINDER:
            case NOTIFICATION_TYPES.PAYMENT_FAILED:
                return PAYMENTS_ENABLED
                    ? <CreditCard size={18} className={iconClass} />
                    : <FileText size={18} className={iconClass} />;
            default:
                return <Info size={18} className={iconClass} />;
        }
    };

    const formatTime = (isoString: string) => {
        const date = new Date(isoString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const hasUnreadNotifications = unreadCount > 0;
    const notificationButtonLabel = hasUnreadNotifications
        ? `Notifications, ${unreadCount} unread`
        : 'Notifications';

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
                    appearance === 'brand'
                        ? 'border-white/25 bg-white/10 text-white hover:bg-white/20 focus-visible:ring-white focus-visible:ring-offset-orange-600'
                        : hasUnreadNotifications
                            ? 'border-orange-200 bg-orange-50 text-orange-700 hover:bg-orange-100 focus-visible:ring-orange-500 focus-visible:ring-offset-white dark:border-orange-900/50 dark:bg-orange-950/20 dark:text-orange-100 dark:hover:bg-orange-950/35 dark:focus-visible:ring-offset-gray-900'
                            : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 focus-visible:ring-orange-500 focus-visible:ring-offset-white dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 dark:focus-visible:ring-offset-gray-900'
                }`}
                aria-label={notificationButtonLabel}
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                aria-controls={isOpen ? 'notification-dropdown-panel' : undefined}
                title={hasUnreadNotifications ? `${unreadCount} unread notifications` : 'Notifications'}
            >
                <Bell size={19} aria-hidden="true" />
                {hasUnreadNotifications && (
                    <span className={`absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-700 px-1.5 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ${
                        appearance === 'brand' ? 'ring-orange-600' : 'ring-white dark:ring-gray-900'
                    }`}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div
                    id="notification-dropdown-panel"
                    role="dialog"
                    aria-label="Notifications"
                    className={`fixed inset-x-3 z-50 flex origin-top-right flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-3 sm:w-[min(24rem,calc(100vw-2rem))] sm:max-h-none ${
                        appearance === 'brand'
                            ? 'top-[6.75rem] max-h-[calc(100dvh-7.5rem)]'
                            : 'top-[4.75rem] max-h-[calc(100dvh-5.5rem)]'
                    }`}
                >
                    <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between bg-white/95 p-4 backdrop-blur-sm dark:bg-gray-800/95">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => void markAllAsRead()}
                                className="inline-flex min-h-11 items-center text-xs font-medium text-orange-600 hover:text-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:text-orange-400 dark:hover:text-orange-300"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin sm:max-h-[70vh]">
                        {loading && safeNotifications.length === 0 ? (
                            <div className="flex justify-center p-8 text-gray-500 dark:text-gray-400">
                                <BrandLoadingScreen variant="panel" label="Loading notifications..." />
                            </div>
                        ) : safeNotifications.length > 0 ? (
                            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {safeNotifications.map((notification) => {
                                    const displayCopy = getLaunchSafeNotificationCopy(notification);

                                    return (
                                        <div
                                            key={notification.id}
                                            className={`group relative flex items-start gap-1 p-2 transition-colors hover:bg-gray-50 focus-within:bg-gray-50 dark:hover:bg-gray-700/50 dark:focus-within:bg-gray-700/50 ${!notification.is_read ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}`}
                                        >
                                            <button
                                                type="button"
                                                onClick={() => void handleNotificationClick(notification)}
                                                className={`flex min-w-0 flex-1 gap-3 rounded-xl p-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                                                    !notification.is_read ? 'sm:pr-[6.5rem]' : 'sm:pr-14'
                                                }`}
                                                aria-label={`${displayCopy.title}. ${displayCopy.message}. ${formatTime(notification.created_at)}`}
                                            >
                                                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${!notification.is_read ? 'bg-white shadow-sm ring-1 ring-black/5 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                                    {getIcon(notification)}
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="mb-0.5 flex items-start justify-between gap-2">
                                                        <span className={`truncate text-sm font-medium ${!notification.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                                            {displayCopy.title}
                                                        </span>
                                                        <span className="ml-auto whitespace-nowrap text-[10px] text-gray-500 dark:text-gray-400">
                                                            {formatTime(notification.created_at)}
                                                        </span>
                                                    </span>
                                                    <span className="line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                                                        {displayCopy.message}
                                                    </span>
                                                </span>
                                            </button>

                                            <div className="flex shrink-0 gap-1 pt-1 opacity-100 sm:absolute sm:right-2 sm:top-2 sm:pt-0 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                                                {!notification.is_read && (
                                                    <button
                                                        type="button"
                                                        onClick={() => void markAsRead(notification.id)}
                                                        className="inline-flex h-11 w-11 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white hover:text-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-orange-300"
                                                        title="Mark as read"
                                                        aria-label="Mark notification as read"
                                                    >
                                                        <Check size={15} />
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => deleteNotification(notification.id)}
                                                    className="inline-flex h-11 w-11 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-white hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-gray-300 dark:hover:bg-gray-600 dark:hover:text-red-300"
                                                    title="Remove"
                                                    aria-label="Remove notification"
                                                >
                                                    <X size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-8 text-center">
                                <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <Bell size={20} className="text-gray-400" />
                                </div>
                                <p className="text-gray-500 dark:text-gray-400 text-sm">No notifications yet</p>
                            </div>
                        )}
                    </div>

                    <div className="shrink-0 bg-gray-50/50 p-3 text-center dark:bg-gray-800/50">
                        <button
                            onClick={() => {
                                setIsOpen(false);
                                const targetUrl = buildHostedWorkspaceUrl(getNotificationsPagePath(user?.role || 'user'), user?.role || 'user');
                                const resolved = new URL(targetUrl, window.location.origin);
                                if (resolved.origin === window.location.origin) {
                                    navigate(`${resolved.pathname}${resolved.search}${resolved.hash}`);
                                } else {
                                    window.location.href = resolved.toString();
                                }
                            }}
                            className="text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                        >
                            View All Notifications
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;
