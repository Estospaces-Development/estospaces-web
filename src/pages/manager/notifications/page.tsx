'use client';

import { useState, useMemo } from 'react';
import { Bell, CheckCircle, AlertCircle, FileText, Shield, MessageCircle, Calendar, Home, DollarSign, Trash2, CheckCheck, Clock, Filter, ArrowLeft, Settings, Search, X, Inbox } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type FilterType = 'all' | 'unread' | 'read';
type CategoryType = 'all' | 'appointments' | 'applications' | 'messages' | 'system';

interface Notification {
    id: string; title: string; message: string; type: string; read: boolean; created_at: string;
    data?: { propertyId?: string; applicationId?: string; viewingId?: string };
}

const MOCK_NOTIFICATIONS: Notification[] = [
    { id: '1', title: 'Appointment Confirmed', message: 'Sarah Johnson confirmed viewing for Canary Wharf Apartment', type: 'appointment_approved', read: false, created_at: new Date().toISOString() },
    { id: '2', title: 'New Application', message: 'Michael Chen submitted an application for Kensington Townhouse', type: 'application_update', read: false, created_at: new Date(Date.now() - 3600000).toISOString() },
    { id: '3', title: 'Message Received', message: 'You have a new message from Emily Wilson regarding Shoreditch Penthouse', type: 'ticket_response', read: true, created_at: new Date(Date.now() - 86400000).toISOString() },
    { id: '4', title: 'Profile Verified', message: 'Your manager profile has been verified successfully', type: 'profile_verified', read: true, created_at: new Date(Date.now() - 172800000).toISOString() },
    { id: '5', title: 'Viewing Scheduled', message: 'New viewing booked for Richmond Family Home on March 5', type: 'viewing_booked', read: false, created_at: new Date(Date.now() - 7200000).toISOString() },
];

export default function ManagerNotificationsPage() {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
    const [filter, setFilter] = useState<FilterType>('all');
    const [category, setCategory] = useState<CategoryType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);

    const unreadCount = notifications.filter(n => !n.read).length;

    const filteredNotifications = useMemo(() => {
        return notifications.filter((n) => {
            if (filter === 'unread' && n.read) return false;
            if (filter === 'read' && !n.read) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                return n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q);
            }
            return true;
        });
    }, [notifications, filter, searchQuery]);

    const markAsRead = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    const markAllAsRead = () => setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    const deleteNotification = (id: string) => setNotifications(prev => prev.filter(n => n.id !== id));

    const getIcon = (type: string) => {
        switch (type) {
            case 'appointment_approved': return <CheckCircle size={20} className="text-green-500" />;
            case 'appointment_rejected': return <AlertCircle size={20} className="text-red-500" />;
            case 'application_update': return <FileText size={20} className="text-blue-500" />;
            case 'profile_verified': case 'document_verified': return <Shield size={20} className="text-green-500" />;
            case 'ticket_response': return <MessageCircle size={20} className="text-purple-500" />;
            case 'property_saved': return <Home size={20} className="text-orange-500" />;
            case 'price_drop': return <DollarSign size={20} className="text-green-500" />;
            case 'viewing_booked': return <Calendar size={20} className="text-blue-500" />;
            default: return <Bell size={20} className="text-gray-500" />;
        }
    };

    const getColor = (type: string) => {
        switch (type) {
            case 'appointment_approved': case 'profile_verified': case 'document_verified': case 'price_drop': return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
            case 'appointment_rejected': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
            case 'application_update': case 'viewing_booked': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
            case 'ticket_response': return 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800';
            case 'property_saved': return 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800';
            default: return 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600';
        }
    };

    const formatTime = (dateString: string) => {
        const diff = Math.floor((Date.now() - new Date(dateString).getTime()) / 1000);
        if (diff < 60) return 'Just now';
        if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
        if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;
        return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const handleSelectAll = () => {
        if (selectedNotifications.length === filteredNotifications.length) setSelectedNotifications([]);
        else setSelectedNotifications(filteredNotifications.map(n => n.id));
    };

    const handleDeleteSelected = () => { selectedNotifications.forEach(id => deleteNotification(id)); setSelectedNotifications([]); };
    const handleMarkSelectedAsRead = () => { selectedNotifications.forEach(id => markAsRead(id)); setSelectedNotifications([]); };

    // Group by date
    const grouped = useMemo(() => {
        const g: Record<string, Notification[]> = {};
        filteredNotifications.forEach(n => {
            const d = new Date(n.created_at);
            const today = new Date();
            const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
            let key: string;
            if (d.toDateString() === today.toDateString()) key = 'Today';
            else if (d.toDateString() === yesterday.toDateString()) key = 'Yesterday';
            else if (d > new Date(today.getTime() - 7 * 86400000)) key = 'This Week';
            else key = 'Older';
            if (!g[key]) g[key] = [];
            g[key].push(n);
        });
        return g;
    }, [filteredNotifications]);

    const groupOrder = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older'];

    return (
        <div className="min-h-full bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-4xl mx-auto px-4 lg:px-6 py-6">
                    <button onClick={() => navigate('/manager/dashboard')} className="mb-4 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                        <ArrowLeft size={20} /><span>Back to Dashboard</span>
                    </button>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <Bell className="text-orange-500" /> Notifications
                                {unreadCount > 0 && <span className="px-2.5 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-sm font-medium rounded-full">{unreadCount} new</span>}
                            </h1>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Stay updated with your property activities</p>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        {[
                            { label: 'Total', value: notifications.length, icon: Bell, iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600 dark:text-blue-400' },
                            { label: 'Unread', value: unreadCount, icon: AlertCircle, iconBg: 'bg-orange-100 dark:bg-orange-900/30', iconColor: 'text-orange-600 dark:text-orange-400' },
                            { label: 'Read', value: notifications.length - unreadCount, icon: CheckCircle, iconBg: 'bg-green-100 dark:bg-green-900/30', iconColor: 'text-green-600 dark:text-green-400' },
                        ].map(s => (
                            <div key={s.label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 ${s.iconBg} rounded-lg`}><s.icon size={20} className={s.iconColor} /></div>
                                    <div><p className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</p><p className="text-xs text-gray-500 dark:text-gray-400">{s.label}</p></div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Filters */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" placeholder="Search notifications…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500" />
                            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={16} /></button>}
                        </div>
                        <div className="flex gap-2">
                            {(['all', 'unread', 'read'] as FilterType[]).map(f => (
                                <button key={f} onClick={() => setFilter(f)} className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors capitalize ${filter === f ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>{f}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions Bar */}
            <div className="max-w-4xl mx-auto px-4 lg:px-6 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={handleSelectAll} className="text-sm text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">{selectedNotifications.length === filteredNotifications.length ? 'Deselect All' : 'Select All'}</button>
                        {selectedNotifications.length > 0 && (
                            <>
                                <button onClick={handleMarkSelectedAsRead} className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"><CheckCheck size={16} /> Mark Read</button>
                                <button onClick={handleDeleteSelected} className="text-sm text-red-600 dark:text-red-400 hover:underline flex items-center gap-1"><Trash2 size={16} /> Delete</button>
                            </>
                        )}
                    </div>
                    {unreadCount > 0 && <button onClick={markAllAsRead} className="text-sm text-orange-600 dark:text-orange-400 font-medium hover:underline">Mark all as read</button>}
                </div>
            </div>

            {/* Notification List */}
            <div className="max-w-4xl mx-auto px-4 lg:px-6 pb-8">
                {filteredNotifications.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                        <Inbox size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No notifications</h3>
                        <p className="text-gray-500 dark:text-gray-400">You&apos;re all caught up!</p>
                    </div>
                ) : (
                    groupOrder.filter(g => grouped[g]).map(group => (
                        <div key={group} className="mb-6">
                            <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-1">{group}</h3>
                            <div className="space-y-2">
                                {grouped[group].map(n => (
                                    <div key={n.id} onClick={() => { if (!n.read) markAsRead(n.id); }} className={`flex items-start gap-4 p-4 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${!n.read ? getColor(n.type) : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 opacity-75'}`}>
                                        <input type="checkbox" checked={selectedNotifications.includes(n.id)} onChange={(e) => { e.stopPropagation(); if (selectedNotifications.includes(n.id)) setSelectedNotifications(s => s.filter(i => i !== n.id)); else setSelectedNotifications(s => [...s, n.id]); }} className="mt-1 rounded border-gray-300 text-orange-500 focus:ring-orange-500" />
                                        <div className="flex-shrink-0 mt-0.5">{getIcon(n.type)}</div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className={`text-sm font-semibold ${!n.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'}`}>{n.title}</h4>
                                                {!n.read && <span className="w-2 h-2 bg-orange-500 rounded-full flex-shrink-0" />}
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{n.message}</p>
                                            <div className="flex items-center gap-2 mt-2"><Clock size={14} className="text-gray-400" /><span className="text-xs text-gray-400">{formatTime(n.created_at)}</span></div>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }} className="text-gray-400 hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

