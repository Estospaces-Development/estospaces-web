"use client";

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Bell,
    ArrowLeft,
    Save,
    Loader2,
    Check,
    Search,
    SlidersHorizontal,
    ShieldAlert,
    MapPin,
    PoundSterling,
    BedDouble,
} from 'lucide-react';
import { getPreferences, updatePreferences, type UserPreferences } from '@/services/authService';
import { useToast } from '@/contexts/ToastContext';
import Toggle from '@/components/ui/Toggle';
import { type PreferencesValidationErrors, validateUserPreferences } from '@/lib/preferencesValidation';

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

type TabId = 'alerts' | 'search' | 'account';

export default function SettingsPage() {
    const navigate = useNavigate();
    const toast = useToast();

    const [isLoading, setIsLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [activeTab, setActiveTab] = useState<TabId>('alerts');
    const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
    const [preferenceErrors, setPreferenceErrors] = useState<PreferencesValidationErrors>({});

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                setIsLoading(true);
                const { data, error } = await getPreferences();
                if (error) throw new Error(error);
                if (data) {
                    setPreferences({
                        ...defaultPreferences,
                        ...data,
                    });
                }
            } catch (error: any) {
                toast.error('Failed to load settings');
            } finally {
                setIsLoading(false);
            }
        };

        fetchSettings();
    }, [toast]);

    const handleToggle = (key: 'notifications_enabled' | 'email_alerts' | 'onboarding_done') => {
        setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
        setSaveSuccess(false);
    };

    const handleTextChange = (key: 'preferred_city' | 'preferred_type', value: string) => {
        setPreferences((prev) => ({ ...prev, [key]: value }));
        setPreferenceErrors((prev) => ({ ...prev, [key]: undefined }));
        setSaveSuccess(false);
    };

    const handleNumberChange = (
        key: 'min_budget' | 'max_budget' | 'min_bedrooms' | 'max_bedrooms' | 'search_radius_km',
        value: string,
    ) => {
        setPreferences((prev) => ({
            ...prev,
            [key]: value === '' ? null : Number(value),
        }));
        setPreferenceErrors((prev) => ({ ...prev, [key]: undefined }));
        setSaveSuccess(false);
    };

    const handleSave = async () => {
        const errors = validateUserPreferences(preferences);
        if (Object.keys(errors).length > 0) {
            setPreferenceErrors(errors);
            toast.error('Please correct the highlighted preference fields.');
            return;
        }

        try {
            setSaving(true);
            const { error } = await updatePreferences(preferences);
            if (error) throw new Error(error);

            setSaveSuccess(true);
            toast.success('Settings updated successfully');
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error: any) {
            toast.error('Failed to save settings');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        void handleSave();
    };

    const openHelpRequest = (category: string, subject: string, message: string) => {
        const params = new URLSearchParams({
            category,
            subject,
            message,
        });
        navigate(`/user/dashboard/help?${params.toString()}`);
    };

    const tabs = [
        { id: 'alerts' as TabId, label: 'Alerts', icon: Bell },
        { id: 'search' as TabId, label: 'Search', icon: Search },
        { id: 'account' as TabId, label: 'Account', icon: ShieldAlert },
    ];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="mb-10">
                    <button
                        onClick={() => navigate('/user/dashboard')}
                        className="mb-6 flex items-center gap-2 text-gray-400 hover:text-orange-500 transition-all group"
                    >
                        <div className="p-2 rounded-xl group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20 transition-all">
                            <ArrowLeft size={18} />
                        </div>
                        <span className="font-bold text-sm">Dashboard</span>
                    </button>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Settings</h1>
                            <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
                                Manage the preferences backed by the current user settings API
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={handleSave}
                            onKeyDown={handleSaveKeyDown}
                            disabled={saving}
                            aria-label="Save user preference changes"
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
                                type="button"
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                aria-pressed={activeTab === tab.id}
                                className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl font-bold text-sm whitespace-nowrap transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-xl'
                                        : 'bg-white dark:bg-gray-800 text-gray-500 hover:text-gray-900 dark:hover:text-white'
                                }`}
                            >
                                <tab.icon size={18} className={activeTab === tab.id ? 'text-orange-500' : ''} />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="max-w-4xl space-y-8">
                    {activeTab === 'alerts' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none p-8">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-orange-500">
                                        <Bell size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Alert Preferences</h2>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">
                                            These switches map directly to `/api/v1/users/preferences`
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center justify-between py-5">
                                        <div className="pr-4">
                                            <p className="font-bold text-gray-900 dark:text-white">In-App Notifications</p>
                                            <p className="text-sm text-gray-500 font-medium mt-0.5">Enable dashboard notifications and alerts.</p>
                                        </div>
                                        <Toggle
                                            checked={preferences.notifications_enabled}
                                            onChange={() => handleToggle('notifications_enabled')}
                                            ariaLabel="Toggle in-app notifications"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between py-5 border-t dark:border-gray-800">
                                        <div className="pr-4">
                                            <p className="font-bold text-gray-900 dark:text-white">Email Alerts</p>
                                            <p className="text-sm text-gray-500 font-medium mt-0.5">Receive email updates for saved searches and activity.</p>
                                        </div>
                                        <Toggle
                                            checked={preferences.email_alerts}
                                            onChange={() => handleToggle('email_alerts')}
                                            ariaLabel="Toggle email alerts"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'search' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8">
                                <div className="flex items-center gap-4 mb-10">
                                    <SlidersHorizontal size={28} className="text-orange-500" />
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Search Defaults</h2>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Set the default filters stored in your profile.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label htmlFor="user-preferred-city" className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Preferred City</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                id="user-preferred-city"
                                                type="text"
                                                value={preferences.preferred_city}
                                                onChange={(e) => handleTextChange('preferred_city', e.target.value)}
                                                className="w-full bg-gray-50 dark:bg-gray-900/50 border dark:border-gray-700 rounded-2xl pl-12 pr-5 py-3.5 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-gray-900 dark:text-white"
                                                placeholder="London"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="user-preferred-type" className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Preferred Listing Type</label>
                                        <select
                                            id="user-preferred-type"
                                            value={preferences.preferred_type}
                                            onChange={(e) => handleTextChange('preferred_type', e.target.value)}
                                            aria-invalid={preferenceErrors.preferred_type ? 'true' : 'false'}
                                            aria-describedby={preferenceErrors.preferred_type ? 'user-preferred-type-error' : undefined}
                                            className="w-full bg-gray-50 dark:bg-gray-900/50 border dark:border-gray-700 rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-gray-900 dark:text-white"
                                        >
                                            <option value="">No default</option>
                                            <option value="rent">Rent</option>
                                            <option value="sale">Sale</option>
                                        </select>
                                        {preferenceErrors.preferred_type && (
                                            <p id="user-preferred-type-error" role="alert" className="px-1 text-sm font-medium text-red-600 dark:text-red-400">
                                                {preferenceErrors.preferred_type}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="user-min-budget" className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Minimum Budget</label>
                                        <div className="relative">
                                            <PoundSterling className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                id="user-min-budget"
                                                type="number"
                                                min="0"
                                                value={preferences.min_budget ?? ''}
                                                onChange={(e) => handleNumberChange('min_budget', e.target.value)}
                                                aria-invalid={preferenceErrors.min_budget ? 'true' : 'false'}
                                                aria-describedby={preferenceErrors.min_budget ? 'user-min-budget-error' : undefined}
                                                className="w-full bg-gray-50 dark:bg-gray-900/50 border dark:border-gray-700 rounded-2xl pl-12 pr-5 py-3.5 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-gray-900 dark:text-white"
                                                placeholder="0"
                                            />
                                        </div>
                                        {preferenceErrors.min_budget && (
                                            <p id="user-min-budget-error" role="alert" className="px-1 text-sm font-medium text-red-600 dark:text-red-400">
                                                {preferenceErrors.min_budget}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="user-max-budget" className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Maximum Budget</label>
                                        <div className="relative">
                                            <PoundSterling className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                id="user-max-budget"
                                                type="number"
                                                min="0"
                                                value={preferences.max_budget ?? ''}
                                                onChange={(e) => handleNumberChange('max_budget', e.target.value)}
                                                aria-invalid={preferenceErrors.max_budget ? 'true' : 'false'}
                                                aria-describedby={preferenceErrors.max_budget ? 'user-max-budget-error' : undefined}
                                                className="w-full bg-gray-50 dark:bg-gray-900/50 border dark:border-gray-700 rounded-2xl pl-12 pr-5 py-3.5 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-gray-900 dark:text-white"
                                                placeholder="0"
                                            />
                                        </div>
                                        {preferenceErrors.max_budget && (
                                            <p id="user-max-budget-error" role="alert" className="px-1 text-sm font-medium text-red-600 dark:text-red-400">
                                                {preferenceErrors.max_budget}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="user-min-bedrooms" className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Minimum Bedrooms</label>
                                        <div className="relative">
                                            <BedDouble className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                id="user-min-bedrooms"
                                                type="number"
                                                min="0"
                                                value={preferences.min_bedrooms ?? ''}
                                                onChange={(e) => handleNumberChange('min_bedrooms', e.target.value)}
                                                aria-invalid={preferenceErrors.min_bedrooms ? 'true' : 'false'}
                                                aria-describedby={preferenceErrors.min_bedrooms ? 'user-min-bedrooms-error' : undefined}
                                                className="w-full bg-gray-50 dark:bg-gray-900/50 border dark:border-gray-700 rounded-2xl pl-12 pr-5 py-3.5 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-gray-900 dark:text-white"
                                                placeholder="0"
                                            />
                                        </div>
                                        {preferenceErrors.min_bedrooms && (
                                            <p id="user-min-bedrooms-error" role="alert" className="px-1 text-sm font-medium text-red-600 dark:text-red-400">
                                                {preferenceErrors.min_bedrooms}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="user-max-bedrooms" className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Maximum Bedrooms</label>
                                        <div className="relative">
                                            <BedDouble className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                id="user-max-bedrooms"
                                                type="number"
                                                min="0"
                                                value={preferences.max_bedrooms ?? ''}
                                                onChange={(e) => handleNumberChange('max_bedrooms', e.target.value)}
                                                aria-invalid={preferenceErrors.max_bedrooms ? 'true' : 'false'}
                                                aria-describedby={preferenceErrors.max_bedrooms ? 'user-max-bedrooms-error' : undefined}
                                                className="w-full bg-gray-50 dark:bg-gray-900/50 border dark:border-gray-700 rounded-2xl pl-12 pr-5 py-3.5 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-gray-900 dark:text-white"
                                                placeholder="0"
                                            />
                                        </div>
                                        {preferenceErrors.max_bedrooms && (
                                            <p id="user-max-bedrooms-error" role="alert" className="px-1 text-sm font-medium text-red-600 dark:text-red-400">
                                                {preferenceErrors.max_bedrooms}
                                            </p>
                                        )}
                                    </div>

                                    <div className="space-y-2 md:col-span-2">
                                        <label htmlFor="user-search-radius" className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Search Radius (km)</label>
                                        <input
                                            id="user-search-radius"
                                            type="number"
                                            min="0"
                                            value={preferences.search_radius_km ?? ''}
                                            onChange={(e) => handleNumberChange('search_radius_km', e.target.value)}
                                            aria-invalid={preferenceErrors.search_radius_km ? 'true' : 'false'}
                                            aria-describedby={preferenceErrors.search_radius_km ? 'user-search-radius-error' : undefined}
                                            className="w-full bg-gray-50 dark:bg-gray-900/50 border dark:border-gray-700 rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-gray-900 dark:text-white"
                                            placeholder="25"
                                        />
                                        {preferenceErrors.search_radius_km && (
                                            <p id="user-search-radius-error" role="alert" className="px-1 text-sm font-medium text-red-600 dark:text-red-400">
                                                {preferenceErrors.search_radius_km}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'account' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-2xl text-orange-500">
                                        <ShieldAlert size={28} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Account Flags</h2>
                                        <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Pilot account controls, privacy requests, and support handoffs.</p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between py-5">
                                    <div className="pr-4">
                                        <p className="font-bold text-gray-900 dark:text-white">Onboarding Complete</p>
                                        <p className="text-sm text-gray-500 font-medium mt-0.5">Marks whether your guided setup flow is complete.</p>
                                    </div>
                                    <Toggle
                                        checked={preferences.onboarding_done}
                                        onChange={() => handleToggle('onboarding_done')}
                                        ariaLabel="Toggle onboarding complete"
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-3">
                                <button
                                    type="button"
                                    onClick={() => openHelpRequest(
                                        'General Inquiry',
                                        'Data export request',
                                        'Please prepare a pilot export of my account data, including verification documents, messages, case records, and audit-linked records.',
                                    )}
                                    className="rounded-3xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:border-orange-300 hover:bg-orange-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-orange-800 dark:hover:bg-orange-950/20"
                                >
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Request Data Export</h3>
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Open a prefilled support ticket for account and journey data export.</p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openHelpRequest(
                                        'General Inquiry',
                                        'Data deletion request',
                                        'Please review a deletion or retention request for my pilot account and advise what evidence must be retained for compliance and audit purposes.',
                                    )}
                                    className="rounded-3xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:border-orange-300 hover:bg-orange-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-orange-800 dark:hover:bg-orange-950/20"
                                >
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Request Data Deletion</h3>
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Start a privacy and retention review with the pilot operations team.</p>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => openHelpRequest(
                                        'General Inquiry',
                                        'Pilot support request',
                                        'I need help with a live pilot workflow, case status, compliance review, or account operation.',
                                    )}
                                    className="rounded-3xl border border-gray-200 bg-white p-6 text-left shadow-sm transition hover:border-orange-300 hover:bg-orange-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-orange-800 dark:hover:bg-orange-950/20"
                                >
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Contact Pilot Support</h3>
                                    <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Open the support centre with a prefilled pilot operations ticket.</p>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
