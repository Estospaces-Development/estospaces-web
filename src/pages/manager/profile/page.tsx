"use client";

import React, { useEffect, useRef, useState } from 'react';
import { User, Mail, Phone, MapPin, Building, Globe, Save, Loader2, CheckCircle, Upload, Hash, Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useManagerVerification } from '@/contexts/ManagerVerificationContext';
import { normalizeManagerServiceAreas } from '@/services/managerVerificationService';
import { uploadMediaFile } from '@/services/mediaService';
import { userService } from '@/services/userService';
import { getServiceUrl } from '@/lib/apiUtils';
import { type ProfileNameErrors, validateProfileNameFields } from '@/lib/profileValidation';
import {
    formatLaunchLocationCode,
    formatLaunchPropertyLocation,
    formatLaunchPropertyText,
    getLaunchLocationCodeLabel,
    getLaunchLocationCodePlaceholder,
    normalizeLaunchLocationCode,
} from '@/lib/launchLocale';
import { useUserGeoMarket } from '@/lib/useGeoMarket';

const MANAGER_LICENSE_MAX_LENGTH = 64;
const MANAGER_BIO_MAX_LENGTH = 1000;
const MANAGER_PHONE_MAX_LENGTH = 20;
const MANAGER_LICENSE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ._/-]*$/;
const MANAGER_PHONE_PATTERN = /^\+?[-0-9 ()]{7,20}$/;

type ManagerProfileFieldErrors = ProfileNameErrors & Partial<Record<'phone' | 'businessPhone' | 'licenseNumber' | 'companyAddress' | 'registeredOfficeAddress', string>>;

const formatOptionalLaunchPropertyLocation = (value?: string | null) => {
    const raw = String(value || '').trim();
    return raw ? formatLaunchPropertyLocation(raw) : '';
};

function RequiredFieldLabel({ children }: { children: React.ReactNode }) {
    return (
        <>
            {children}
            <span className="ml-1 text-red-600 dark:text-red-400" aria-hidden="true">*</span>
            <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-red-600 dark:bg-red-900/20 dark:text-red-300">
                Required
            </span>
        </>
    );
}

export default function ManagerProfilePage() {
    const { user, refreshUser, mergeCurrentUserProfile } = useAuth();
    const {
        managerProfile,
        verificationStatus,
        isVerified,
        propertySubmissionBlocker,
        isPropertySubmissionReady,
        refetch: refetchManagerData,
    } = useManagerVerification();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [fieldErrors, setFieldErrors] = useState<ManagerProfileFieldErrors>({});
    const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
    const [storedAvatarValue, setStoredAvatarValue] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [removingAvatar, setRemovingAvatar] = useState(false);
    const [companyAddressError, setCompanyAddressError] = useState('');
    const [confirmingAvatarRemoval, setConfirmingAvatarRemoval] = useState(false);
    const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
    const avatarInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        postcode: '',
        companyName: '',
        branchName: '',
        serviceAreas: '',
        dispatchPincodes: '',
        businessPhone: '',
        companyAddress: '',
        registeredOfficeAddress: '',
        complaintsContact: '',
        redressSchemeName: '',
        redressMembershipNumber: '',
        cmpProvider: '',
        cmpCertificateUrl: '',
        website: '',
        bio: '',
        licenseNumber: '',
        taxId: '',
    });
    const geoMarket = useUserGeoMarket(user, { locationCode: formData.postcode || user?.postcode });
    const locationCodeLabel = getLaunchLocationCodeLabel(geoMarket, undefined, formData.postcode);
    const locationCodePlaceholder = getLaunchLocationCodePlaceholder(geoMarket, undefined, formData.postcode);

    // Populate form from auth user + broker profile
    useEffect(() => {
        const nameParts = (user?.name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        setFormData(prev => ({
            ...prev,
            firstName,
            lastName,
            email: user?.email || '',
            phone: user?.phone || prev.phone || '',
            address: formatOptionalLaunchPropertyLocation(user?.address || prev.address || ''),
            postcode: formatLaunchLocationCode(user?.postcode || prev.postcode || ''),
            bio: managerProfile?.company_description || user?.user_metadata?.bio || prev.bio || '',
            website: user?.user_metadata?.website || prev.website || '',
            // Broker / manager fields
            companyName: managerProfile?.company_name || prev.companyName || '',
            branchName: formatLaunchPropertyText(managerProfile?.branch_name || prev.branchName || '', ''),
            serviceAreas: normalizeManagerServiceAreas(managerProfile?.service_areas).join(', ') || prev.serviceAreas || '',
            dispatchPincodes: Array.isArray(managerProfile?.dispatch_pincodes) ? managerProfile.dispatch_pincodes.join(', ') : prev.dispatchPincodes || '',
            businessPhone: managerProfile?.business_phone || prev.businessPhone || '',
            companyAddress: formatOptionalLaunchPropertyLocation(managerProfile?.company_address || prev.companyAddress || ''),
            registeredOfficeAddress: formatOptionalLaunchPropertyLocation(managerProfile?.registered_office_address || prev.registeredOfficeAddress || ''),
            complaintsContact: managerProfile?.complaints_contact || prev.complaintsContact || '',
            redressSchemeName: managerProfile?.redress_scheme_name || prev.redressSchemeName || '',
            redressMembershipNumber: managerProfile?.redress_membership_number || prev.redressMembershipNumber || '',
            cmpProvider: managerProfile?.cmp_provider || prev.cmpProvider || '',
            cmpCertificateUrl: managerProfile?.cmp_certificate_url || prev.cmpCertificateUrl || '',
            licenseNumber: managerProfile?.company_registration_number || managerProfile?.license_number || prev.licenseNumber || '',
            taxId: managerProfile?.tax_id || prev.taxId || '',
        }));
        const existingAvatar = user?.avatar_url || user?.avatar || null;
        const resolvedAvatar = (() => {
            const raw = existingAvatar;
            if (!raw || typeof raw !== 'string') return null;
            if (/^https?:\/\//i.test(raw)) return raw;
            if (raw.startsWith('/api/v1/media/')) {
                return `${getServiceUrl('media').replace(/\/$/, '')}${raw}`;
            }
            return raw;
        })();
        setProfileImagePreview(resolvedAvatar);
        setStoredAvatarValue(existingAvatar);
        setSelectedAvatarFile(null);
        setRemovingAvatar(false);
        setConfirmingAvatarRemoval(false);
    }, [user, managerProfile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const nextValue = (() => {
            if (e.target.name === 'postcode') {
                return normalizeLaunchLocationCode(e.target.value);
            }

            if (e.target.name === 'branchName') {
                return formatLaunchPropertyText(e.target.value, '');
            }

            if (e.target.name === 'serviceAreas' || e.target.name === 'dispatchPincodes') {
                return e.target.value.toUpperCase();
            }

            return e.target.value;
        })();

        setFormData(prev => ({
            ...prev,
            [e.target.name]: nextValue
        }));
        setIsSaved(false);
        setSaveError('');
        if (e.target.name === 'firstName' || e.target.name === 'lastName' || e.target.name === 'licenseNumber') {
            setFieldErrors(prev => ({ ...prev, [e.target.name]: undefined }));
        }

        if (e.target.name === 'companyAddress') {
            const trimmed = nextValue.trim();
            if (trimmed.length > 0) {
                setCompanyAddressError('');
            } else {
                setCompanyAddressError('Please enter your office or company address.');
            }
        }
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';

        if (!file) return;

        if (!file.type.startsWith('image/')) {
            setSaveError('Please choose a valid image file.');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setSaveError('Profile picture must be smaller than 5 MB.');
            return;
        }

        setUploadingImage(true);
        setSaveError('');
        setIsSaved(false);
        setRemovingAvatar(false);
        setConfirmingAvatarRemoval(false);

        const reader = new FileReader();
        reader.onloadend = () => {
            setProfileImagePreview(typeof reader.result === 'string' ? reader.result : null);
            setSelectedAvatarFile(file);
            setUploadingImage(false);
        };
        reader.onerror = () => {
            setUploadingImage(false);
            setSaveError('Failed to read the selected image.');
        };
        reader.readAsDataURL(file);
    };

    const openAvatarPicker = () => {
        if (uploadingImage || removingAvatar) {
            return;
        }
        setConfirmingAvatarRemoval(false);
        avatarInputRef.current?.click();
    };

    const handleRemoveAvatar = async () => {
        if (uploadingImage || removingAvatar || !(profileImagePreview || storedAvatarValue || selectedAvatarFile)) {
            return;
        }

        setRemovingAvatar(true);
        setConfirmingAvatarRemoval(false);
        setSaveError('');
        setIsSaved(false);

        try {
            const { data, error } = await userService.updateProfile({ avatar: '' });
            if (error) {
                throw new Error(error);
            }

            mergeCurrentUserProfile({ ...(data || {}), avatar: '', avatar_url: '' });
            setProfileImagePreview(null);
            setStoredAvatarValue(null);
            setSelectedAvatarFile(null);
            setIsSaved(true);
            setTimeout(() => {
                void refreshUser();
            }, 0);
            setTimeout(() => setIsSaved(false), 3000);
        } catch (err) {
            setSaveError((err as Error).message || 'Failed to remove your profile photo.');
        } finally {
            setRemovingAvatar(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const nameErrors = validateProfileNameFields({
            firstName: formData.firstName,
            lastName: formData.lastName,
        });
        const nextFieldErrors: ManagerProfileFieldErrors = { ...nameErrors };
        const phoneTrimmed = formData.phone.trim();
        if (phoneTrimmed && !MANAGER_PHONE_PATTERN.test(phoneTrimmed)) {
            nextFieldErrors.phone = 'Enter a valid phone number (7-20 digits, spaces, hyphens, parentheses, optional + prefix)';
        }
        const businessPhoneTrimmed = formData.businessPhone.trim();
        if (businessPhoneTrimmed && !MANAGER_PHONE_PATTERN.test(businessPhoneTrimmed)) {
            nextFieldErrors.businessPhone = 'Enter a valid phone number (7-20 digits, spaces, hyphens, parentheses, optional + prefix)';
        }
        if (!formData.licenseNumber.trim()) {
            nextFieldErrors.licenseNumber = managerProfile?.profile_type === 'company'
                ? 'Company registration number is required'
                : 'Broker license number is required';
        } else if (!MANAGER_LICENSE_PATTERN.test(formData.licenseNumber)) {
            nextFieldErrors.licenseNumber = 'License number must start with a letter or number and contain only letters, numbers, spaces, dots, slashes, hyphens, and underscores';
        }
        const companyAddressTrimmed = formData.companyAddress.trim();
        const registeredOfficeAddressTrimmed = formData.registeredOfficeAddress.trim();
        if (!companyAddressTrimmed) {
            nextFieldErrors.companyAddress = managerProfile?.profile_type === 'company'
                ? 'Company address is required'
                : 'Office address is required';
        }
        if (!registeredOfficeAddressTrimmed) {
            nextFieldErrors.registeredOfficeAddress = 'Registered office address is required';
        }
        if (Object.keys(nextFieldErrors).length > 0) {
            setFieldErrors(nextFieldErrors);
            setSaveError('Please correct the highlighted profile fields.');
            return;
        }

        setIsLoading(true);
        setSaveError('');
        
        try {
            const isManager = user?.role === 'manager' || user?.role === 'broker';
            const fullName = `${formData.firstName} ${formData.lastName}`.trim();
            const companyName = formData.companyName.trim();
            const businessPhone = formData.businessPhone.trim();
            const companyAddress = formData.companyAddress.trim();
            const registeredOfficeAddress = formData.registeredOfficeAddress.trim();
            const serviceAreas = normalizeManagerServiceAreas(formData.serviceAreas);
            const dispatchPincodes = formData.dispatchPincodes.split(',').map((s: string) => s.trim().toUpperCase()).filter(Boolean);
            const isBrokerProfile = managerProfile?.profile_type !== 'company';
            let avatarValue = storedAvatarValue?.startsWith('data:') ? undefined : storedAvatarValue || undefined;

            if (selectedAvatarFile && user?.id) {
                const uploadedAvatar = await uploadMediaFile(
                    selectedAvatarFile,
                    'user',
                    user.id,
                    `${fullName || 'Manager'} profile photo`,
                    true,
                );
                avatarValue = uploadedAvatar.file_url;
            }
            
            const payload: any = {
                first_name: formData.firstName,
                last_name: formData.lastName,
                phone: formData.phone,
                address: formData.address,
                postcode: formData.postcode,
                avatar: avatarValue,
                metadata: {
                    bio: formData.bio,
                    website: formData.website,
                    profile_type: isManager ? 'company' : 'individual'
                }
            };

            if (isManager) {
                payload.broker_settings = {
                    company_name: companyName || (isBrokerProfile ? fullName : ''),
                    branch_name: formData.branchName,
                    company_description: formData.bio,
                    company_reg_number: formData.licenseNumber,
                    business_phone: businessPhone || formData.phone.trim(),
                    company_address: companyAddress || formData.address.trim(),
                    registered_office_address: registeredOfficeAddress || companyAddress || formData.address.trim(),
                    service_areas: JSON.stringify(serviceAreas),
                    dispatch_pincodes: JSON.stringify(Array.isArray(formData.dispatchPincodes) ? formData.dispatchPincodes : []),
                    complaints_contact: formData.complaintsContact,
                    redress_scheme_name: formData.redressSchemeName,
                    redress_membership_number: formData.redressMembershipNumber,
                    cmp_provider: formData.cmpProvider,
                    cmp_certificate_url: formData.cmpCertificateUrl,
                    tax_id: formData.taxId,
                };
            }

            const { data, error } = await userService.updateProfile(payload);
            
            if (error) {
                throw new Error(error);
            }

            if (data) {
                mergeCurrentUserProfile(data);
            }

            const savedAvatar = avatarValue || (user?.avatar_url || user?.avatar || null) || null;
            const resolvedSavedAvatar = (() => {
                const raw = savedAvatar;
                if (!raw || typeof raw !== 'string') return null;
                if (/^https?:\/\//i.test(raw)) return raw;
                if (raw.startsWith('/api/v1/media/')) {
                    return `${getServiceUrl('media').replace(/\/$/, '')}${raw}`;
                }
                return raw;
            })();
            setProfileImagePreview(resolvedSavedAvatar);
            setStoredAvatarValue(savedAvatar);
            setSelectedAvatarFile(null);
            setIsSaved(true);
            setTimeout(() => {
                void refreshUser();
                if (isManager) {
                    void refetchManagerData();
                }
            }, 0);
            setTimeout(() => setIsSaved(false), 3000);
        } catch (err) {
            setSaveError((err as Error).message || 'Failed to update your profile.');
        } finally {
            setIsLoading(false);
        }
    };

    const statusLabel = isVerified
        ? (isPropertySubmissionReady ? 'Ready' : 'Profile incomplete')
        : (verificationStatus || 'Pending');
    const statusColor = isVerified && isPropertySubmissionReady
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
        : isVerified
            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';

    const inputClass = "w-full px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100";
    const iconInputClass = "w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100";
    const missingRequiredFields = [
        !formData.firstName.trim() ? 'First name' : '',
        !formData.lastName.trim() ? 'Last name' : '',
        !formData.licenseNumber.trim() ? (managerProfile?.profile_type === 'company' ? 'Company registration number' : 'Broker license number') : '',
        !formData.companyAddress.trim() ? 'Office / Company address' : '',
        !formData.registeredOfficeAddress.trim() ? 'Registered office address' : '',
    ].filter(Boolean);
    const saveDisabledReason = missingRequiredFields.length > 0
        ? `Complete required fields: ${missingRequiredFields.join(', ')}.`
        : uploadingImage
            ? 'Wait for the selected profile photo to finish preparing.'
            : removingAvatar
                ? 'Profile photo removal is being saved.'
                : '';
    const requiredHelpId = saveDisabledReason ? 'manager-profile-required-help' : undefined;
    const getRequiredDescribedBy = (errorId?: string) => [errorId, requiredHelpId].filter(Boolean).join(' ') || undefined;
    const saveDisabled = isLoading
        || uploadingImage
        || removingAvatar
        || !formData.firstName.trim()
        || !formData.lastName.trim()
        || !formData.licenseNumber.trim()
        || !formData.companyAddress.trim()
        || !formData.registeredOfficeAddress.trim();

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                        <User className="text-orange-500" />
                        Manager Profile
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your professional profile and company details.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile Card */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex flex-col items-center text-center overflow-hidden">
                        <div className="mb-4 flex flex-col items-center gap-3">
                            <button
                                type="button"
                                onClick={openAvatarPicker}
                                disabled={uploadingImage || removingAvatar}
                                className="group relative rounded-full focus:outline-none focus:ring-4 focus:ring-orange-200 dark:focus:ring-orange-900/40 disabled:cursor-wait"
                                aria-label="Upload manager profile picture"
                            >
                                <div className="w-32 h-32 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-md overflow-hidden transition-transform duration-200 group-hover:scale-[1.02]">
                                    {profileImagePreview ? (
                                        <img
                                            src={profileImagePreview}
                                            alt={`${formData.firstName} ${formData.lastName}`.trim() || 'Manager profile'}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <span className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                                            {(formData.firstName[0] || 'M')}{(formData.lastName[0] || 'P')}
                                        </span>
                                    )}
                                    {(uploadingImage || removingAvatar) && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/45">
                                            <Loader2 className="h-7 w-7 animate-spin text-white" />
                                        </div>
                                    )}
                                    <div className="absolute bottom-2 right-2 flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg transition-all duration-200 group-hover:bg-orange-600">
                                        <Upload size={18} />
                                    </div>
                                </div>
                            </button>
                            <button
                                type="button"
                                onClick={openAvatarPicker}
                                disabled={uploadingImage || removingAvatar}
                                className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600 transition-colors hover:bg-orange-100 disabled:cursor-wait disabled:opacity-70 dark:border-orange-900/40 dark:bg-orange-900/20 dark:text-orange-300 dark:hover:bg-orange-900/30"
                            >
                                {uploadingImage || removingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload size={16} />}
                                {uploadingImage ? 'Preparing image...' : removingAvatar ? 'Removing photo...' : 'Upload profile photo'}
                            </button>
                            {(profileImagePreview || storedAvatarValue || selectedAvatarFile) && (
                                <div className="flex w-full max-w-xs flex-col items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setConfirmingAvatarRemoval(true)}
                                        disabled={uploadingImage || removingAvatar || isLoading}
                                        className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:cursor-wait disabled:opacity-70 dark:border-red-900/50 dark:bg-gray-800 dark:text-red-300 dark:hover:bg-red-900/20"
                                        aria-label="Remove manager profile photo"
                                        aria-expanded={confirmingAvatarRemoval}
                                    >
                                        {removingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={16} />}
                                        {removingAvatar ? 'Removing photo...' : 'Remove photo'}
                                    </button>
                                    {confirmingAvatarRemoval && (
                                        <div className="w-full rounded-lg border border-red-200 bg-red-50 p-3 text-left text-sm text-red-800 shadow-sm dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
                                            <p className="font-semibold">Remove profile photo?</p>
                                            <p className="mt-1 text-xs text-red-700 dark:text-red-300">This restores your default initials avatar.</p>
                                            <div className="mt-3 flex flex-wrap gap-2">
                                                <button
                                                    type="button"
                                                    onClick={handleRemoveAvatar}
                                                    disabled={removingAvatar || isLoading}
                                                    className="inline-flex items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:cursor-wait disabled:opacity-70"
                                                    aria-label="Confirm remove manager profile photo"
                                                >
                                                    {removingAvatar ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 size={14} />}
                                                    Remove now
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setConfirmingAvatarRemoval(false)}
                                                    disabled={removingAvatar}
                                                    className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-wait disabled:opacity-70 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            <input
                                id="manager-avatar-upload"
                                type="file"
                                name="manager-avatar"
                                aria-label="Upload manager profile photo"
                                className="hidden"
                                accept="image/*"
                                ref={avatarInputRef}
                                onChange={handleImageSelect}
                            />
                        </div>
                        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
                            Click the profile image to upload a JPG, PNG, or WebP under 5 MB.
                        </p>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{formData.firstName} {formData.lastName}</h2>
                        <p className="text-orange-600 dark:text-orange-400 font-medium text-sm mb-1">
                            {isVerified
                                ? (isPropertySubmissionReady ? 'Verified Manager' : 'Approved Manager')
                                : 'Manager'}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{formData.companyName || 'No company set'}</p>
                        {formData.address && (
                            <p className="text-gray-400 dark:text-gray-500 text-xs flex items-center gap-1 justify-center">
                                <MapPin size={12} /> {formatLaunchPropertyLocation([
                                    formData.address,
                                    formData.postcode || undefined,
                                ])}
                            </p>
                        )}

                        <div className="w-full pt-4 border-t border-gray-100 dark:border-gray-700 mt-4">
                            <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-gray-500 dark:text-gray-400">Verification Status</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                                    {statusLabel}
                                </span>
                            </div>
                        </div>
                    </div>

                    {isVerified && !isPropertySubmissionReady && propertySubmissionBlocker && (
                        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4">
                            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Profile action required</p>
                            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">{propertySubmissionBlocker}</p>
                        </div>
                    )}

                    {/* Account Status */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Account Status</h3>
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Member Since</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {managerProfile?.created_at
                                        ? new Date(managerProfile.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' })
                                        : 'N/A'}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Role</p>
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">
                                    {user?.role || 'Manager'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Edit Form */}
                <div className="lg:col-span-2">
                    <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 space-y-6">

                        {/* Personal Details */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                                <User size={18} className="text-orange-500" />
                                Personal Information
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="manager-first-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        <RequiredFieldLabel>First Name</RequiredFieldLabel>
                                    </label>
                                    <input id="manager-first-name" type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                                        required
                                        maxLength={80}
                                        aria-invalid={fieldErrors.firstName ? 'true' : 'false'}
                                        aria-describedby={getRequiredDescribedBy(fieldErrors.firstName ? 'manager-first-name-error' : undefined)}
                                        className={inputClass} />
                                    {fieldErrors.firstName && (
                                        <p id="manager-first-name-error" role="alert" className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
                                            {fieldErrors.firstName}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label htmlFor="manager-last-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        <RequiredFieldLabel>Last Name</RequiredFieldLabel>
                                    </label>
                                    <input id="manager-last-name" type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                                        required
                                        maxLength={80}
                                        aria-invalid={fieldErrors.lastName ? 'true' : 'false'}
                                        aria-describedby={getRequiredDescribedBy(fieldErrors.lastName ? 'manager-last-name-error' : undefined)}
                                        className={inputClass} />
                                    {fieldErrors.lastName && (
                                        <p id="manager-last-name-error" role="alert" className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
                                            {fieldErrors.lastName}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <label htmlFor="manager-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input id="manager-email" type="email" name="email" value={formData.email} disabled
                                            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700/30 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed" />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed directly for security.</p>
                                </div>
                                <div>
                                    <label htmlFor="manager-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone Number</label>
                                    <div className="relative">
                                        <Phone size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input id="manager-phone" type="tel" name="phone" value={formData.phone} onChange={handleChange}
                                            maxLength={MANAGER_PHONE_MAX_LENGTH}
                                            placeholder="+91 98765 43210"
                                            className={iconInputClass} />
                                        {fieldErrors.phone && (
                                            <p id="manager-phone-error" role="alert" className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
                                                {fieldErrors.phone}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="manager-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Home / Location Address</label>
                                    <div className="relative">
                                        <MapPin size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input id="manager-address" type="text" name="address" value={formData.address} onChange={handleChange}
                                            placeholder="123 Example Street, Chennai"
                                            className={iconInputClass} />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="manager-postcode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{locationCodeLabel}</label>
                                    <div className="relative">
                                        <Hash size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input id="manager-postcode" type="text" name="postcode" value={formData.postcode} onChange={handleChange}
                                            inputMode="text"
                                            pattern="[A-Za-z0-9 ]*"
                                            maxLength={8}
                                            placeholder={locationCodePlaceholder}
                                            className={iconInputClass} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <hr className="border-gray-100 dark:border-gray-700" />

                        {/* Company / Professional Details */}
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                                <Building size={18} className="text-blue-500" />
                                Professional Details
                            </h3>
                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="manager-company-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            <RequiredFieldLabel>Company Name</RequiredFieldLabel>
                                        </label>
                                        <div className="relative">
                                            <Building size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                            <input id="manager-company-name" type="text" name="companyName" value={formData.companyName} onChange={handleChange}
                                                required
                                                placeholder="Acme Properties Ltd"
                                                className={iconInputClass} />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="manager-business-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Business Phone</label>
                                        <div className="relative">
                                            <Phone size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                            <input id="manager-business-phone" type="tel" name="businessPhone" value={formData.businessPhone} onChange={handleChange}
                                                maxLength={MANAGER_PHONE_MAX_LENGTH}
                                                placeholder="+91 44 0000 0000"
                                                className={iconInputClass} />
                                            {fieldErrors.businessPhone && (
                                                <p id="manager-business-phone-error" role="alert" className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
                                                    {fieldErrors.businessPhone}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="manager-branch-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Branch Name</label>
                                        <input id="manager-branch-name" type="text" name="branchName" value={formData.branchName} onChange={handleChange}
                                            placeholder="Chennai Branch"
                                            className={inputClass} />
                                    </div>
                                    <div>
                                        <label htmlFor="manager-license-number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                            <RequiredFieldLabel>License / Reg Number</RequiredFieldLabel>
                                        </label>
                                        <input id="manager-license-number" type="text" name="licenseNumber" value={formData.licenseNumber} onChange={handleChange}
                                            required
                                            maxLength={MANAGER_LICENSE_MAX_LENGTH}
                                            placeholder="REG123456"
                                            aria-invalid={fieldErrors.licenseNumber ? 'true' : 'false'}
                                            aria-describedby={getRequiredDescribedBy(fieldErrors.licenseNumber ? 'manager-license-number-error' : undefined)}
                                            className={inputClass} />
                                        {fieldErrors.licenseNumber && (
                                            <p id="manager-license-number-error" role="alert" className="mt-1 text-sm font-medium text-red-600 dark:text-red-400">
                                                {fieldErrors.licenseNumber}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label htmlFor="manager-tax-id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tax ID</label>
                                        <input id="manager-tax-id" type="text" name="taxId" value={formData.taxId} onChange={handleChange}
                                            placeholder="GSTIN or local tax ID"
                                            className={inputClass} />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="manager-service-areas" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Dispatch service areas</label>
                                    <textarea id="manager-service-areas" name="serviceAreas" value={formData.serviceAreas} onChange={handleChange} rows={2}
                                        placeholder="600001, 600, SW1A"
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100 resize-none" />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        Add exact PIN codes or postcodes, or area prefixes, for live requests.
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="manager-dispatch-pincodes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Dispatch pincodes / postcodes</label>
                                    <textarea id="manager-dispatch-pincodes" name="dispatchPincodes" value={formData.dispatchPincodes} onChange={handleChange} rows={2}
                                        placeholder="SW1A 1AA, 600001"
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100 resize-none" />
                                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                        Exact pincodes or postcodes where you want to receive Fast Track leads first.
                                    </p>
                                </div>

                                <div>
                                    <label htmlFor="manager-website" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Website</label>
                                    <div className="relative">
                                        <Globe size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input id="manager-website" type="url" name="website" value={formData.website} onChange={handleChange}
                                            placeholder="https://yourcompany.in"
                                            className={iconInputClass} />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="manager-company-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                                        <RequiredFieldLabel>Office / Company Address</RequiredFieldLabel>
                                    </label>
                                    <div className="relative">
                                        <MapPin size={16} className="absolute left-3 top-[14px] text-gray-400" />
                                        <textarea id="manager-company-address" name="companyAddress" value={formData.companyAddress} onChange={handleChange} rows={2}
                                            required
                                            placeholder="1 Office Road, Chennai, 600001"
                                            className={`w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border ${companyAddressError ? 'border-red-400 dark:border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600 focus:ring-orange-500'} rounded-lg focus:outline-none focus:ring-2 text-gray-900 dark:text-gray-100 resize-none`} />
                                    </div>
                                    {companyAddressError && (
                                        <p role="alert" className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{companyAddressError}</p>
                                    )}
                                </div>

                                <div>
                                    <label htmlFor="manager-registered-office-address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Registered Office Address</label>
                                    <div className="relative">
                                        <MapPin size={16} className="absolute left-3 top-[14px] text-gray-400" />
                                        <textarea id="manager-registered-office-address" name="registeredOfficeAddress" value={formData.registeredOfficeAddress} onChange={handleChange} rows={2}
                                            placeholder="Registered office or branch legal address"
                                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100 resize-none" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="manager-complaints-contact" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Complaints Contact</label>
                                        <div className="relative">
                                            <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                            <input id="manager-complaints-contact" type="text" name="complaintsContact" value={formData.complaintsContact} onChange={handleChange}
                                            placeholder="complaints@agency.in"
                                            className={iconInputClass} />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="manager-redress-scheme" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Redress Scheme</label>
                                        <input id="manager-redress-scheme" type="text" name="redressSchemeName" value={formData.redressSchemeName} onChange={handleChange}
                                            placeholder="The Property Ombudsman"
                                            className={inputClass} />
                                    </div>
                                    <div>
                                        <label htmlFor="manager-redress-membership-number" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Redress Membership Number</label>
                                        <input id="manager-redress-membership-number" type="text" name="redressMembershipNumber" value={formData.redressMembershipNumber} onChange={handleChange}
                                            placeholder="TPO-123456"
                                            className={inputClass} />
                                    </div>
                                    <div>
                                        <label htmlFor="manager-cmp-provider" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">CMP Provider</label>
                                        <input id="manager-cmp-provider" type="text" name="cmpProvider" value={formData.cmpProvider} onChange={handleChange}
                                            placeholder="Client money protection provider"
                                            className={inputClass} />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="manager-cmp-certificate-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">CMP Certificate URL</label>
                                    <input id="manager-cmp-certificate-url" type="url" name="cmpCertificateUrl" value={formData.cmpCertificateUrl} onChange={handleChange}
                                        placeholder="https://..."
                                        className={inputClass} />
                                </div>

                                <div>
                                    <label htmlFor="manager-business-bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Business Bio</label>
                                    <textarea id="manager-business-bio" name="bio" value={formData.bio} onChange={handleChange} rows={4}
                                        maxLength={MANAGER_BIO_MAX_LENGTH}
                                        placeholder="Tell clients about your company, specialties, and experience..."
                                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100 resize-none" />
                                </div>
                            </div>
                        </div>

                        {saveError && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
                                {saveError}
                            </div>
                        )}

                        {saveDisabledReason && (
                            <div id="manager-profile-required-help" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                                <span>{saveDisabledReason}</span>
                            </div>
                        )}

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                            {isSaved && (
                                <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400 animate-in fade-in">
                                    <CheckCircle size={16} />
                                    Profile Updated
                                </span>
                            )}
                            <button type="submit" disabled={saveDisabled} aria-describedby={requiredHelpId}
                                className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors shadow-sm">
                                {isLoading ? (
                                    <><Loader2 size={18} className="animate-spin" /> Saving...</>
                                ) : uploadingImage ? (
                                    <><Loader2 size={18} className="animate-spin" /> Preparing image...</>
                                ) : (
                                    <><Save size={18} /> Save Changes</>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
