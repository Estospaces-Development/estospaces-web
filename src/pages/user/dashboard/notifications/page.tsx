"use client";

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    CheckCircle,
    AlertCircle,
    FileText,
    Shield,
    MessageCircle,
    Calendar,
    Home,
    DollarSign,
    Trash2,
    CheckCheck,
    Clock,
    Search,
    X,
    Inbox,
    ArrowLeft,
    Settings
} from 'lucide-react';
import { useNotifications, NOTIFICATION_TYPES } from '@/contexts/NotificationsContext';

type FilterType = 'all' | 'unread' | 'read';
type CategoryType = 'all' | 'appointments' | 'applications' | 'messages' | 'system';

export default function NotificationsPage() {
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
    const [category, setCategory] = useState<CategoryType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

    // Filter notifications
    const filteredNotifications = useMemo(() => {
        return notifications.filter((notification: any) => {
            // Read/unread filter
            if (filter === 'unread' && notification.read) return false;
            if (filter === 'read' && !notification.read) return false;

            // Category filter
            if (category !== 'all') {
                const typeCategories: Record<CategoryType, string[]> = {
                    appointments: [
                        NOTIFICATION_TYPES.APPOINTMENT_APPROVED,
                        NOTIFICATION_TYPES.APPOINTMENT_REJECTED,
                    ],
                    applications: [NOTIFICATION_TYPES.APPLICATION_UPDATE],
                    messages: [NOTIFICATION_TYPES.TICKET_RESPONSE],
                    system: [
                        NOTIFICATION_TYPES.DOCUMENT_VERIFIED,
                        NOTIFICATION_TYPES.PROFILE_VERIFIED,
                        NOTIFICATION_TYPES.SYSTEM,
                    ],
                    all: [],
                };
                if (!typeCategories[category].includes(notification.type)) return false;
            }

            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return (
                    notification.title.toLowerCase().includes(query) ||
                    notification.message.toLowerCase().includes(query)
                );
            }

            return true;
        });
    }, [notifications, filter, category, searchQuery]);

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case NOTIFICATION_TYPES.APPOINTMENT_APPROVED:
                return <CheckCircle size={20} className="text-green-500" />;
            case NOTIFICATION_TYPES.APPOINTMENT_REJECTED:
                return <AlertCircle size={20} className="text-red-500" />;
            case NOTIFICATION_TYPES.APPLICATION_UPDATE:
                return <FileText size={20} className="text-blue-500" />;
            case NOTIFICATION_TYPES.DOCUMENT_VERIFIED:
            case NOTIFICATION_TYPES.PROFILE_VERIFIED:
                return <Shield size={20} className="text-green-500" />;
            case NOTIFICATION_TYPES.TICKET_RESPONSE:
                return <MessageCircle size={20} className="text-purple-500" />;
            case 'property_saved':
                return <Home size={20} className="text-orange-500" />;
            case 'price_drop':
                return <DollarSign size={20} className="text-green-500" />;
            case 'viewing_booked':
                return <Calendar size={20} className="text-blue-500" />;
            default:
                return <Bell size={20} className="text-gray-500" />;
        }
    };

    const getNotificationColor = (type: string) => {
        switch (type) {
            case NOTIFICATION_TYPES.APPOINTMENT_APPROVED:
            case NOTIFICATION_TYPES.DOCUMENT_VERIFIED:
            case NOTIFICATION_TYPES.PROFILE_VERIFIED:
            case 'price_drop':
                return 'bg-green-50 dark:bg-green-900/20';
            case NOTIFICATION_TYPES.APPOINTMENT_REJECTED:
                return 'bg-red-50 dark:bg-red-900/20';
            case NOTIFICATION_TYPES.APPLICATION_UPDATE:
            case 'viewing_booked':
                return 'bg-blue-50 dark:bg-blue-900/20';
            case NOTIFICATION_TYPES.TICKET_RESPONSE:
                return 'bg-purple-50 dark:bg-purple-900/20';
            case 'property_saved':
                return 'bg-orange-50 dark:bg-orange-900/20';
            default:
                return 'bg-gray-50 dark:bg-gray-700/50';
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

    const handleNotificationClick = (notification: any) => {
        if (!notification.read) {
            markAsRead(notification.id);
        }

        if (notification.data?.propertyId) {
            navigate(`/user/dashboard/property/${notification.data.propertyId}`);
        } else if (notification.data?.applicationId) {
            navigate('/user/dashboard/applications');
        } else if (notification.data?.viewingId) {
            navigate('/user/dashboard/viewings');
        }
    };

    const handleSelectNotification = (id: string) => {
        setSelectedNotifications((prev) =>
            prev.includes(id) ? prev.filter((nId) => nId !== id) : [...prev, id]
        );
    };

    const handleSelectAll = () => {
        if (selectedNotifications.length === filteredNotifications.length) {
            setSelectedNotifications([]);
        } else {
            setSelectedNotifications(filteredNotifications.map((n: any) => n.id));
        }
    };

    const handleDeleteSelected = () => {
        selectedNotifications.forEach((id) => deleteNotification(id));
        setSelectedNotifications([]);
    };

    const handleMarkSelectedAsRead = () => {
        selectedNotifications.forEach((id) => markAsRead(id));
        setSelectedNotifications([]);
    };

    // Group notifications by date
    const groupedNotifications = useMemo(() => {
        const groups: Record<string, any[]> = {};

        filteredNotifications.forEach((notification: any) => {
            const date = new Date(notification.created_at);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            let groupKey: string;
            if (date.toDateString() === today.toDateString()) {
                groupKey = 'Today';
            } else if (date.toDateString() === yesterday.toDateString()) {
                groupKey = 'Yesterday';
            } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)) {
                groupKey = 'This Week';
            } else if (date > new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)) {
                groupKey = 'This Month';
            } else {
                groupKey = 'Older';
            }

            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(notification);
        });

        return groups;
    }, [filteredNotifications]);

    const groupOrder = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older'];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-12">
            {/* Header Area */}
            <div className="bg-white dark:bg-gray-800">
                <div className="max-w-4xl mx-auto px-4 lg:px-6 py-8">
                    <button
                        onClick={() => navigate('/user/dashboard')}
                        className="mb-6 flex items-center gap-2 text-gray-500 hover:text-orange-500 transition-colors group"
                    >
                        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Dashboard</span>
                    </button>

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <Bell className="text-orange-500" />
                                Notifications
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-1">
                                Stay updated with your property activities and communications
                            </p>
                        </div>

                        <div className="flex gap-4">
                            {unreadCount > 0 && (
                                <button
                                    onClick={markAllAsRead}
                                    className="flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors"
                                >
                                    <CheckCheck size={18} />
                                    Mark all as read
                                </button>
                            )}
                            <button
                                onClick={() => navigate('/user/dashboard/settings')}
                                className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                <Settings size={20} />
                            </button>
                        </div>
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
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 lg:px-6 mt-8">
                {/* Filters & Search */}
                <div className="flex flex-col md:flex-row gap-4 mb-8">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search notifications..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 transition-all text-gray-900 dark:text-white"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <select
                        className="px-4 py-2.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl outline-none font-medium text-sm text-gray-900 dark:text-white"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as CategoryType)}
                    >
                        <option value="all">All Categories</option>
                        <option value="appointments">Appointments</option>
                        <option value="applications">Applications</option>
                        <option value="messages">Messages</option>
                        <option value="system">System</option>
                    </select>

                    <select
                        className="px-4 py-2.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-xl outline-none font-medium text-sm text-gray-900 dark:text-white"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value as FilterType)}
                    >
                        <option value="all">Recent & Read</option>
                        <option value="unread">Unread Only</option>
                        <option value="read">Read Only</option>
                    </select>
                </div>

                {/* Batch Actions */}
                {selectedNotifications.length > 0 && (
                    <div className="flex items-center justify-between bg-orange-500 text-white p-4 rounded-xl mb-6 shadow-lg animate-in slide-in-from-top duration-300">
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
                            <button onClick={handleMarkSelectedAsRead} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors">Mark as Read</button>
                            <button onClick={handleDeleteSelected} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                                <Trash2 size={16} />
                                Delete
                            </button>
                        </div>
                    </div>
                )}

                {/* List */}
                {loading ? (
                    <div className="space-y-4">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="h-24 bg-white dark:bg-gray-800 rounded-2xl animate-pulse" />
                        ))}
                    </div>
                ) : filteredNotifications.length > 0 ? (
                    <div className="space-y-8">
                        {groupOrder.map(group => {
                            const items = groupedNotifications[group];
                            if (!items || items.length === 0) return null;

                            return (
                                <div key={group} className="space-y-3">
                                    <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest pl-2">{group}</h3>
                                    <div className="space-y-3">
                                        {items.map(notification => (
                                            <div
                                                key={notification.id}
                                                className="group relative flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl transition-all hover:shadow-xl hover:-translate-y-0.5"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedNotifications.includes(notification.id)}
                                                    onChange={() => handleSelectNotification(notification.id)}
                                                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-orange-500 outline-none"
                                                />

                                                <div
                                                    className={`p-3 rounded-xl flex-shrink-0 ${getNotificationColor(notification.type)}`}
                                                    onClick={() => handleNotificationClick(notification)}
                                                >
                                                    {getNotificationIcon(notification.type)}
                                                </div>

                                                <div className="flex-1 min-w-0" onClick={() => handleNotificationClick(notification)}>
                                                    <div className="flex items-center justify-between gap-4">
                                                        <h4 className={`font-bold text-gray-900 dark:text-white truncate ${!notification.read ? 'pr-6' : ''}`}>
                                                            {notification.title}
                                                        </h4>
                                                        <span className="text-xs text-gray-400 whitespace-nowrap">{formatTime(notification.created_at)}</span>
                                                    </div>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{notification.message}</p>
                                                </div>

                                                {!notification.read && (
                                                    <div className="absolute top-4 right-4 w-2 h-2 bg-orange-500 rounded-full shadow-sm shadow-orange-500/50" />
                                                )}

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
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
                ) : (
                    <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl">
                        <div className="inline-flex items-center justify-center p-6 bg-gray-50 dark:bg-gray-700 rounded-full mb-6">
                            <Bell className="text-gray-300" size={48} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">All clear here!</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">No notifications found match your current filters.</p>
                        <button
                            onClick={() => { setFilter('all'); setCategory('all'); setSearchQuery(''); }}
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

