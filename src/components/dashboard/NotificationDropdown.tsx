"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, Check, X, Calendar, FileText, Home, MessageSquare, CreditCard, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markRead, markAllRead, NOTIFICATION_TYPES, type Notification } from '@/services/notificationsService';
import { useAuth } from '@/contexts/AuthContext';

interface DisplayNotification {
    id: string;
    type: string;
    title: string;
    message: string;
    read: boolean;
    timestamp: string;
    data: Record<string, any>;
}

const mapNotification = (n: Notification): DisplayNotification => ({
    id: n.id,
    type: n.type,
    title: n.title,
    message: n.message,
    read: n.is_read,
    timestamp: n.created_at,
    data: n.data ? (typeof n.data === 'string' ? JSON.parse(n.data) : n.data) : {},
});

const NotificationDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<DisplayNotification[]>([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const { user } = useAuth();

    // Fetch notifications from backend
    const fetchNotifications = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const result = await getNotifications();
            setNotifications((result.notifications || []).map(mapNotification));
        } catch (error) {
            console.error('[NotificationDropdown] Error fetching:', error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Fetch on mount & when dropdown opens
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    useEffect(() => {
        if (isOpen) fetchNotifications();
    }, [isOpen, fetchNotifications]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

    const handleMarkAsRead = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
        try {
            await markRead(id);
        } catch {
            // Optimistic update already applied
        }
    };

    const handleMarkAllAsRead = async () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        try {
            await markAllRead();
        } catch {
            // Optimistic update already applied
        }
    };

    const removeNotification = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const handleNotificationClick = async (notification: DisplayNotification) => {
        // Mark as read
        if (!notification.read) {
            setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, read: true } : n));
            try { await markRead(notification.id); } catch { /* optimistic */ }
        }

        setIsOpen(false);

        // Navigate based on type
        switch (notification.type) {
            case NOTIFICATION_TYPES.VIEWING_CONFIRMED:
            case NOTIFICATION_TYPES.VIEWING_BOOKED:
            case NOTIFICATION_TYPES.APPOINTMENT_REMINDER:
                navigate('/user/dashboard/viewings');
                break;
            case NOTIFICATION_TYPES.APPLICATION_UPDATE:
            case NOTIFICATION_TYPES.APPLICATION_SUBMITTED:
            case NOTIFICATION_TYPES.APPLICATION_APPROVED:
                navigate('/user/dashboard/applications');
                break;
            case NOTIFICATION_TYPES.MESSAGE_RECEIVED:
                navigate('/user/dashboard/messages');
                break;
            case NOTIFICATION_TYPES.PROPERTY_SAVED:
            case NOTIFICATION_TYPES.PRICE_DROP:
            case NOTIFICATION_TYPES.NEW_PROPERTY_MATCH:
                if (notification.data?.propertyId) {
                    navigate(`/user/dashboard/property/${notification.data.propertyId}`);
                } else {
                    navigate('/user/dashboard/saved');
                }
                break;
            case NOTIFICATION_TYPES.PAYMENT_RECEIVED:
            case NOTIFICATION_TYPES.PAYMENT_REMINDER:
                navigate('/user/dashboard/payments');
                break;
            case NOTIFICATION_TYPES.CONTRACT_UPDATE:
                navigate('/user/dashboard/contracts');
                break;
            default:
                // Stay on dashboard
                break;
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case NOTIFICATION_TYPES.VIEWING_CONFIRMED:
            case NOTIFICATION_TYPES.VIEWING_BOOKED:
            case NOTIFICATION_TYPES.APPOINTMENT_REMINDER:
                return <Calendar size={18} className="text-blue-500" />;
            case NOTIFICATION_TYPES.APPLICATION_UPDATE:
            case NOTIFICATION_TYPES.APPLICATION_SUBMITTED:
            case NOTIFICATION_TYPES.APPLICATION_APPROVED:
            case NOTIFICATION_TYPES.DOCUMENTS_REQUESTED:
                return <FileText size={18} className="text-purple-500" />;
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
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-lg transition-colors hover:bg-white/10"
                aria-label="Notifications"
            >
                <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <Bell size={18} className="text-gray-600 dark:text-gray-200" />
                </div>
                {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-transparent shadow-sm indicator-pulse" />
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-xl z-50 overflow-hidden animate-fadeIn origin-top-right">
                    <div className="p-4 flex items-center justify-between sticky top-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm z-10">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-xs font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[70vh] overflow-y-auto scrollbar-thin">
                        {loading && notifications.length === 0 ? (
                            <div className="p-8 text-center">
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>
                            </div>
                        ) : notifications.length > 0 ? (
                            <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                                {notifications.map(notification => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer relative group ${!notification.read ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${!notification.read ? 'bg-white shadow-sm ring-1 ring-black/5 dark:bg-gray-700' : 'bg-gray-100 dark:bg-gray-700'}`}>
                                                {getIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-start mb-0.5">
                                                    <p className={`text-sm font-medium truncate pr-6 ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                                                        {notification.title}
                                                    </p>
                                                    <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                                                        {formatTime(notification.timestamp)}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                                                    {notification.message}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Hover Actions */}
                                        <div className="absolute right-2 top-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {!notification.read && (
                                                <button
                                                    onClick={(e) => handleMarkAsRead(notification.id, e)}
                                                    className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-white dark:hover:bg-gray-600 rounded-full shadow-sm transition-all"
                                                    title="Mark as read"
                                                >
                                                    <Check size={14} />
                                                </button>
                                            )}
                                            <button
                                                onClick={(e) => removeNotification(notification.id, e)}
                                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-white dark:hover:bg-gray-600 rounded-full shadow-sm transition-all"
                                                title="Remove"
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
                            onClick={() => { setIsOpen(false); navigate('/user/dashboard/notifications'); }}
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
