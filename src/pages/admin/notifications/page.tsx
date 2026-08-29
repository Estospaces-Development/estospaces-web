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
import {
    getNotificationIconColorClass,
    getNotificationSurfaceClass,
} from '@/lib/notificationVisuals';
import { PAYMENTS_ENABLED } from '@/lib/launchFlags';
import { getLaunchSafeNotificationCopy } from '@/lib/notificationLaunchCopy';

export type AdminNotificationFilterType = 'all' | 'unread' | 'read';

const groupOrder = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older'];
const NOTIFICATION_PAGE_SIZE = 25;

export const normalizeAdminNotificationSearch = (value: string): string => value.trim().toLowerCase();

export const filterAdminNotifications = (
    notifications: Notification[],
    filter: AdminNotificationFilterType,
    searchQuery: string,
): Notification[] => {
    const query = normalizeAdminNotificationSearch(searchQuery);

    return notifications.filter((notification) => {
        // Exclude QA/test notifications from admin view regardless of type
        const metadataStr = typeof notification.data === 'string'
            ? notification.data
            : JSON.stringify(notification.data ?? {});
        if (metadataStr.includes('"is_test":true') || metadataStr.includes('"qa_test"')) {
            return false;
        }
        if (notification.type === NOTIFICATION_TYPES.SYSTEM) {
            const entity = typeof notification.data?.entity === 'string'
                ? notification.data.entity.trim()
                : '';
            // Keep legitimate system notifications but exclude QA/test ones
            if (notification.title?.toLowerCase().includes('qa') ||
                notification.message?.toLowerCase().includes('test message') ||
                notification.message?.toLowerCase().includes('test notification') ||
                entity === 'qa_test') {
                return false;
            }
        }

        if (filter === 'unread' && notification.is_read) return false;
        if (filter === 'read' && !notification.is_read) return false;

        if (!query) return true;

        const displayCopy = getLaunchSafeNotificationCopy(notification);
        return (
            displayCopy.title.toLowerCase().includes(query)
            || displayCopy.message.toLowerCase().includes(query)
        );
    });
};

const getNotificationIcon = (notification: Notification) => {
    const iconClass = getNotificationIconColorClass(notification);

    if (isPropertyWorkflowNotification(notification)) {
        return <Home size={20} className={iconClass} />;
    }

    const { type } = notification;
    switch (type) {
        case NOTIFICATION_TYPES.USER_VERIFICATION_SUBMITTED:
        case NOTIFICATION_TYPES.MANAGER_VERIFICATION_SUBMITTED:
        case NOTIFICATION_TYPES.DOCUMENT_VERIFIED:
        case NOTIFICATION_TYPES.PROFILE_VERIFIED:
        case NOTIFICATION_TYPES.USER_VERIFICATION_REUPLOAD_REQUESTED:
        case NOTIFICATION_TYPES.MANAGER_VERIFICATION_REUPLOAD_REQUESTED:
            return <Shield size={20} className={iconClass} />;
        case NOTIFICATION_TYPES.APPLICATION_UPDATE:
        case NOTIFICATION_TYPES.APPLICATION_SUBMITTED:
        case NOTIFICATION_TYPES.APPLICATION_APPROVED:
        case NOTIFICATION_TYPES.APPLICATION_REJECTED:
        case NOTIFICATION_TYPES.DOCUMENTS_REQUESTED:
        case NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REQUESTED:
        case NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_UPLOADED:
        case NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REVIEWED:
        case NOTIFICATION_TYPES.CASE_FILE_DOCUMENT_REUPLOAD_REQUESTED:
            return <FileText size={20} className={iconClass} />;
        case NOTIFICATION_TYPES.MESSAGE_RECEIVED:
        case NOTIFICATION_TYPES.TICKET_RESPONSE:
        case NOTIFICATION_TYPES.SUPPORT_TICKET_CREATED:
        case NOTIFICATION_TYPES.SUPPORT_TICKET_STATUS_UPDATED:
        case NOTIFICATION_TYPES.SUPPORT_TICKET_ASSIGNED:
            return <MessageSquare size={20} className={iconClass} />;
        case NOTIFICATION_TYPES.VIEWING_CONFIRMED:
        case NOTIFICATION_TYPES.VIEWING_BOOKED:
        case NOTIFICATION_TYPES.VIEWING_COMPLETED:
        case NOTIFICATION_TYPES.VIEWING_CANCELLED:
        case NOTIFICATION_TYPES.VIEWING_RESCHEDULED:
        case NOTIFICATION_TYPES.APPOINTMENT_REMINDER:
            return <Calendar size={20} className={iconClass} />;
        case NOTIFICATION_TYPES.PAYMENT_RECEIVED:
        case NOTIFICATION_TYPES.PAYMENT_REMINDER:
        case NOTIFICATION_TYPES.PAYMENT_FAILED:
            return PAYMENTS_ENABLED
                ? <CreditCard size={20} className={iconClass} />
                : <FileText size={20} className={iconClass} />;
        case NOTIFICATION_TYPES.PROPERTY_SAVED:
        case NOTIFICATION_TYPES.PRICE_DROP:
        case NOTIFICATION_TYPES.NEW_PROPERTY_MATCH:
        case NOTIFICATION_TYPES.PROPERTY_AVAILABLE:
        case NOTIFICATION_TYPES.PROPERTY_UNAVAILABLE:
            return <Home size={20} className={iconClass} />;
        default:
            return <Info size={20} className={iconClass} />;
    }
};

const getNotificationColor = (notification: Notification) => {
    return getNotificationSurfaceClass(notification, true);
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
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
    } = useNotifications();

    const [filter, setFilter] = useState<AdminNotificationFilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
    const [visibleLimit, setVisibleLimit] = useState(NOTIFICATION_PAGE_SIZE);

    const filteredNotifications = useMemo(
        () => filterAdminNotifications(notifications, filter, searchQuery),
        [filter, notifications, searchQuery],
    );
    const visibleNotifications = useMemo(
        () => filteredNotifications.slice(0, visibleLimit),
        [filteredNotifications, visibleLimit],
    );
    const visibleUnreadCount = useMemo(
        () => notifications.filter((notification) => !notification.is_read).length,
        [notifications],
    );
    const visibleTotalCount = notifications.length;
    const visibleReadCount = Math.max(0, visibleTotalCount - visibleUnreadCount);

    const groupedNotifications = useMemo(() => {
        const groups: Record<string, Notification[]> = {};

        visibleNotifications.forEach((notification) => {
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
    }, [visibleNotifications]);

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

                        {visibleUnreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                className="flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-200 dark:hover:bg-orange-900/40 transition-colors"
                            >
                                <CheckCheck size={18} />
                                Mark all as read
                            </button>
                        )}
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2 sm:mt-8 sm:gap-6">
                        <div className="rounded-xl bg-orange-50 p-3 dark:bg-orange-900/10 sm:p-4">
                            <span className="text-sm text-orange-600 dark:text-orange-400 font-medium">Unread</span>
                            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">{visibleUnreadCount}</p>
                        </div>
                        <div className="rounded-xl bg-blue-50 p-3 dark:bg-blue-900/10 sm:p-4">
                            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total</span>
                            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">{visibleTotalCount}</p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-900/10 sm:p-4">
                            <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Read</span>
                            <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white sm:text-2xl">{visibleReadCount}</p>
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
                            aria-label="Search admin notifications"
                            placeholder="Search notifications..."
                            className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all text-gray-900 dark:text-white"
                            value={searchQuery}
                            onChange={(event) => {
                                setSearchQuery(event.target.value);
                                setVisibleLimit(NOTIFICATION_PAGE_SIZE);
                            }}
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                aria-label="Clear notification search"
                                onClick={() => {
                                    setSearchQuery('');
                                    setVisibleLimit(NOTIFICATION_PAGE_SIZE);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <div className="flex gap-2">
                        {(['all', 'unread', 'read'] as AdminNotificationFilterType[]).map((value) => (
                            <button
                                key={value}
                                onClick={() => {
                                    setFilter(value);
                                    setVisibleLimit(NOTIFICATION_PAGE_SIZE);
                                }}
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
                    <div className="mb-6 flex flex-col gap-3 rounded-xl bg-orange-500 p-4 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                aria-label="Select all filtered admin notifications"
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
                                    <h2 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-2">{group}</h2>
                                    <div className="space-y-3">
                                        {items.map((notification) => {
                                            const displayCopy = getLaunchSafeNotificationCopy(notification);
                                            return (
                                                <div
                                                    key={notification.id}
                                                    className={`group relative flex items-start gap-3 rounded-2xl border p-4 transition-all hover:-translate-y-0.5 hover:shadow-xl sm:items-center sm:gap-4 ${
                                                        notification.is_read
                                                            ? 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                                                            : getNotificationColor(notification)
                                                    }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        aria-label={`Select notification: ${displayCopy.title}`}
                                                        checked={selectedNotifications.includes(notification.id)}
                                                        onChange={() => handleSelectNotification(notification.id)}
                                                        className="mt-3 h-4 w-4 shrink-0 rounded border-gray-300 text-orange-500 outline-none dark:border-gray-600 sm:mt-0"
                                                    />

                                                    <button
                                                        type="button"
                                                        aria-label={`Open notification: ${displayCopy.title}`}
                                                        className="shrink-0 rounded-xl p-2.5 transition-colors hover:bg-white/70 dark:hover:bg-gray-900/60 sm:p-3"
                                                        onClick={() => handleNotificationClick(notification)}
                                                    >
                                                        {getNotificationIcon(notification)}
                                                    </button>

                                                    <button
                                                        type="button"
                                                        aria-label={`Open notification: ${displayCopy.title}`}
                                                        className="min-w-0 flex-1 pb-8 text-left sm:pb-0"
                                                        onClick={() => handleNotificationClick(notification)}
                                                    >
                                                        <div className="flex items-start justify-between gap-4">
                                                            <h3 className={`min-w-0 break-words font-bold [overflow-wrap:anywhere] ${notification.is_read ? 'text-gray-700 dark:text-gray-200' : 'text-gray-900 dark:text-white'}`}>
                                                                {displayCopy.title}
                                                            </h3>
                                                            <span className="hidden whitespace-nowrap text-xs text-gray-400 sm:inline">{formatTime(notification.created_at)}</span>
                                                        </div>
                                                        <p className="mt-0.5 line-clamp-2 break-words text-sm text-gray-500 [overflow-wrap:anywhere] dark:text-gray-400">{displayCopy.message}</p>
                                                        <div className="mt-2 flex items-center gap-2 pr-11 text-xs text-gray-400 sm:pr-0">
                                                            <Clock size={14} />
                                                            <span>{formatTime(notification.created_at)}</span>
                                                        </div>
                                                    </button>

                                                    {!notification.is_read && (
                                                        <div aria-hidden="true" className="absolute top-4 right-4 w-2 h-2 bg-orange-500 rounded-full shadow-sm shadow-orange-500/50" />
                                                    )}

                                                    <button
                                                        type="button"
                                                        aria-label={`Delete notification: ${displayCopy.title}`}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            deleteNotification(notification.id);
                                                        }}
                                                        className="absolute bottom-2 right-2 inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-xl p-2 text-xs font-semibold text-gray-400 transition-all hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 sm:static sm:min-h-0 sm:min-w-0"
                                                    >
                                                        <Trash2 size={18} />
                                                        <span className="hidden sm:inline">Delete</span>
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                        {visibleNotifications.length < filteredNotifications.length && (
                            <div className="flex justify-center">
                                <button
                                    type="button"
                                    onClick={() => setVisibleLimit((current) => current + NOTIFICATION_PAGE_SIZE)}
                                    className="px-5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                                >
                                    Load more notifications ({visibleNotifications.length} of {filteredNotifications.length})
                                </button>
                            </div>
                        )}
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
                                setVisibleLimit(NOTIFICATION_PAGE_SIZE);
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
