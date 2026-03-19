"use client";

import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Building, Globe, Save, Loader2, CheckCircle, Upload, Hash } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useManagerVerification } from '@/contexts/ManagerVerificationContext';
import { userService } from '@/services/userService';

export default function ManagerProfilePage() {
    const { user, refreshUser } = useAuth();
    const { managerProfile, verificationStatus, isVerified, refetch: refetchManagerData } = useManagerVerification();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [saveError, setSaveError] = useState('');

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        postcode: '',
        companyName: '',
        businessPhone: '',
        companyAddress: '',
        website: '',
        bio: '',
        licenseNumber: '',
        taxId: '',
    });

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
            address: user?.address || prev.address || '',
            postcode: user?.postcode || prev.postcode || '',
            bio: managerProfile?.company_description || user?.user_metadata?.bio || prev.bio || '',
            website: user?.user_metadata?.website || prev.website || '',
            // Broker / manager fields
            companyName: managerProfile?.company_name || prev.companyName || '',
            businessPhone: managerProfile?.business_phone || prev.businessPhone || '',
            companyAddress: managerProfile?.company_address || prev.companyAddress || '',
            licenseNumber: managerProfile?.company_registration_number || managerProfile?.license_number || prev.licenseNumber || '',
            taxId: managerProfile?.tax_id || prev.taxId || '',
        }));
    }, [user, managerProfile]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
        setIsSaved(false);
        setSaveError('');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setSaveError('');
        
        try {
            const isManager = user?.role === 'manager' || user?.role === 'broker';
            
            const payload: any = {
                first_name: formData.firstName,
                last_name: formData.lastName,
                phone: formData.phone,
                address: formData.address,
                postcode: formData.postcode,
                metadata: {
                    bio: formData.bio,
                    website: formData.website,
                    profile_type: isManager ? 'company' : 'individual'
                }
            };

            if (isManager) {
                payload.broker_settings = {
                    company_name: formData.companyName,
                    company_description: formData.bio,
                    company_reg_number: formData.licenseNumber,
                    business_phone: formData.businessPhone,
                    company_address: formData.companyAddress,
                    tax_id: formData.taxId,
                };
            }

            const { data, error } = await userService.updateProfile(payload);
            
            if (error) {
                throw new Error(error);
            }

            // Short delay to ensure DB persistence before refresh
            await new Promise(resolve => setTimeout(resolve, 800));

            // Refresh contexts to reflect changes instantly
            await refreshUser();
            if (isManager) {
                await refetchManagerData();
            }

            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 3000);
        } catch (err) {
            setSaveError((err as Error).message || 'Failed to update your profile.');
        } finally {
            setIsLoading(false);
        }
    };

    const statusLabel = isVerified ? 'Active' : (verificationStatus || 'Pending');
    const statusColor = isVerified
        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';

    const inputClass = "w-full px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100";
    const iconInputClass = "w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100";

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
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex flex-col items-center text-center">
                        <div className="relative mb-4 group cursor-pointer">
                            <div className="w-32 h-32 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-md overflow-hidden">
                                <span className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                                    {(formData.firstName[0] || 'M')}{(formData.lastName[0] || 'P')}
                                </span>
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Upload className="text-white" size={24} />
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{formData.firstName} {formData.lastName}</h2>
                        <p className="text-orange-600 dark:text-orange-400 font-medium text-sm mb-1">
                            {isVerified ? 'Verified Manager' : 'Manager'}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{formData.companyName || 'No company set'}</p>
                        {formData.address && (
                            <p className="text-gray-400 dark:text-gray-500 text-xs flex items-center gap-1 justify-center">
                                <MapPin size={12} /> {formData.address}{formData.postcode ? `, ${formData.postcode}` : ''}
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
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">First Name</label>
                                    <input type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                                        className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Last Name</label>
                                    <input type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                                        className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email</label>
                                    <div className="relative">
                                        <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input type="email" name="email" value={formData.email} disabled
                                            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700/30 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed" />
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed directly for security.</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone Number</label>
                                    <div className="relative">
                                        <Phone size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange}
                                            placeholder="+44 7700 000000"
                                            className={iconInputClass} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Home / Location Address</label>
                                    <div className="relative">
                                        <MapPin size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input type="text" name="address" value={formData.address} onChange={handleChange}
                                            placeholder="123 Example Street, London"
                                            className={iconInputClass} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Postcode</label>
                                    <div className="relative">
                                        <Hash size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input type="text" name="postcode" value={formData.postcode} onChange={handleChange}
                                            placeholder="SW1A 1AA"
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
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Company Name</label>
                                        <div className="relative">
                                            <Building size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                            <input type="text" name="companyName" value={formData.companyName} onChange={handleChange}
                                                placeholder="Acme Properties Ltd"
                                                className={iconInputClass} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Business Phone</label>
                                        <div className="relative">
                                            <Phone size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                            <input type="tel" name="businessPhone" value={formData.businessPhone} onChange={handleChange}
                                                placeholder="+44 20 0000 0000"
                                                className={iconInputClass} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">License / Reg Number</label>
                                        <input type="text" name="licenseNumber" value={formData.licenseNumber} onChange={handleChange}
                                            placeholder="REG123456"
                                            className={inputClass} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Tax ID</label>
                                        <input type="text" name="taxId" value={formData.taxId} onChange={handleChange}
                                            placeholder="GB123456789"
                                            className={inputClass} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Website</label>
                                    <div className="relative">
                                        <Globe size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input type="url" name="website" value={formData.website} onChange={handleChange}
                                            placeholder="https://yourcompany.co.uk"
                                            className={iconInputClass} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Office / Company Address</label>
                                    <div className="relative">
                                        <MapPin size={16} className="absolute left-3 top-[14px] text-gray-400" />
                                        <textarea name="companyAddress" value={formData.companyAddress} onChange={handleChange} rows={2}
                                            placeholder="1 Office Road, London, EC1A 1AA"
                                            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100 resize-none" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Business Bio</label>
                                    <textarea name="bio" value={formData.bio} onChange={handleChange} rows={4}
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

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                            {isSaved && (
                                <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400 animate-in fade-in">
                                    <CheckCircle size={16} />
                                    Profile Updated
                                </span>
                            )}
                            <button type="submit" disabled={isLoading}
                                className="flex items-center gap-2 px-6 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-400 text-white font-medium rounded-lg transition-colors shadow-sm">
                                {isLoading ? (
                                    <><Loader2 size={18} className="animate-spin" /> Saving...</>
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
