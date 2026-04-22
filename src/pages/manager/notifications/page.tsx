import React, { useState, useMemo } from 'react';
import { Bell, Search, Inbox, Loader2, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/contexts/NotificationsContext';
import { getNotificationNavigationPath } from '@/services/notificationsService';

export default function ManagerNotificationsPage() {
    const navigate = useNavigate();
    const { 
        notifications, 
        unreadCount, 
        loading: isLoading, 
        markAsRead, 
        markAllAsRead
    } = useNotifications();

    const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Pre-process notifications to ensure safety
    const safeNotifications = useMemo(() => {
        if (!notifications || !Array.isArray(notifications)) return [];
        return notifications.filter(n => n && typeof n === 'object');
    }, [notifications]);

    const filteredNotifications = useMemo(() => {
        return safeNotifications.filter(n => {
            const matchesFilter = 
                filter === 'all' ? true : 
                filter === 'unread' ? !n.is_read : n.is_read;
            
            const title = String(n.title ?? '').toLowerCase();
            const message = String(n.message ?? '').toLowerCase();
            const search = searchQuery.toLowerCase();
            
            const matchesSearch = !search || title.includes(search) || message.includes(search);
                
            return matchesFilter && matchesSearch;
        });
    }, [safeNotifications, filter, searchQuery]);

    // Format time safely to prevent "Invalid Date" crashes
    const formatSafeTime = (dateStr: any) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '';
        }
    };

    const formatSafeDate = (dateStr: any) => {
        if (!dateStr) return 'Recent';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return 'Recent';
            return d.toLocaleDateString();
        } catch (e) {
            return 'Recent';
        }
    };

    if (isLoading && safeNotifications.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 min-h-[400px]">
                <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-4" />
                <p className="text-gray-500 text-sm font-medium">Fetching notifications...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 animate-fadeIn">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Bell className="text-orange-500" />
                        Notifications
                        {unreadCount > 0 && (
                            <span className="ml-2 px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-bold rounded-full">
                                {unreadCount} new
                            </span>
                        )}
                    </h1>
                </div>
                {unreadCount > 0 && (
                    <button 
                        onClick={() => markAllAsRead()}
                        className="text-sm text-orange-600 hover:text-orange-700 font-medium transition-colors flex items-center gap-1"
                    >
                        <Check className="w-4 h-4" />
                        Mark all as read
                    </button>
                )}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm">
                <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg w-full sm:w-auto">
                    {(['all', 'unread', 'read'] as const).map(f => (
                        <button
                            key={f}
                            onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                                filter === f ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'
                            }`}
                        >
                            {f}
                        </button>
                    ))}
                </div>
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input 
                        type="text"
                        placeholder="Search notifications..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 text-sm bg-transparent border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all dark:text-white"
                    />
                </div>
            </div>

            {filteredNotifications.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col items-center">
                    <Inbox size={48} className="text-gray-200 dark:text-gray-700 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">No notifications found</h3>
                    <p className="text-gray-500 mt-2">Try adjusting your filters or search query</p>
                </div>
            ) : (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 shadow-sm divide-y divide-gray-50 dark:divide-gray-700 overflow-hidden">
                    {filteredNotifications.map(n => (
                        <div 
                            key={String(n.id || Math.random())}
                            onClick={() => {
                                if (!n.is_read) markAsRead(n.id);
                                const path = getNotificationNavigationPath(n, 'manager');
                                if (path) navigate(path);
                            }}
                            className={`p-4 flex gap-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!n.is_read ? 'bg-orange-50/30' : ''}`}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start mb-1">
                                    <h3 className={`text-sm font-semibold truncate ${!n.is_read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                                        {String(n.title ?? 'Notification')}
                                    </h3>
                                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                                        {formatSafeDate(n.created_at)} {formatSafeTime(n.created_at)}
                                    </span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                    {String(n.message ?? '')}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
