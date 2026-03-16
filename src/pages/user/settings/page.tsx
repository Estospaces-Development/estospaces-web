"use client";

import React, { useEffect, useState } from 'react';
import {
    Settings,
    Bell,
    Search,
    ShieldAlert,
    Save,
    CheckCircle,
    Loader2,
    MapPin,
    PoundSterling,
    BedDouble,
} from 'lucide-react';
import { getPreferences, updatePreferences, type UserPreferences } from '../../../services/authService';
import { useToast } from '../../../contexts/ToastContext';

const defaultPreferences: UserPreferences = {
    preferred_city: '',
    preferred_type: '',
    min_budget: null,
    max_budget: null,
    min_bedrooms: null,
    max_bedrooms: null,
    notifications_enabled: true,
    email_alerts: true,
    search_radius_km: null,
    onboarding_done: false,
};

export default function UserSettingsPage() {
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [settings, setSettings] = useState<UserPreferences>(defaultPreferences);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                setIsLoading(true);
                const { data, error } = await getPreferences();
                if (error) throw new Error(error);
                if (data) {
                    setSettings({
                        ...defaultPreferences,
                        ...data,
                    });
                }
            } catch (error: any) {
                toast.error('Failed to load settings');
                console.error('[UserSettingsPage] Load Error:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettings();
    }, [toast]);

    const handleToggle = (key: 'notifications_enabled' | 'email_alerts' | 'onboarding_done') => {
        setSettings((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
        setIsSaved(false);
    };

    const handleTextChange = (key: 'preferred_city' | 'preferred_type', value: string) => {
        setSettings((prev) => ({
            ...prev,
            [key]: value,
        }));
        setIsSaved(false);
    };

    const handleNumberChange = (
        key: 'min_budget' | 'max_budget' | 'min_bedrooms' | 'max_bedrooms' | 'search_radius_km',
        value: string,
    ) => {
        setSettings((prev) => ({
            ...prev,
            [key]: value === '' ? null : Number(value),
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
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        These fields are the ones currently supported by the user preferences API.
                    </p>
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
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
                        <Bell size={20} className="text-orange-500" />
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Alerts</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-gray-100">In-App Notifications</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Enable dashboard notifications.</p>
                            </div>
                            <button
                                onClick={() => handleToggle('notifications_enabled')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${settings.notifications_enabled ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.notifications_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-gray-100">Email Alerts</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Receive email updates for saved search activity.</p>
                            </div>
                            <button
                                onClick={() => handleToggle('email_alerts')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${settings.email_alerts ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.email_alerts ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </section>

                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
                        <Search size={20} className="text-blue-500" />
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Search Defaults</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Preferred City</label>
                            <div className="relative">
                                <MapPin size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    value={settings.preferred_city}
                                    onChange={(e) => handleTextChange('preferred_city', e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100"
                                    placeholder="London"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Preferred Listing Type</label>
                            <select
                                value={settings.preferred_type}
                                onChange={(e) => handleTextChange('preferred_type', e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100"
                            >
                                <option value="">No default</option>
                                <option value="rent">Rent</option>
                                <option value="sale">Sale</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Minimum Budget</label>
                            <div className="relative">
                                <PoundSterling size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="number"
                                    min="0"
                                    value={settings.min_budget ?? ''}
                                    onChange={(e) => handleNumberChange('min_budget', e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Maximum Budget</label>
                            <div className="relative">
                                <PoundSterling size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="number"
                                    min="0"
                                    value={settings.max_budget ?? ''}
                                    onChange={(e) => handleNumberChange('max_budget', e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Minimum Bedrooms</label>
                            <div className="relative">
                                <BedDouble size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="number"
                                    min="0"
                                    value={settings.min_bedrooms ?? ''}
                                    onChange={(e) => handleNumberChange('min_bedrooms', e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Maximum Bedrooms</label>
                            <div className="relative">
                                <BedDouble size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="number"
                                    min="0"
                                    value={settings.max_bedrooms ?? ''}
                                    onChange={(e) => handleNumberChange('max_bedrooms', e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Search Radius (km)</label>
                            <input
                                type="number"
                                min="0"
                                value={settings.search_radius_km ?? ''}
                                onChange={(e) => handleNumberChange('search_radius_km', e.target.value)}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100"
                                placeholder="25"
                            />
                        </div>
                    </div>
                </section>

                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
                        <ShieldAlert size={20} className="text-purple-500" />
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Account State</h2>
                    </div>
                    <div className="p-6 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-medium text-gray-900 dark:text-gray-100">Onboarding Complete</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">Stored as part of the current preferences record.</p>
                            </div>
                            <button
                                onClick={() => handleToggle('onboarding_done')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${settings.onboarding_done ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.onboarding_done ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                            Theme mode, language, SMS, push notifications, and 2FA controls are not backed by the current API, so they are intentionally excluded here for now.
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
