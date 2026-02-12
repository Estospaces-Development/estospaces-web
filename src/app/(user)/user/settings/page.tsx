"use client";

import React, { useState } from 'react';
import { Settings, Bell, Shield, Moon, Globe, Smartphone, Save, CheckCircle, Loader2 } from 'lucide-react';

export default function UserSettingsPage() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    // Mock settings state
    const [settings, setSettings] = useState({
        emailNotifications: true,
        pushNotifications: false,
        marketingEmails: false,
        twoFactorAuth: false,
        darkMode: false,
        language: 'en',
    });

    const handleToggle = (key: keyof typeof settings) => {
        setSettings(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
        setIsSaved(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSettings(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
        setIsSaved(false);
    };

    const handleSave = async () => {
        setIsLoading(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsLoading(false);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
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
                    disabled={isLoading}
                    className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white font-medium rounded-lg transition-colors shadow-sm"
                >
                    {isLoading ? (
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
                                onClick={() => handleToggle('emailNotifications')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${settings.emailNotifications ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.emailNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-gray-100">Push Notifications</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Receive real-time alerts on your device.</p>
                            </div>
                            <button
                                onClick={() => handleToggle('pushNotifications')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${settings.pushNotifications ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.pushNotifications ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-gray-100">Marketing & Tips</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Receive property tips and promotional offers.</p>
                            </div>
                            <button
                                onClick={() => handleToggle('marketingEmails')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${settings.marketingEmails ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.marketingEmails ? 'translate-x-6' : 'translate-x-1'}`} />
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
                                onClick={() => handleToggle('twoFactorAuth')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${settings.twoFactorAuth ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.twoFactorAuth ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-gray-100">Change Password</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Last changed 3 months ago.</p>
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
                                onClick={() => handleToggle('darkMode')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${settings.darkMode ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.darkMode ? 'translate-x-6' : 'translate-x-1'}`} />
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
