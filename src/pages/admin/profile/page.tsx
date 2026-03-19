"use client";

import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Camera, Save, Loader2, CheckCircle, Hash, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/services/userService';
import { useToast } from '@/contexts/ToastContext';

export default function AdminProfilePage() {
    const { user, refreshUser } = useAuth();
    const { error: showToastError, success: showToastSuccess } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isSaved, setIsSaved] = useState(false);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: '',
        postcode: '',
        bio: '',
    });

    useEffect(() => {
        if (user) {
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
            setIsInitialLoading(false);
        }
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
        setIsSaved(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        
        const payload = {
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

    if (isInitialLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-orange-500" />
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
                                <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                                    {formData.firstName[0]}{formData.lastName[0]}
                                </span>
                            </div>
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
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">First Name</label>
                                    <input type="text" name="firstName" value={formData.firstName} onChange={handleChange} className={inputClass} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Last Name</label>
                                    <input type="text" name="lastName" value={formData.lastName} onChange={handleChange} className={inputClass} />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Primary Email</label>
                                    <div className="relative">
                                        <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input type="email" value={formData.email} disabled className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700/30 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Work Phone</label>
                                    <div className="relative">
                                        <Phone size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className={iconInputClass} />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Work Address</label>
                                    <div className="relative">
                                        <MapPin size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input type="text" name="address" value={formData.address} onChange={handleChange} className={iconInputClass} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Postcode</label>
                                    <div className="relative">
                                        <Hash size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input type="text" name="postcode" value={formData.postcode} onChange={handleChange} className={iconInputClass} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                {isSaved && (
                                    <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400 animate-in fade-in">
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
