'use client';

import { useState } from 'react';
import { Settings, Shield, Bell, Globe, Database, Mail, Save, RefreshCw } from 'lucide-react';

export default function AdminSettingsPage() {
    const [saved, setSaved] = useState(false);

    const handleSave = () => {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">System Settings</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Configure platform-wide settings and preferences</p>
                </div>
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-orange-500/20"
                >
                    {saved ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                    {saved ? 'Saved!' : 'Save Changes'}
                </button>
            </div>

            {/* Settings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* General Settings */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                            <Globe size={20} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">General</h2>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Platform Name</label>
                            <input type="text" defaultValue="EstoSpaces" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Support Email</label>
                            <input type="email" defaultValue="support@estospaces.com" className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Currency</label>
                            <select className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white">
                                <option>GBP (£)</option>
                                <option>EUR (€)</option>
                                <option>USD ($)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Security Settings */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                            <Shield size={20} className="text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Security</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
                                <p className="text-sm text-gray-500">Require 2FA for admin accounts</p>
                            </div>
                            <button className="relative w-12 h-6 bg-green-500 rounded-full transition-colors">
                                <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-transform" />
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Session Timeout</p>
                                <p className="text-sm text-gray-500">Auto-logout after inactivity</p>
                            </div>
                            <select className="px-3 py-1.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white">
                                <option>30 minutes</option>
                                <option>1 hour</option>
                                <option>4 hours</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Notification Settings */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                            <Bell size={20} className="text-orange-600 dark:text-orange-400" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Notifications</h2>
                    </div>
                    <div className="space-y-4">
                        {['New user registrations', 'Verification requests', 'System alerts', 'Weekly reports'].map((item) => (
                            <div key={item} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                                <p className="font-medium text-gray-900 dark:text-white text-sm">{item}</p>
                                <button className="relative w-12 h-6 bg-green-500 rounded-full transition-colors">
                                    <span className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full transition-transform" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Database Settings */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                            <Database size={20} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Data & Storage</h2>
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                            <div className="flex justify-between mb-2">
                                <p className="font-medium text-gray-900 dark:text-white text-sm">Storage Used</p>
                                <p className="text-sm text-gray-500">2.4 GB / 10 GB</p>
                            </div>
                            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full w-[24%] bg-purple-500 rounded-full" />
                            </div>
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                            <div className="flex justify-between mb-2">
                                <p className="font-medium text-gray-900 dark:text-white text-sm">Database Records</p>
                                <p className="text-sm text-gray-500">12,487</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
