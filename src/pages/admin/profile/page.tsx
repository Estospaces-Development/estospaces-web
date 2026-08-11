"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { User, Mail, Phone, MapPin, Camera, Save, Loader2, CheckCircle, Hash, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/services/userService';
import { useToast } from '@/contexts/ToastContext';
import { uploadMediaFile } from '@/services/mediaService';
import { resolveMediaUrl } from '@/lib/mediaUrls';
import { type ProfileNameErrors, validateProfileNameFields } from '@/lib/profileValidation';
import {
    getLaunchLocationCodeLabel,
    getLaunchLocationCodePlaceholder,
} from '@/lib/launchLocale';
import { useUserGeoMarket } from '@/lib/useGeoMarket';

export default function AdminProfilePage() {
    const { user, refreshUser } = useAuth();
    const { error: showToastError, success: showToastSuccess } = useToast();

    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isSaved, setIsSaved] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<ProfileNameErrors>({});
    const [profileLoadError, setProfileLoadError] = useState<string | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
    const [_isUploadingAvatar, _setIsUploadingAvatar] = useState(false);
    const [_isRemovingAvatar, _setIsRemovingAvatar] = useState(false);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        postcode: '',
        bio: '',
    });
    const geoMarket = useUserGeoMarket(user, { locationCode: formData.postcode || user?.postcode });
    const locationCodeLabel = getLaunchLocationCodeLabel(geoMarket, undefined, formData.postcode);
    const locationCodePlaceholder = getLaunchLocationCodePlaceholder(geoMarket, undefined, formData.postcode);

    const loadAdminProfile = useCallback(async () => {
        if (!user) return;
        setIsInitialLoading(true);
        setProfileLoadError(null);
        try {
            const { data } = await userService.getProfile();
            const profileData = data || user;
            const nameParts = (profileData.name || '').split(' ');
            setFormData({
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                email: profileData.email || '',
                phone: profileData.phone || '',
                address: profileData.address || '',
                postcode: profileData.postcode || '',
                bio: profileData.user_metadata?.bio || '',
            });
            const existingAvatar = profileData.avatar_url || profileData.avatar || user.avatar_url || user.avatar || null;
            const resolvedAvatar = resolveMediaUrl(existingAvatar);
            setAvatarPreview(resolvedAvatar);
        } catch {
            // fallback to auth context data
            const nameParts = (user.name || '').split(' ');
            setFormData({
                firstName: nameParts[0] || '',
                lastName: nameParts.slice(1).join(' ') || '',
                email: user.email || '',
                phone: user.phone || '',
                address: user.address || '',
                postcode: user.postcode || '',
                bio: user.user_metadata?.bio || '',
            });
            const existingAvatar = user.avatar_url || user.avatar || null;
            setAvatarPreview(resolveMediaUrl(existingAvatar));
            setProfileLoadError('Could not load profile details — showing cached data.');
        } finally {
            setIsInitialLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            loadAdminProfile();
        }
    }, [user, loadAdminProfile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const nextValue = e.target.name === 'postcode'
            ? e.target.value.toUpperCase().replace(/\s+/g, ' ').slice(0, 8)
            : e.target.value;
        setFormData(prev => ({
            ...prev,
            [e.target.name]: nextValue
        }));
        if (e.target.name === 'firstName' || e.target.name === 'lastName') {
            setFieldErrors(prev => ({ ...prev, [e.target.name]: undefined }));
        }
        setIsSaved(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const nameErrors = validateProfileNameFields({
            firstName: formData.firstName,
            lastName: formData.lastName,
        });
        if (Object.keys(nameErrors).length > 0) {
            setFieldErrors(nameErrors);
            showToastError('Please correct the highlighted admin profile fields.');
            return;
        }

        setIsLoading(true);

        const payload: Record<string, unknown> = {
            first_name: formData.firstName,
            last_name: formData.lastName,
            phone: formData.phone,
            address: formData.address,
            postcode: formData.postcode,
            metadata: {
                bio: formData.bio,
                profile_type: 'admin'
            }
        };

        if (selectedAvatarFile && user?.id) {
            try {
                const uploaded = await uploadMediaFile(
                    selectedAvatarFile,
                    'user',
                    user.id,
                    `${formData.firstName} ${formData.lastName} admin profile photo`,
                    true,
                );
                payload.avatar_url = uploaded.file_url;
                setAvatarPreview(resolveMediaUrl(uploaded.file_url));
                setSelectedAvatarFile(null);
            } catch {
                showToastError('Failed to upload profile photo.');
                setIsLoading(false);
                return;
            }
        }

        const { data, error } = await userService.updateProfile(payload);

        if (data) {
            await new Promise(resolve => setTimeout(resolve, 800));
            await refreshUser();

            setIsSaved(true);
            showToastSuccess('Admin profile updated successfully');
            setTimeout(() => setIsSaved(false), 3000);
        } else {
            showToastError('Failed to update admin profile: ' + (error || 'Unknown error'));
        }
        setIsLoading(false);
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            showToastError('Please choose a valid image file.');
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            showToastError('Profile picture must be smaller than 5 MB.');
            return;
        }

        const reader = new FileReader();
        reader.onloadend = () => {
            setAvatarPreview(reader.result as string);
            setSelectedAvatarFile(file);
        };
        reader.readAsDataURL(file);
    };

    if (isInitialLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
            </div>
        );
    }

    if (profileLoadError) {
        return (
            <div className="max-w-4xl mx-auto space-y-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Shield className="text-blue-500" />
                    Admin Account Settings
                </h1>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">{profileLoadError}</p>
                </div>
                <button onClick={loadAdminProfile} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Retry</button>
            </div>
        );
    }

    const inputClass = "w-full px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100";
    const iconInputClass = "w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100";

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Shield className="text-blue-500" />
                    Admin Account Settings
                </h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col items-center text-center">
                        <div className="relative mb-4 group">
                            <div className="w-32 h-32 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-md overflow-hidden">
                                {avatarPreview ? (
                                    <img src={avatarPreview} alt="Admin profile" className="h-full w-full object-cover" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                                ) : (
                                    <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                                        {formData.firstName[0]}{formData.lastName[0]}
                                    </span>
                                )}
                            </div>
                            <button
                                type="button"
                                onClick={() => avatarInputRef.current?.click()}
                                className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                                aria-label="Change profile photo"
                            >
                                <Camera size={24} className="text-white" />
                            </button>
                            <input
                                ref={avatarInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleAvatarChange}
                                className="hidden"
                                aria-label="Upload profile photo"
                            />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{formData.firstName} {formData.lastName}</h2>
                        <p className="text-blue-600 dark:text-blue-400 text-sm font-medium mb-4 uppercase tracking-wider">System Administrator</p>

                        <div className="w-full pt-4 border-t border-gray-100 dark:border-gray-700">
                            <div className="text-xs text-gray-500 dark:text-gray-400 text-left space-y-2">
                                <p className="flex items-center gap-2"><Mail size={14} /> {formData.email}</p>
                                <p className="flex items-center gap-2"><Shield size={14} /> Full System Access</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                            <User size={20} className="text-blue-500" />
                            Security & Identity
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="admin-first-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">First Name</label>
                                    <input
                                        id="admin-first-name"
                                        type="text"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        aria-invalid={fieldErrors.firstName ? 'true' : 'false'}
                                        aria-describedby={fieldErrors.firstName ? 'admin-first-name-error' : undefined}
                                        className={inputClass}
                                    />
                                    {fieldErrors.firstName && (
                                        <p id="admin-first-name-error" role="alert" className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
                                            {fieldErrors.firstName}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label htmlFor="admin-last-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Last Name</label>
                                    <input
                                        id="admin-last-name"
                                        type="text"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        aria-invalid={fieldErrors.lastName ? 'true' : 'false'}
                                        aria-describedby={fieldErrors.lastName ? 'admin-last-name-error' : undefined}
                                        className={inputClass}
                                    />
                                    {fieldErrors.lastName && (
                                        <p id="admin-last-name-error" role="alert" className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
                                            {fieldErrors.lastName}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="admin-primary-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Primary Email</label>
                                    <div className="relative">
                                        <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input id="admin-primary-email" type="email" value={formData.email} disabled className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700/30 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed" />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="admin-work-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Work Phone</label>
                                    <div className="relative">
                                        <Phone size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input id="admin-work-phone" type="tel" name="phone" value={formData.phone} onChange={handleChange} className={iconInputClass} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2">
                                    <label htmlFor="admin-work-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Work Address</label>
                                    <div className="relative">
                                        <MapPin size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input id="admin-work-address" type="text" name="address" value={formData.address} onChange={handleChange} className={iconInputClass} />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="admin-postcode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{locationCodeLabel}</label>
                                    <div className="relative">
                                        <Hash size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input id="admin-postcode" type="text" name="postcode" value={formData.postcode} onChange={handleChange} placeholder={locationCodePlaceholder} className={iconInputClass} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                {isSaved && (
                                    <span role="status" aria-live="polite" className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400 animate-in fade-in">
                                        <CheckCircle size={16} />
                                        Saved Successfully
                                    </span>
                                )}
                                <button type="submit" disabled={isLoading} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors shadow-sm">
                                    {isLoading ? <><Loader2 size={18} className="animate-spin" /> Saving...</> : <><Save size={18} /> Save Admin Profile</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
