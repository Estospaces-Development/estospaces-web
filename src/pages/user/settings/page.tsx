"use client";

import BrandLoader from '@/components/ui/BrandLoader';
import ActionSpinner from '@/components/ui/ActionSpinner';

import React, { useEffect, useState } from 'react';
import {
    Settings,
    Bell,
    Search,
    ShieldAlert,
    Save,
    CheckCircle,
    MapPin,
    PoundSterling,
    BedDouble,
} from 'lucide-react';
import { getPreferences, updatePreferences, type UserPreferences } from '../../../services/authService';
import { useToast } from '../../../contexts/ToastContext';
import { type PreferencesValidationErrors, validateUserPreferences, validateCityInput, hasNoSearchPreferences } from '@/lib/preferencesValidation';

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
    const [preferenceErrors, setPreferenceErrors] = useState<PreferencesValidationErrors>({});

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
            } catch (_error: any) {
                toast.error('Failed to load settings');
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
        if (key === 'preferred_city') {
            // Strip any character that is not a letter, space, hyphen, or apostrophe
            const sanitized = value.replace(/[^a-zA-Z\s\-']/g, '');
            // Enforce max length of 12 characters (matches validateCityInput)
            const truncated = sanitized.slice(0, 12);
            setSettings((prev) => ({
                ...prev,
                preferred_city: truncated,
            }));
            const cityError = validateCityInput(truncated);
            if (cityError) {
                setPreferenceErrors((prev) => ({ ...prev, preferred_city: cityError }));
            } else {
                setPreferenceErrors((prev) => ({ ...prev, preferred_city: undefined }));
            }
            setIsSaved(false);
            return;
        }

        setSettings((prev) => ({
            ...prev,
            [key]: value,
        }));
        setPreferenceErrors((prev) => ({ ...prev, [key]: undefined }));
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
        setPreferenceErrors((prev) => ({ ...prev, [key]: undefined }));
        setIsSaved(false);
    };

    const handleSave = async () => {
        const errors = validateUserPreferences(settings);
        if (Object.keys(errors).length > 0) {
            setPreferenceErrors(errors);
            toast.error('Please correct the highlighted preference fields.');
            return;
        }

        const cityError = validateCityInput(settings.preferred_city);
        if (cityError) {
            setPreferenceErrors((prev) => ({ ...prev, preferred_city: cityError }));
            toast.error('Please correct the highlighted preference fields.');
            return;
        }

        if (hasNoSearchPreferences(settings)) {
            setPreferenceErrors({});
            toast.error('Please enter at least one search preference before saving.');
            return;
        }

        try {
            setIsSaving(true);
            const { error } = await updatePreferences(settings);
            if (error) throw new Error(error);

            setIsSaved(true);
            toast.success('Settings saved successfully');
            setTimeout(() => setIsSaved(false), 3000);
        } catch (_error: any) {
            toast.error('Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-200px)]">
                <div className="text-center">
                    <BrandLoader className="w-10 h-10 text-orange-500 mx-auto mb-4" />
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
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    aria-label="Save user preference changes"
                    className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white font-medium rounded-lg transition-colors shadow-sm"
                >
                    {isSaving ? (
                        <>
                            <ActionSpinner size={18} className="" />
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
                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
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
                                type="button"
                                role="switch"
                                aria-label="Toggle in-app notifications"
                                aria-checked={settings.notifications_enabled}
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
                                type="button"
                                role="switch"
                                aria-label="Toggle email alerts"
                                aria-checked={settings.email_alerts}
                                onClick={() => handleToggle('email_alerts')}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 ${settings.email_alerts ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.email_alerts ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </section>

                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center gap-2">
                        <Search size={20} className="text-blue-500" />
                        <h2 className="font-semibold text-gray-900 dark:text-gray-100">Search Defaults</h2>
                    </div>
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="settings-preferred-city" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Preferred City</label>
                            <div className="relative">
                                <MapPin size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    id="settings-preferred-city"
                                    type="text"
                                    value={settings.preferred_city}
                                    onChange={(e) => handleTextChange('preferred_city', e.target.value)}
                                    aria-invalid={preferenceErrors.preferred_city ? 'true' : 'false'}
                                    aria-describedby={preferenceErrors.preferred_city ? 'settings-preferred-city-error' : undefined}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100"
                                    placeholder="Chennai"
                                />
                            </div>
                            {preferenceErrors.preferred_city && (
                                <p id="settings-preferred-city-error" role="alert" className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
                                    {preferenceErrors.preferred_city}
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="settings-preferred-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Preferred Listing Type</label>
                            <select
                                id="settings-preferred-type"
                                value={settings.preferred_type}
                                onChange={(e) => handleTextChange('preferred_type', e.target.value)}
                                aria-invalid={preferenceErrors.preferred_type ? 'true' : 'false'}
                                aria-describedby={preferenceErrors.preferred_type ? 'settings-preferred-type-error' : undefined}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100"
                            >
                                <option value="">No default</option>
                                <option value="rent">Rent</option>
                                <option value="sale">Sale</option>
                            </select>
                            {preferenceErrors.preferred_type && (
                                <p id="settings-preferred-type-error" role="alert" className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
                                    {preferenceErrors.preferred_type}
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="settings-min-budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Minimum Budget</label>
                            <div className="relative">
                                <PoundSterling size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    id="settings-min-budget"
                                    type="number"
                                    min="0"
                                    value={settings.min_budget ?? ''}
                                    onChange={(e) => handleNumberChange('min_budget', e.target.value)}
                                    aria-invalid={preferenceErrors.min_budget ? 'true' : 'false'}
                                    aria-describedby={preferenceErrors.min_budget ? 'settings-min-budget-error' : undefined}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100"
                                    placeholder="0"
                                />
                            </div>
                            {preferenceErrors.min_budget && (
                                <p id="settings-min-budget-error" role="alert" className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
                                    {preferenceErrors.min_budget}
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="settings-max-budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Maximum Budget</label>
                            <div className="relative">
                                <PoundSterling size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    id="settings-max-budget"
                                    type="number"
                                    min="0"
                                    value={settings.max_budget ?? ''}
                                    onChange={(e) => handleNumberChange('max_budget', e.target.value)}
                                    aria-invalid={preferenceErrors.max_budget ? 'true' : 'false'}
                                    aria-describedby={preferenceErrors.max_budget ? 'settings-max-budget-error' : undefined}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100"
                                    placeholder="0"
                                />
                            </div>
                            {preferenceErrors.max_budget && (
                                <p id="settings-max-budget-error" role="alert" className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
                                    {preferenceErrors.max_budget}
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="settings-min-bedrooms" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Minimum Bedrooms</label>
                            <div className="relative">
                                <BedDouble size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    id="settings-min-bedrooms"
                                    type="number"
                                    min="0"
                                    value={settings.min_bedrooms ?? ''}
                                    onChange={(e) => handleNumberChange('min_bedrooms', e.target.value)}
                                    aria-invalid={preferenceErrors.min_bedrooms ? 'true' : 'false'}
                                    aria-describedby={preferenceErrors.min_bedrooms ? 'settings-min-bedrooms-error' : undefined}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100"
                                    placeholder="0"
                                />
                            </div>
                            {preferenceErrors.min_bedrooms && (
                                <p id="settings-min-bedrooms-error" role="alert" className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
                                    {preferenceErrors.min_bedrooms}
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="settings-max-bedrooms" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Maximum Bedrooms</label>
                            <div className="relative">
                                <BedDouble size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    id="settings-max-bedrooms"
                                    type="number"
                                    min="0"
                                    value={settings.max_bedrooms ?? ''}
                                    onChange={(e) => handleNumberChange('max_bedrooms', e.target.value)}
                                    aria-invalid={preferenceErrors.max_bedrooms ? 'true' : 'false'}
                                    aria-describedby={preferenceErrors.max_bedrooms ? 'settings-max-bedrooms-error' : undefined}
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100"
                                    placeholder="0"
                                />
                            </div>
                            {preferenceErrors.max_bedrooms && (
                                <p id="settings-max-bedrooms-error" role="alert" className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
                                    {preferenceErrors.max_bedrooms}
                                </p>
                            )}
                        </div>

                        <div className="md:col-span-2">
                            <label htmlFor="settings-search-radius" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Search Radius (km)</label>
                            <input
                                id="settings-search-radius"
                                type="number"
                                min="0"
                                value={settings.search_radius_km ?? ''}
                                onChange={(e) => handleNumberChange('search_radius_km', e.target.value)}
                                aria-invalid={preferenceErrors.search_radius_km ? 'true' : 'false'}
                                aria-describedby={preferenceErrors.search_radius_km ? 'settings-search-radius-error' : undefined}
                                className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100"
                                placeholder="25"
                            />
                            {preferenceErrors.search_radius_km && (
                                <p id="settings-search-radius-error" role="alert" className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
                                    {preferenceErrors.search_radius_km}
                                </p>
                            )}
                        </div>
                    </div>
                </section>

                <section className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
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
                                type="button"
                                role="switch"
                                aria-label="Toggle onboarding complete"
                                aria-checked={settings.onboarding_done}
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
