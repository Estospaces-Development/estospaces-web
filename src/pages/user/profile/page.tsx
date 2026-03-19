"use client";

import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Camera, Save, Loader2, CheckCircle, Hash } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { userService } from '@/services/userService';
import { useToast } from '@/contexts/ToastContext';

export default function UserProfilePage() {
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
                profile_type: 'individual'
            }
        };

        const { data, error } = await userService.updateProfile(payload);
        
        if (data) {
            // Short delay to ensure DB persistence before refresh
            await new Promise(resolve => setTimeout(resolve, 800));
            await refreshUser();
            
            setIsSaved(true);
            showToastSuccess('Profile updated successfully');
            setTimeout(() => setIsSaved(false), 3000);
        } else {
            showToastError('Failed to update profile: ' + (error || 'Unknown error'));
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

    const inputClass = "w-full px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100";
    const iconInputClass = "w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100";

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">My Profile</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Profile Card */}
                <div className="md:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col items-center text-center">
                        <div className="relative mb-4 group cursor-pointer">
                            <div className="w-32 h-32 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center border-4 border-white dark:border-gray-800 shadow-md overflow-hidden">
                                {formData.firstName ? (
                                    <span className="text-4xl font-bold text-orange-600 dark:text-orange-400">
                                        {formData.firstName[0]}{formData.lastName[0]}
                                    </span>
                                ) : (
                                    <User size={48} className="text-orange-400" />
                                )}
                            </div>
                            <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <Camera className="text-white" size={24} />
                            </div>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{formData.firstName} {formData.lastName}</h2>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">{formData.email}</p>
                        
                        {formData.address && (
                            <p className="text-gray-400 dark:text-gray-500 text-xs flex items-center gap-1 justify-center mb-4">
                                <MapPin size={12} /> {formData.address}{formData.postcode ? `, ${formData.postcode}` : ''}
                            </p>
                        )}

                        <div className="w-full pt-4 border-t border-gray-100 dark:border-gray-700">
                            <div className="flex items-center justify-between text-sm mb-2">
                                <span className="text-gray-500 dark:text-gray-400">Profile Completion</span>
                                <span className="text-orange-600 dark:text-orange-400 font-medium">85%</span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                                <div className="bg-orange-500 h-2 rounded-full" style={{ width: '85%' }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Edit Form */}
                <div className="md:col-span-2">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                            <User size={20} className="text-orange-500" />
                            Personal Information
                        </h3>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">First Name</label>
                                    <input
                                        type="text"
                                        id="firstName"
                                        name="firstName"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        className={inputClass}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Last Name</label>
                                    <input
                                        type="text"
                                        id="lastName"
                                        name="lastName"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                        className={inputClass}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
                                    <div className="relative">
                                        <Mail size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="email"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            disabled
                                            className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700/30 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-500 mt-1">Email cannot be changed directly.</p>
                                </div>
                                <div>
                                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Phone Number</label>
                                    <div className="relative">
                                        <Phone size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="tel"
                                            id="phone"
                                            name="phone"
                                            value={formData.phone}
                                            onChange={handleChange}
                                            placeholder="+44 7700 000000"
                                            className={iconInputClass}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="md:col-span-2">
                                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Home Address</label>
                                    <div className="relative">
                                        <MapPin size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            id="address"
                                            name="address"
                                            value={formData.address}
                                            onChange={handleChange}
                                            placeholder="123 Street Name, City"
                                            className={iconInputClass}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Postcode</label>
                                    <div className="relative">
                                        <Hash size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            id="postcode"
                                            name="postcode"
                                            value={formData.postcode}
                                            onChange={handleChange}
                                            placeholder="SW1A 1AA"
                                            className={iconInputClass}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label htmlFor="bio" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">About Me</label>
                                <textarea
                                    id="bio"
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleChange}
                                    rows={4}
                                    placeholder="Tell potential landlords a bit about yourself..."
                                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700/50 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-gray-900 dark:text-gray-100 resize-none"
                                ></textarea>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                                {isSaved && (
                                    <span className="flex items-center gap-1.5 text-sm font-medium text-green-600 dark:text-green-400 animate-in fade-in">
                                        <CheckCircle size={16} />
                                        Saved Successfully
                                    </span>
                                )}
                                <button
                                    type="submit"
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
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
