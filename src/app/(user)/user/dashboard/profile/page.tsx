"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    User,
    Mail,
    Phone,
    MapPin,
    ArrowLeft,
    Shield,
    CheckCircle,
    Loader2,
    Upload,
    X,
    Camera,
    Edit3,
    Building,
    Check
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import VerificationSection from '@/components/dashboard/VerificationSection';
import DocumentUpload from '@/components/dashboard/DocumentUpload';

export default function ProfilePage() {
    const router = useRouter();
    const { user: currentUser } = useAuth();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState({
        fullName: 'Thomas Anderson',
        email: 'thomas@example.com',
        phone: '+44 20 1234 5678',
        address: '123 Main St, London, SW1A 1AA',
        postcode: 'SW1A 1AA',
    });

    const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        if (currentUser) {
            setFormData(prev => ({
                ...prev,
                email: currentUser.email || '',
                fullName: currentUser.user_metadata?.full_name || currentUser.name || 'Thomas Anderson',
            }));
        }
    }, [currentUser]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingImage(true);
        const reader = new FileReader();
        reader.onloadend = () => {
            setProfileImagePreview(reader.result as string);
            setUploadingImage(false);
        };
        reader.readAsDataURL(file);
    };

    const handleSaveProfile = async () => {
        setSavingProfile(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        setSavingProfile(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Back Button */}
                <button
                    onClick={() => router.push('/user/dashboard')}
                    className="mb-8 flex items-center gap-2 text-gray-400 hover:text-orange-500 transition-all group"
                >
                    <div className="p-2 rounded-xl group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20 transition-all">
                        <ArrowLeft size={18} />
                    </div>
                    <span className="font-bold text-sm">Dashboard</span>
                </button>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                            My Profile
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
                            Manage your identity and personal security settings
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="px-5 py-2.5 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border dark:border-gray-700 flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Profile Status: Active</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Left Side: Avatar and Quick Actions */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border dark:border-gray-700 p-8 text-center relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-orange-500 to-orange-600 opacity-10 group-hover:opacity-20 transition-opacity"></div>

                            <div className="relative mt-8 mb-6">
                                <div className="w-32 h-32 mx-auto rounded-3xl overflow-hidden border-4 border-white dark:border-gray-800 shadow-2xl relative">
                                    {profileImagePreview || currentUser?.avatar_url ? (
                                        <img
                                            src={profileImagePreview || currentUser?.avatar_url}
                                            alt="Profile"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                                            <User size={64} className="text-orange-500" />
                                        </div>
                                    )}
                                    {uploadingImage && (
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                            <Loader2 size={24} className="text-white animate-spin" />
                                        </div>
                                    )}
                                </div>
                                <label
                                    htmlFor="avatar-upload"
                                    className="absolute -bottom-2 -right-2 bg-orange-500 hover:bg-orange-600 text-white p-3 rounded-2xl shadow-lg cursor-pointer hover:scale-110 active:scale-95 transition-all"
                                >
                                    <Camera size={18} />
                                    <input
                                        type="file"
                                        id="avatar-upload"
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleImageSelect}
                                    />
                                </label>
                            </div>

                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{formData.fullName}</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{formData.email}</p>

                            <div className="mt-8 pt-8 border-t dark:border-gray-700 grid grid-cols-3 gap-2">
                                <div className="text-center">
                                    <div className="text-lg font-black text-gray-900 dark:text-white">12</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase">Saved</div>
                                </div>
                                <div className="text-center border-x dark:border-gray-700">
                                    <div className="text-lg font-black text-gray-900 dark:text-white">5</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase">Leads</div>
                                </div>
                                <div className="text-center">
                                    <div className="text-lg font-black text-gray-900 dark:text-white">3</div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase">Viewings</div>
                                </div>
                            </div>
                        </div>

                        <VerificationSection userId={currentUser?.id} currentUser={currentUser} />
                    </div>

                    {/* Right Side: Information Forms */}
                    <div className="lg:col-span-8 space-y-8">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border dark:border-gray-700 overflow-hidden">
                            <div className="px-8 py-6 border-b dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-900/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white dark:bg-gray-700 rounded-xl flex items-center justify-center shadow-sm">
                                        <Edit3 size={20} className="text-orange-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Personal Information</h3>
                                </div>
                                {saveSuccess && (
                                    <div className="flex items-center gap-2 text-green-500 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-full animate-in fade-in slide-in-from-right duration-300">
                                        <Check size={16} />
                                        <span className="text-xs font-bold uppercase tracking-wider">Changes Saved</span>
                                    </div>
                                )}
                            </div>

                            <div className="p-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Full Name</label>
                                        <input
                                            type="text"
                                            name="fullName"
                                            value={formData.fullName}
                                            onChange={handleInputChange}
                                            className="w-full bg-gray-50 dark:bg-gray-900/50 border dark:border-gray-700 rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-gray-900 dark:text-white"
                                            placeholder="Enter your full name"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Email Address</label>
                                        <input
                                            type="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            className="w-full bg-gray-50 dark:bg-gray-900/50 border dark:border-gray-700 rounded-2xl px-5 py-3.5 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-gray-900 dark:text-white"
                                            placeholder="name@example.com"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Phone Number</label>
                                        <div className="relative">
                                            <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="tel"
                                                name="phone"
                                                value={formData.phone}
                                                onChange={handleInputChange}
                                                className="w-full bg-gray-50 dark:bg-gray-900/50 border dark:border-gray-700 rounded-2xl pl-12 pr-5 py-3.5 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-gray-900 dark:text-white"
                                                placeholder="+44 20 1234 5678"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Postcode</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                name="postcode"
                                                value={formData.postcode}
                                                onChange={handleInputChange}
                                                className="w-full bg-gray-50 dark:bg-gray-900/50 border dark:border-gray-700 rounded-2xl pl-12 pr-5 py-3.5 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-gray-900 dark:text-white uppercase"
                                                placeholder="e.g. SW1A 1AA"
                                            />
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 space-y-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest px-1">Full Residential Address</label>
                                        <div className="relative">
                                            <Building className="absolute left-5 top-5 text-gray-400" size={18} />
                                            <input
                                                name="address"
                                                value={formData.address}
                                                onChange={handleInputChange}
                                                className="w-full bg-gray-50 dark:bg-gray-900/50 border dark:border-gray-700 rounded-2xl pl-12 pr-5 py-3.5 outline-none focus:ring-2 focus:ring-orange-500 transition-all font-medium text-gray-900 dark:text-white min-h-[56px]"
                                                placeholder="Your complete address..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-10 flex flex-col md:flex-row gap-4">
                                    <button
                                        onClick={handleSaveProfile}
                                        disabled={savingProfile}
                                        className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                                    >
                                        {savingProfile ? (
                                            <>
                                                <Loader2 size={24} className="animate-spin" />
                                                <span>Updating Profile...</span>
                                            </>
                                        ) : (
                                            <>
                                                <Check size={24} strokeWidth={3} />
                                                <span>Save Settings</span>
                                            </>
                                        )}
                                    </button>
                                    <button
                                        className="px-8 py-4 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-2xl transition-all"
                                    >
                                        Discard Changes
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl shadow-gray-200/50 dark:shadow-none border dark:border-gray-700 overflow-hidden">
                            <div className="px-8 py-6 border-b dark:border-gray-700 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                                        <Upload size={20} className="text-orange-500" />
                                    </div>
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Profile Documents</h3>
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Identity & Residency</span>
                            </div>
                            <div className="p-8">
                                <DocumentUpload
                                    documents={[]}
                                    onUpload={() => { }}
                                    onDelete={() => { }}
                                    onReplace={() => { }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
