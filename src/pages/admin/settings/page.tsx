'use client';

import { useState, useEffect } from 'react';
import { Shield, Bell, Globe, Database, Save, RefreshCw, Loader2 } from 'lucide-react';
import { adminService, type SystemSettings, type PlatformStats } from '../../../services/adminService';
import { useToast } from '../../../contexts/ToastContext';

export default function AdminSettingsPage() {
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [stats, setStats] = useState<PlatformStats | null>(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setIsLoading(true);
                const [settingsData, statsData] = await Promise.all([
                    adminService.getSettings(),
                    adminService.getPlatformStats(),
                ]);
                setSettings(settingsData);
                setStats(statsData);
            } catch (error: any) {
                toast.error('Failed to load system settings');
                console.error('[AdminSettingsPage] Load Error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadData();
    }, [toast]);

    const handleSave = async () => {
        if (!settings || isSaving) return;

        try {
            setIsSaving(true);
            await adminService.updateSettings(settings);
            toast.success('Settings updated successfully');
        } catch (error: any) {
            toast.error('Failed to update settings');
            console.error('[AdminSettingsPage] Save Error:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const updateNestedSetting = (category: keyof SystemSettings['notifications'], value: boolean) => {
        if (!settings) return;
        setSettings({
            ...settings,
            notifications: {
                ...settings.notifications,
                [category]: value,
            },
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-100px)]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-4" />
                    <p className="text-gray-500">Loading system settings...</p>
                </div>
            </div>
        );
    }

    if (!settings) return null;

    const hasStorageQuota = Boolean(stats && stats.storageTotal > 0);
    const storageUsagePercent = hasStorageQuota
        ? Math.min(100, ((stats?.storageUsed || 0) / (stats?.storageTotal || 1)) * 100)
        : 0;

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">System Settings</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Configure platform-wide settings and preferences</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-orange-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                            <input
                                type="text"
                                value={settings.platformName}
                                onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Support Email</label>
                            <input
                                type="email"
                                value={settings.supportEmail}
                                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Default Currency</label>
                            <select
                                value={settings.defaultCurrency}
                                onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
                            >
                                <option>GBP</option>
                                <option>EUR</option>
                                <option>USD</option>
                            </select>
                        </div>
                    </div>
                </div>

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
                            <button
                                onClick={() => setSettings({ ...settings, twoFactorAuth: !settings.twoFactorAuth })}
                                className={`relative w-12 h-6 rounded-full transition-colors ${settings.twoFactorAuth ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                            >
                                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.twoFactorAuth ? 'right-1' : 'left-1'}`} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                            <div>
                                <p className="font-medium text-gray-900 dark:text-white">Session Timeout</p>
                                <p className="text-sm text-gray-500">Auto-logout after inactivity</p>
                            </div>
                            <select
                                value={settings.sessionTimeout}
                                onChange={(e) => setSettings({ ...settings, sessionTimeout: e.target.value })}
                                className="px-3 py-1.5 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option>30 minutes</option>
                                <option>1 hour</option>
                                <option>4 hours</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl">
                            <Bell size={20} className="text-orange-600 dark:text-orange-400" />
                        </div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Notifications</h2>
                    </div>
                    <div className="space-y-4">
                        {[
                            { key: 'registrations' as const, label: 'New user registrations' },
                            { key: 'verifications' as const, label: 'Verification requests' },
                            { key: 'alerts' as const, label: 'System alerts' },
                            { key: 'reports' as const, label: 'Weekly reports' },
                        ].map((item) => (
                            <div key={item.key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                                <p className="font-medium text-gray-900 dark:text-white text-sm">{item.label}</p>
                                <button
                                    onClick={() => updateNestedSetting(item.key, !settings.notifications[item.key])}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${settings.notifications[item.key] ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-700'}`}
                                >
                                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.notifications[item.key] ? 'right-1' : 'left-1'}`} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

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
                                <p className="text-sm text-gray-500">
                                    {hasStorageQuota
                                        ? `${stats?.storageUsed || 0} GB / ${stats?.storageTotal || 0} GB`
                                        : `${stats?.storageUsed || 0} GB tracked`}
                                </p>
                            </div>
                            {hasStorageQuota ? (
                                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-purple-500 rounded-full transition-all duration-1000"
                                        style={{ width: `${storageUsagePercent}%` }}
                                    />
                                </div>
                            ) : (
                                <p className="text-xs text-gray-500">Live database usage is available, but no storage quota is configured.</p>
                            )}
                        </div>
                        <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl">
                            <div className="flex justify-between mb-2">
                                <p className="font-medium text-gray-900 dark:text-white text-sm">Database Records</p>
                                <p className="text-sm text-gray-500">{stats?.databaseRecords.toLocaleString() || 0}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
