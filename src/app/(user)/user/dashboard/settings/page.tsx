"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Bell,
    Lock,
    CreditCard,
    Globe,
    ArrowLeft,
    Save,
    Loader2,
    Mail,
    Smartphone,
    Moon,
    Clock,
    Check,
    Shield,
    Eye,
    CreditCard as PaymentIcon,
    Globe as LangIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Toggle from '@/components/ui/Toggle';

export default function SettingsPage() {
    const router = useRouter();
    const { user } = useAuth();

    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState('notifications');

    const [preferences, setPreferences] = useState({
        email_enabled: true,
        email_viewing_updates: true,
        email_application_updates: true,
        email_message_notifications: true,
        email_price_alerts: true,
        push_enabled: true,
        push_viewing_updates: true,
        sms_enabled: false,
        quiet_hours_enabled: false,
        quiet_hours_start: '22:00',
        quiet_hours_end: '08:00',
        dark_mode: false,
        language: 'English',
        currency: 'GBP',
    });

    const handleToggle = (key: string) => {
        setPreferences(prev => ({ ...prev, [key]: !(prev as any)[key] }));
        setSaveSuccess(false);
    };

    const handleSave = async () => {
        setSaving(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
        setSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    const tabs = [
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'security', label: 'Security', icon: Lock },
        { id: 'payments', label: 'Payments', icon: PaymentIcon },
        { id: 'preferences', label: 'Preferences', icon: LangIcon },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-10">
                    <button
                        onClick={() => router.push('/user/dashboard')}
                        className="mb-6 flex items-center gap-2 text-gray-400 hover:text-orange-500 transition-all group"
                    >
                        <div className="p-2 rounded-xl group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20 transition-all">
                            <ArrowLeft size={18} />
                        </div>
                        <span className="font-bold text-sm">Dashboard</span>
                    </button>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                                Settings
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
                                Personalize your experience and security preferences
                            </p>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-8 py-4 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white rounded-2xl font-black shadow-xl shadow-orange-500/25 active:scale-[0.98] transition-all flex items-center gap-3"
                        >
                            {saving ? (
                                <Loader2 size={24} className="animate-spin" />
                            ) : saveSuccess ? (
                                <Check size={24} strokeWidth={3} />
                            ) : (
                                <Save size={24} />
                            )}
                            <span>{saving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}</span>
                        </button>
                    </div>

                    <div className="flex gap-2 mt-10 overflow-x-auto pb-4 scrollbar-hide">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all ${activeTab === tab.id
                                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xl'
                                        : 'bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white border dark:border-gray-700'
                                    }`}
                            >
                                <tab.icon size={18} className={activeTab === tab.id ? 'text-orange-500' : ''} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="max-w-4xl">
                    {activeTab === 'notifications' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border dark:border-gray-700 p-8">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-orange-500">
                                        <Mail size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Email Communications</h2>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Control the updates we send to your inbox</p>
                                    </div>
                                    <div className="ml-auto">
                                        <Toggle
                                            checked={preferences.email_enabled}
                                            onChange={() => handleToggle('email_enabled')}
                                        />
                                    </div>
                                </div>

                                <div className={`space-y-1 ${!preferences.email_enabled ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                                    {[
                                        { id: 'email_viewing_updates', title: 'Viewing Requests', desc: 'Alerts about confirmed dates and scheduling changes' },
                                        { id: 'email_application_updates', title: 'Application Status', desc: 'Instant updates on your rental applications' },
                                        { id: 'email_message_notifications', title: 'New Messages', desc: 'Notifications for direct messages from agents' },
                                        { id: 'email_price_alerts', title: 'Price Alerts', desc: 'When your saved properties drop in price' }
                                    ].map((item, idx) => (
                                        <div key={item.id} className={`flex items-center justify-between py-5 ${idx !== 0 ? 'border-t dark:border-gray-700' : ''}`}>
                                            <div className="pr-4">
                                                <p className="font-bold text-gray-900 dark:text-white">{item.title}</p>
                                                <p className="text-sm text-gray-500 font-medium mt-0.5">{item.desc}</p>
                                            </div>
                                            <Toggle
                                                checked={(preferences as any)[item.id]}
                                                onChange={() => handleToggle(item.id)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border dark:border-gray-700 p-8">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-orange-500">
                                        <Smartphone size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">SMS & Push Settings</h2>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Manage instant mobile alerts</p>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    {[
                                        { id: 'push_enabled', title: 'Push Notifications', desc: 'In-app alerts for real-time activities' },
                                        { id: 'sms_enabled', title: 'SMS Updates', desc: 'Urgent text messages for viewing reminders' }
                                    ].map((item, idx) => (
                                        <div key={item.id} className={`flex items-center justify-between py-5 ${idx !== 0 ? 'border-t dark:border-gray-700' : ''}`}>
                                            <div className="pr-4">
                                                <p className="font-bold text-gray-900 dark:text-white">{item.title}</p>
                                                <p className="text-sm text-gray-500 font-medium mt-0.5">{item.desc}</p>
                                            </div>
                                            <Toggle
                                                checked={(preferences as any)[item.id]}
                                                onChange={() => handleToggle(item.id)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 border dark:border-gray-700">
                                <div className="flex items-center gap-4 mb-10">
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl text-red-500">
                                        <Shield size={28} />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Account Security</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[
                                        { title: 'Change Password', desc: 'Update your secret phrase', icon: Lock },
                                        { title: 'Privacy Settings', desc: 'Control your visibility', icon: Eye },
                                        { title: 'Login Sessions', desc: 'Manage your active devices', icon: Smartphone }
                                    ].map((item) => (
                                        <button key={item.title} className="flex items-start gap-4 p-5 bg-gray-50 dark:bg-gray-900/50 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-900 transition-all text-left border dark:border-gray-700 group">
                                            <div className="p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-gray-400 group-hover:text-orange-500 transition-colors">
                                                <item.icon size={20} />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 dark:text-white leading-tight">{item.title}</p>
                                                <p className="text-xs text-gray-500 font-medium mt-1 uppercase tracking-widest">{item.desc}</p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'preferences' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border dark:border-gray-700 p-8">
                                <div className="flex items-center gap-4 mb-10">
                                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-orange-500">
                                        <Globe size={28} />
                                    </div>
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Regional Preferences</h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 px-1">Language</label>
                                        <select className="w-full bg-gray-50 dark:bg-gray-900/50 border dark:border-gray-700 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-orange-500 font-bold text-gray-900 dark:text-white appearance-none">
                                            <option>English (UK)</option>
                                            <option>English (US)</option>
                                            <option>Spanish</option>
                                            <option>Hindi</option>
                                        </select>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] uppercase font-black tracking-widest text-gray-400 px-1">Currency</label>
                                        <select className="w-full bg-gray-50 dark:bg-gray-900/50 border dark:border-gray-700 rounded-2xl px-5 py-4 outline-none focus:ring-2 focus:ring-orange-500 font-bold text-gray-900 dark:text-white appearance-none">
                                            <option>GBP (£)</option>
                                            <option>USD ($)</option>
                                            <option>EUR (€)</option>
                                            <option>INR (₹)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border dark:border-gray-700 p-8">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-orange-500">
                                            <Moon size={28} />
                                        </div>
                                        <div>
                                            <p className="font-bold text-gray-900 dark:text-white">Appearance Mode</p>
                                            <p className="text-sm text-gray-500 font-medium">Switch between light and dark themes</p>
                                        </div>
                                    </div>
                                    <Toggle
                                        checked={preferences.dark_mode}
                                        onChange={() => handleToggle('dark_mode')}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'payments' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border dark:border-gray-700 p-8 flex flex-col items-center justify-center text-center py-20">
                                <div className="w-20 h-20 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center mb-6">
                                    <PaymentIcon size={40} className="text-orange-500" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">No payment methods found</h3>
                                <p className="text-gray-500 mt-2 max-w-sm mx-auto font-medium">Add a card or bank account to process rent payments and move-in costs.</p>
                                <button className="mt-8 px-10 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black active:scale-95 transition-all">
                                    Add New Method
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
