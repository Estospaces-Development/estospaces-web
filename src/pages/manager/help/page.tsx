'use client';

import { useState, useEffect, useCallback } from 'react';
import { Clock, TrendingUp, CheckCircle, FileText, Search, MessageSquare, Headphones, Mail, Plus, Bell, X, ArrowLeft, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationsContext';
import * as messagesService from '@/services/messagesService';

type ViewType = 'search' | 'contact' | 'tickets' | 'notifications';

interface SupportTicket {
    id: string;
    title: string;
    status: string;
    priority: string;
    category: string;
    created_at: string;
}

export default function ManagerHelpPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { notifications } = useNotifications();
    const [currentView, setCurrentView] = useState<ViewType>('search');
    const [showNewTicketModal, setShowNewTicketModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
    const [newTicket, setNewTicket] = useState({ title: '', description: '', priority: 'medium', category: 'general' });
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [ticketsLoading, setTicketsLoading] = useState(false);
    const [contactLoading, setContactLoading] = useState(false);

    // Pre-populate contact form from auth
    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                name: user.name || '',
                email: user.email || '',
            }));
        }
    }, [user]);

    // Fetch support tickets from messaging service
    const fetchTickets = useCallback(async () => {
        setTicketsLoading(true);
        try {
            const data = await messagesService.getTickets();
            setTickets(data.map((t: any) => ({
                id: t.id,
                title: t.subject || 'Untitled',
                status: t.status || 'open',
                priority: t.priority || 'medium',
                category: t.category || 'general',
                created_at: t.created_at,
            })));
        } catch (err) {
            console.error('Failed to fetch tickets:', err);
        } finally {
            setTicketsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (currentView === 'tickets') {
            fetchTickets();
        }
    }, [currentView, fetchTickets]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setContactLoading(true);
        try {
            await messagesService.createTicket({
                subject: formData.subject,
                message: formData.message,
                priority: 'medium',
                category: 'general',
            });
            setFormData(prev => ({ ...prev, subject: '', message: '' }));
            alert('Message sent successfully!');
        } catch (err) {
            console.error('Failed to send message:', err);
            alert('Failed to send message. Please try again.');
        } finally {
            setContactLoading(false);
        }
    };

    const handleCreateTicket = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await messagesService.createTicket({
                subject: newTicket.title,
                message: newTicket.description,
                priority: newTicket.priority,
                category: newTicket.category,
            });
            setShowNewTicketModal(false);
            setNewTicket({ title: '', description: '', priority: 'medium', category: 'general' });
            await fetchTickets();
        } catch (err) {
            console.error('Failed to create ticket:', err);
            alert('Failed to create ticket. Please try again.');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'resolved':
            case 'closed':
                return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400';
            case 'in_progress':
                return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400';
            default:
                return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-400';
        }
    };

    const summaryCards = [
        { title: 'Support Available', value: '24/7', icon: Clock, color: 'bg-blue-500', shadow: 'shadow-blue-500/20' },
        { title: 'Response Rate', value: '+20%', icon: TrendingUp, color: 'bg-green-500', shadow: 'shadow-green-500/20' },
        { title: 'Satisfaction Rate', value: '98%', icon: CheckCircle, color: 'bg-purple-500', shadow: 'shadow-purple-500/20' },
        { title: 'Open Tickets', value: String(tickets.filter(t => t.status !== 'resolved' && t.status !== 'closed').length), icon: FileText, color: 'bg-orange-500', shadow: 'shadow-orange-500/20' },
    ];

    const quickLinks = [
        { label: 'Help Center', icon: FileText },
        { label: 'Live Chat', icon: MessageSquare },
        { label: 'Micro Support', icon: Headphones },
        { label: 'Email Support', icon: Mail },
    ];

    return (
        <div className="space-y-6 font-sans">
            <div>
                <div className="mb-4">
                    <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors">
                        <ArrowLeft className="w-5 h-5" /><span>Back</span>
                    </button>
                </div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">Help &amp; Support</h1>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {summaryCards.map((c) => (
                    <div key={c.title} className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 transition-colors">
                        <div className="flex items-center justify-between mb-4"><div className={`p-3 ${c.color} rounded-lg shadow-lg ${c.shadow}`}><c.icon className="w-6 h-6 text-white" /></div></div>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">{c.value}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{c.title}</p>
                    </div>
                ))}
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-4 transition-colors">
                <div className="flex flex-wrap gap-2">
                    {(['search', 'contact', 'tickets', 'notifications'] as ViewType[]).map((v) => (
                        <button key={v} onClick={() => setCurrentView(v)} className={`px-4 py-2 rounded-lg transition-colors ${currentView === v ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}>
                            {v === 'search' ? 'Search' : v === 'contact' ? 'Contact Us' : v === 'tickets' ? 'My Tickets' : 'Notifications'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Search View */}
            {currentView === 'search' && (
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-6 transition-colors">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">How can we help you?</h2>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input type="text" placeholder="Search our knowledge base or guides" className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-white placeholder-gray-400 dark:placeholder-gray-500" />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Do you have any specific questions?</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {quickLinks.map((q) => (
                                <button key={q.label} className="flex flex-col items-center p-6 border border-gray-300 dark:border-gray-700 rounded-lg hover:border-orange-500 dark:hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-500/10 transition-all group">
                                    <q.icon className="w-8 h-8 text-orange-500 mb-3 group-hover:scale-110 transition-transform" />
                                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{q.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Contact View */}
            {currentView === 'contact' && (
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-6">Send us a Message</h2>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {(['name', 'email', 'subject'] as const).map((f) => (
                            <div key={f}>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 capitalize">{f}</label>
                                <input type={f === 'email' ? 'email' : 'text'} value={formData[f]} onChange={(e) => setFormData({ ...formData, [f]: e.target.value })} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" required />
                            </div>
                        ))}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Message</label>
                            <textarea value={formData.message} onChange={(e) => setFormData({ ...formData, message: e.target.value })} rows={6} className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" required />
                        </div>
                        <button type="submit" disabled={contactLoading} className="px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white rounded-lg transition-colors flex items-center gap-2">
                            {contactLoading ? <><Loader2 size={16} className="animate-spin" /> Sending...</> : 'Send Message'}
                        </button>
                    </form>
                </div>
            )}

            {/* Tickets View */}
            {currentView === 'tickets' && (
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Support Tickets</h2>
                        <button onClick={() => setShowNewTicketModal(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">
                            <Plus className="w-4 h-4" /><span className="text-sm font-medium">New Ticket</span>
                        </button>
                    </div>
                    {ticketsLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p>No support tickets yet. Create one if you need help!</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {tickets.map((t) => (
                                <div key={t.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                    <div className="flex items-center justify-between">
                                        <div className="flex-1">
                                            <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-1">{t.title}</h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(t.created_at).toLocaleDateString()}</p>
                                        </div>
                                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(t.status)}`}>
                                            {t.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* New Ticket Modal */}
            {showNewTicketModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
                    <div className="bg-white dark:bg-gray-900 rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800 shadow-2xl">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Create New Ticket</h3>
                            <button onClick={() => { setShowNewTicketModal(false); setNewTicket({ title: '', description: '', priority: 'medium', category: 'general' }); }} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"><X className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleCreateTicket} className="space-y-4">
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ticket Title *</label><input type="text" value={newTicket.title} onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" required /></div>
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category *</label><select value={newTicket.category} onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"><option value="general">General</option><option value="technical">Technical</option><option value="billing">Billing</option><option value="feature_request">Feature Request</option><option value="bug_report">Bug Report</option></select></div>
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority *</label><select value={newTicket.priority} onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })} className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="urgent">Urgent</option></select></div>
                            <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label><textarea value={newTicket.description} onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })} rows={6} className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" required /></div>
                            <div className="flex gap-3 justify-end pt-4">
                                <button type="button" onClick={() => { setShowNewTicketModal(false); setNewTicket({ title: '', description: '', priority: 'medium', category: 'general' }); }} className="px-4 py-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">Create Ticket</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Notifications View */}
            {currentView === 'notifications' && (
                <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 p-6 space-y-6 transition-colors">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Notifications</h2>
                        {notifications.length === 0 ? (
                            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                                <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                <p>No notifications yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {notifications.map((n: any) => (
                                    <div key={n.id} className={`p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${n.read ? 'border-gray-200 dark:border-gray-800' : 'border-orange-200 dark:border-orange-800 bg-orange-50/30 dark:bg-orange-900/10'}`}>
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 bg-orange-500/10 rounded-lg"><Bell className="w-5 h-5 text-orange-500" /></div>
                                            <div className="flex-1">
                                                <h3 className="text-sm font-semibold text-gray-800 dark:text-white mb-1">{n.title}</h3>
                                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{n.message}</p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500">
                                                    {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
