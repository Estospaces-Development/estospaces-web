"use client";

import React, { useState, useEffect } from 'react';
import { Settings, Bell, Shield, Moon, Globe, Save, CheckCircle, Loader2 } from 'lucide-react';
import { getPreferences, updatePreferences, type UserPreferences } from '../../../services/authService';
import { useToast } from '../../../contexts/ToastContext';

export default function UserSettingsPage() {
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const [settings, setSettings] = useState<UserPreferences>({
        email_enabled: true,
        push_enabled: false,
        marketing_emails: false,
        two_factor_auth: false,
        dark_mode: false,
        language: 'en',
        email_viewing_updates: true,
        email_application_updates: true,
        email_message_notifications: true,
        email_price_alerts: true,
        push_viewing_updates: true,
        sms_enabled: false,
        currency: 'GBP',
    });

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                setIsLoading(true);
                const { data, error } = await getPreferences();
                if (error) throw new Error(error);
                if (data) setSettings(data);
            } catch (error: any) {
                toast.error('Failed to load settings');
                console.error('[UserSettingsPage] Load Error:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, [toast]);

    const handleToggle = (key: keyof UserPreferences) => {
        if (typeof settings[key] !== 'boolean') return;
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
        setIsSaved(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSettings(prev => ({
            ...prev,
            [e.target.name as keyof UserPreferences]: e.target.value
        }));
        setIsSaved(false);
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const { error } = await updatePreferences(settings);
            if (error) throw new Error(error);
            
            setIsSaved(true);
            toast.success('Settings saved successfully');
            setTimeout(() => setIsSaved(false), 3000);
        } catch (error: any) {
            toast.error('Failed to save settings');
            console.error('[UserSettingsPage] Save Error:', error);
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-4" />
                    <p className="text-gray-500">Loading your preferences...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-12">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <Settings className="text-orange-500" />
                        Settings & Preferences
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your account settings and preferences.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white font-medium rounded-lg transition-colors shadow-sm"
                >
                    {isSaving ? (
                        <>
                            <Loader2 size={18} className="animate-spin" />
                            Saving...
                        </>
                    ) : (
                        <>
                            <Save size={18} />
                            Save Changes
                        </>
                    )}
                </button>
            </div>

            {isSaved && (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-3 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                    <CheckCircle size={18} />
                    Settings saved successfully.
                </div>
            )}

            <div className="space-y-6">
                {/* Notifications */}
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
                        <Bell size={20} className="text-orange-500" />
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Notifications</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-gray-100">Email Notifications</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Receive updates about your applications and messages via email.</p>
                            </div>
                            <button
                                onClick={() => handleToggle('email_enabled')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${settings.email_enabled ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.email_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-gray-100">Push Notifications</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Receive real-time alerts on your device.</p>
                            </div>
                            <button
                                onClick={() => handleToggle('push_enabled')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${settings.push_enabled ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.push_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-gray-100">Marketing & Tips</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Receive property tips and promotional offers.</p>
                            </div>
                            <button
                                onClick={() => handleToggle('marketing_emails')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${settings.marketing_emails ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.marketing_emails ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Security */}
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
                        <Shield size={20} className="text-blue-500" />
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Security</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-gray-100">Two-Factor Authentication</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Add an extra layer of security to your account.</p>
                            </div>
                            <button
                                onClick={() => handleToggle('two_factor_auth')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${settings.two_factor_auth ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.two_factor_auth ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-gray-100">Change Password</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Manage your password and security settings.</p>
                            </div>
                            <button className="text-sm font-medium text-orange-600 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300">
                                Update Password
                            </button>
                        </div>
                    </div>
                </section>

                {/* Appearance */}
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
                        <Moon size={20} className="text-purple-500" />
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Appearance & Language</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-gray-100">Dark Mode</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Switch between light and dark themes.</p>
                            </div>
                            <button
                                onClick={() => handleToggle('dark_mode')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${settings.dark_mode ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.dark_mode ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Globe size={18} className="text-gray-400" />
                                <h3 className="font-medium text-gray-900 dark:text-gray-100">Language</h3>
                            </div>
                            <select
                                name="language"
                                value={settings.language}
                                onChange={handleChange}
                                className="px-3 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                            >
                                <option value="en">English (UK)</option>
                                <option value="es">Español</option>
                                <option value="fr">Français</option>
                                <option value="de">Deutsch</option>
                            </select>
                        </div>
                    </div>
                </section>

                <div className="flex justify-center pt-6">
                    <button className="text-red-600 hover:text-red-700 text-sm font-medium transition-colors">
                        Delete Account
                    </button>
                </div>
            </div>
        </div>
    );
}
