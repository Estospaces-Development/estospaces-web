"use client";

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Bell,
    Calendar,
    CheckCheck,
    Clock,
    CreditCard,
    FileText,
    Home,
    Inbox,
    Info,
    MessageSquare,
    Search,
    Shield,
    Trash2,
    X,
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationsContext';
import {
    NOTIFICATION_TYPES,
    getNotificationNavigationPath,
    isPropertyWorkflowNotification,
    type Notification,
} from '@/services/notificationsService';

type FilterType = 'all' | 'unread' | 'read';

const groupOrder = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older'];

const getNotificationIcon = (notification: Notification) => {
    if (isPropertyWorkflowNotification(notification)) {
        return <Home size={20} className="text-blue-500" />;
    }

    const { type } = notification;
    switch (type) {
        case NOTIFICATION_TYPES.USER_VERIFICATION_SUBMITTED:
        case NOTIFICATION_TYPES.MANAGER_VERIFICATION_SUBMITTED:
        case NOTIFICATION_TYPES.DOCUMENT_VERIFIED:
        case NOTIFICATION_TYPES.PROFILE_VERIFIED:
            return <Shield size={20} className="text-orange-500" />;
        case NOTIFICATION_TYPES.APPLICATION_UPDATE:
        case NOTIFICATION_TYPES.APPLICATION_SUBMITTED:
        case NOTIFICATION_TYPES.APPLICATION_APPROVED:
        case NOTIFICATION_TYPES.DOCUMENTS_REQUESTED:
            return <FileText size={20} className="text-purple-500" />;
        case NOTIFICATION_TYPES.MESSAGE_RECEIVED:
        case NOTIFICATION_TYPES.TICKET_RESPONSE:
            return <MessageSquare size={20} className="text-green-500" />;
        case NOTIFICATION_TYPES.VIEWING_CONFIRMED:
        case NOTIFICATION_TYPES.VIEWING_BOOKED:
        case NOTIFICATION_TYPES.APPOINTMENT_REMINDER:
            return <Calendar size={20} className="text-blue-500" />;
        case NOTIFICATION_TYPES.PAYMENT_RECEIVED:
        case NOTIFICATION_TYPES.PAYMENT_REMINDER:
            return <CreditCard size={20} className="text-emerald-500" />;
        case NOTIFICATION_TYPES.PROPERTY_SAVED:
        case NOTIFICATION_TYPES.PRICE_DROP:
        case NOTIFICATION_TYPES.NEW_PROPERTY_MATCH:
            return <Home size={20} className="text-orange-500" />;
        default:
            return <Info size={20} className="text-gray-500" />;
    }
};

const getNotificationColor = (notification: Notification) => {
    if (isPropertyWorkflowNotification(notification)) {
        return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900/40';
    }

    const { type } = notification;
    switch (type) {
        case NOTIFICATION_TYPES.USER_VERIFICATION_SUBMITTED:
        case NOTIFICATION_TYPES.MANAGER_VERIFICATION_SUBMITTED:
            return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-900/40';
        case NOTIFICATION_TYPES.DOCUMENT_VERIFIED:
        case NOTIFICATION_TYPES.PROFILE_VERIFIED:
            return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-900/40';
        case NOTIFICATION_TYPES.APPLICATION_UPDATE:
        case NOTIFICATION_TYPES.APPLICATION_SUBMITTED:
        case NOTIFICATION_TYPES.APPLICATION_APPROVED:
            return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-900/40';
        default:
            return 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700';
    }
};

const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;

    return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
};

export default function AdminNotificationsPage() {
    const navigate = useNavigate();
    const {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
    } = useNotifications();

    const [filter, setFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

    const filteredNotifications = useMemo(() => (
        notifications.filter((notification) => {
            if (filter === 'unread' && notification.is_read) return false;
            if (filter === 'read' && !notification.is_read) return false;

            if (!searchQuery) return true;

            const query = searchQuery.toLowerCase();
            return (
                notification.title.toLowerCase().includes(query)
                || notification.message.toLowerCase().includes(query)
            );
        })
    ), [filter, notifications, searchQuery]);

    const groupedNotifications = useMemo(() => {
        const groups: Record<string, Notification[]> = {};

        filteredNotifications.forEach((notification) => {
            const date = new Date(notification.created_at);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            let groupKey = 'Older';
            if (date.toDateString() === today.toDateString()) {
                groupKey = 'Today';
            } else if (date.toDateString() === yesterday.toDateString()) {
                groupKey = 'Yesterday';
            } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
                groupKey = 'This Week';
            } else if (date > new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)) {
                groupKey = 'This Month';
            }

            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(notification);
        });

        return groups;
    }, [filteredNotifications]);

    const handleNotificationClick = async (notification: Notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }

        const targetPath = getNotificationNavigationPath(notification, 'admin');
        if (targetPath && targetPath !== '/admin/notifications') {
            navigate(targetPath);
        }
    };

    const handleSelectNotification = (id: string) => {
        setSelectedNotifications((prev) => (
            prev.includes(id)
                ? prev.filter((notificationId) => notificationId !== id)
                : [...prev, id]
        ));
    };

    const handleSelectAll = () => {
        if (selectedNotifications.length === filteredNotifications.length) {
            setSelectedNotifications([]);
            return;
        }

        setSelectedNotifications(filteredNotifications.map((notification) => notification.id));
    };

    const handleDeleteSelected = () => {
        selectedNotifications.forEach((id) => deleteNotification(id));
        setSelectedNotifications([]);
    };

    const handleMarkSelectedAsRead = () => {
        selectedNotifications.forEach((id) => markAsRead(id));
        setSelectedNotifications([]);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
            <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <div className="max-w-5xl mx-auto px-4 lg:px-6 py-8">
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className="mb-6 flex items-center gap-2 text-gray-500 hover:text-orange-500 transition-colors"
                    >
                        <ArrowLeft size={18} />
                        <span>Back to Dashboard</span>
                    </button>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <Bell className="text-orange-500" />
                                Notifications
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                                Review all admin notifications, including verification submissions and platform alerts.
                            </p>
                        </div>

                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-200 dark:hover:bg-orange-900/40 transition-colors"
                            >
                                <CheckCheck size={18} />
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                        <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-xl">
                            <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">Unread</span>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{unreadCount}</p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl">
                            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total</span>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{notifications.length}</p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/10 p-4 rounded-xl">
                            <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Read</span>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{notifications.length - unreadCount}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 lg:px-6 mt-8">
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search notifications..."
                            className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all text-gray-900 dark:text-white"
                            value={searchQuery}
                            onChange={(event) => setSearchQuery(event.target.value)}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2">
                        {(['all', 'unread', 'read'] as FilterType[]).map((value) => (
                            <button
                                key={value}
                                onClick={() => setFilter(value)}
                                className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-colors capitalize ${
                                    filter === value
                                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400'
                                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                            >
                                {value}
                            </button>
                        ))}
                    </div>
                </div>

                {selectedNotifications.length > 0 && (
                    <div className="flex items-center justify-between bg-orange-500 text-white p-4 rounded-xl mb-6 shadow-lg">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={selectedNotifications.length === filteredNotifications.length}
                                onChange={handleSelectAll}
                                className="w-4 h-4 rounded border-white/30 text-orange-600 outline-none"
                            />
                            <span className="font-semibold">{selectedNotifications.length} notifications selected</span>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleMarkSelectedAsRead}
                                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
                            >
                                Mark as Read
                            </button>
                            <button
                                onClick={handleDeleteSelected}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <Trash2 size={16} />
                                Delete
                            </button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="space-y-4">
                        {[...Array(5)].map((_, index) => (
                            <div key={index} className="h-24 bg-white dark:bg-gray-800 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : filteredNotifications.length > 0 ? (
                    <div className="space-y-8">
                        {groupOrder.map((group) => {
                            const items = groupedNotifications[group];
                            if (!items || items.length === 0) return null;

                            return (
                                <div key={group} className="space-y-3">
                                    <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-2">{group}</h3>
                                    <div className="space-y-3">
                                        {items.map((notification) => (
                                            <div
                                                key={notification.id}
                                                className={`group relative flex items-center gap-4 p-4 border rounded-2xl transition-all hover:shadow-xl hover:-translate-y-0.5 ${
                                                    notification.is_read
                                                        ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                                        : getNotificationColor(notification)
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedNotifications.includes(notification.id)}
                                                    onChange={() => handleSelectNotification(notification.id)}
                                                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-orange-500 outline-none"
                                                />

                                                <button
                                                    type="button"
                                                    className="flex-shrink-0 rounded-xl p-3 transition-colors hover:bg-white/70 dark:hover:bg-gray-900/60"
                                                    onClick={() => handleNotificationClick(notification)}
                                                >
                                                    {getNotificationIcon(notification)}
                                                </button>

                                                <button
                                                    type="button"
                                                    className="flex-1 min-w-0 text-left"
                                                    onClick={() => handleNotificationClick(notification)}
                                                >
                                                    <div className="flex items-center justify-between gap-4">
                                                        <h4 className={`font-bold truncate ${notification.is_read ? 'text-gray-700 dark:text-gray-200' : 'text-gray-900 dark:text-white'}`}>
                                                            {notification.title}
                                                        </h4>
                                                        <span className="text-xs text-gray-400 whitespace-nowrap">{formatTime(notification.created_at)}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notification.message}</p>
                                                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                                                        <Clock size={14} />
                                                        <span>{formatTime(notification.created_at)}</span>
                                                    </div>
                                                </button>

                                                {!notification.is_read && (
                                                    <div className="absolute top-4 right-4 w-2 h-2 bg-orange-500 rounded-full shadow-sm shadow-orange-500/50" />
                                                )}

                                                <button
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        deleteNotification(notification.id);
                                                    }}
                                                    className="p-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                        <Inbox size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No notifications yet</h3>
                        <p className="text-gray-500 dark:text-gray-400">Admin notifications will appear here when new events arrive.</p>
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl">
                        <div className="inline-flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-700 rounded-full mb-6">
                            <Bell className="text-gray-300" size={48} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">No notifications found</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">Your current filters returned no admin notifications.</p>
                        <button
                            onClick={() => {
                                setFilter('all');
                                setSearchQuery('');
                            }}
                            className="mt-8 px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold rounded-xl active:scale-95 transition-transform"
                        >
                            Reset Filters
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
