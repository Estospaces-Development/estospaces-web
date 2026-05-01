"use client";

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { Bell, Check, X, Calendar, FileText, Home, MessageSquare, CreditCard, Info, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import {
    getNotificationNavigationPath,
    getNotificationsPagePath,
    isPropertyWorkflowNotification,
    NOTIFICATION_TYPES,
    type Notification,
} from '@/services/notificationsService';
import { buildHostedWorkspaceUrl } from '@/lib/utils/hostUtils';

const NotificationDropdown = () => {
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
        }
    };

    const getIcon = (notification: Notification) => {
        if (isPropertyWorkflowNotification(notification)) {
            return <Home size={18} className="text-orange-500" />;
        }

        const { type } = notification;
        switch (type) {
            case NOTIFICATION_TYPES.VIEWING_CONFIRMED:
            case NOTIFICATION_TYPES.VIEWING_COMPLETED:
            case NOTIFICATION_TYPES.VIEWING_BOOKED:
            case NOTIFICATION_TYPES.VIEWING_CANCELLED:
            case NOTIFICATION_TYPES.VIEWING_RESCHEDULED:
            case NOTIFICATION_TYPES.APPOINTMENT_REMINDER:
                return <Calendar size={18} className="text-blue-500" />;
            case NOTIFICATION_TYPES.APPLICATION_UPDATE:
            case NOTIFICATION_TYPES.APPLICATION_SUBMITTED:
            case NOTIFICATION_TYPES.APPLICATION_APPROVED:
            case NOTIFICATION_TYPES.DOCUMENTS_REQUESTED:
            case NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REQUESTED:
            case NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_UPLOADED:
            case NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REVIEWED:
                return <FileText size={18} className="text-purple-500" />;
            case NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REUPLOAD_REQUESTED:
                return <Shield size={18} className="text-red-500" />;
            case NOTIFICATION_TYPES.FAST_TRACK_STARTED:
            case NOTIFICATION_TYPES.FAST_TRACK_UPDATED:
            case NOTIFICATION_TYPES.FAST_TRACK_COMPLETED:
                return <Zap size={18} className="text-orange-500" />;
            case NOTIFICATION_TYPES.USER_VERIFICATION_SUBMITTED:
            case NOTIFICATION_TYPES.MANAGER_VERIFICATION_SUBMITTED:
            case NOTIFICATION_TYPES.USER_VERIFICATION_REUPLOAD_REQUESTED:
            case NOTIFICATION_TYPES.MANAGER_VERIFICATION_REUPLOAD_REQUESTED:
            case NOTIFICATION_TYPES.DOCUMENT_VERIFIED:
            case NOTIFICATION_TYPES.PROFILE_VERIFIED:
                return <Shield size={18} className="text-orange-500" />;
            case NOTIFICATION_TYPES.MESSAGE_RECEIVED:
                return <MessageSquare size={18} className="text-green-500" />;
            case NOTIFICATION_TYPES.PROPERTY_SAVED:
            case NOTIFICATION_TYPES.PRICE_DROP:
            case NOTIFICATION_TYPES.NEW_PROPERTY_MATCH:
            case NOTIFICATION_TYPES.PROPERTY_AVAILABLE:
                return <Home size={18} className="text-orange-500" />;
            case NOTIFICATION_TYPES.PAYMENT_RECEIVED:
            case NOTIFICATION_TYPES.PAYMENT_REMINDER:
                return <CreditCard size={18} className="text-emerald-500" />;
            default:
                return <Info size={18} className="text-gray-500" />;
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

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                ref={buttonRef}
                onClick={() => setIsOpen(!isOpen)}
                className={`relative rounded-2xl border p-2 transition-all ${
                    unreadCount > 0
                        ? 'border-orange-200 bg-orange-50 shadow-sm shadow-orange-500/10 dark:border-orange-900/50 dark:bg-orange-950/20'
                        : 'border-transparent hover:bg-white/10'
                }`}
                aria-label="Notifications"
                aria-expanded={isOpen}
                aria-haspopup="dialog"
                aria-controls={isOpen ? 'notification-dropdown-panel' : undefined}
                title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
            >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    unreadCount > 0
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                        : 'bg-gray-100 dark:bg-gray-700'
                }`}>
                    <Bell size={18} className={unreadCount > 0 ? 'text-white' : 'text-gray-600 dark:text-gray-200'} />
                </div>
                {unreadCount > 0 && (
                    <>
                        <span className="absolute -right-0.5 -top-0.5 h-5 w-5 rounded-full bg-red-500/30 animate-ping" />
                        <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-700 px-1.5 text-[10px] font-bold text-white shadow-lg ring-4 ring-white dark:ring-gray-900">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    </>
                )}
            </button>

            {isOpen && (
                <div
                    id="notification-dropdown-panel"
                    role="dialog"
                    aria-label="Notifications"
                    className="absolute right-0 z-50 mt-3 w-[calc(100vw-2rem)] max-w-80 origin-top-right animate-fadeIn overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-gray-800 md:max-w-96"
                >
                    <div className="p-4 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm z-10">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={() => void markAllAsRead()}
                                className="text-xs font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[70vh] overflow-y-auto scrollbar-thin">
                        {loading && safeNotifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>
                            </div>
                        ) : safeNotifications.length > 0 ? (
                            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {safeNotifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => void handleNotificationClick(notification)}
                                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer relative group ${!notification.is_read ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${!notification.is_read ? 'bg-white shadow-sm ring-1 ring-black/5 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                                {getIcon(notification)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <p className={`text-sm font-medium truncate pr-6 ${!notification.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                                        {notification.title}
                                                    </p>
                                                    <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                                        {formatTime(notification.created_at)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                                    {notification.message}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!notification.is_read && (
                                                <button
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        void markAsRead(notification.id);
                                                    }}
                                                    className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-white dark:hover:bg-gray-600 rounded-full shadow-sm transition-all"
                                                    title="Mark as read"
                                                    aria-label="Mark notification as read"
                                                >
                                                    <Check size={14} />
                                                </button>
                                            )}
                                            <button
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    deleteNotification(notification.id);
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-gray-600 rounded-full shadow-sm transition-all"
                                                title="Remove"
                                                aria-label="Remove notification"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
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

                    <div className="p-3 bg-gray-50/50 dark:bg-gray-800/50 text-center">
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
