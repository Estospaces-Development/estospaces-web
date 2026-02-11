"use client";

import React, { useState } from 'react';
import {
    ChevronRight, ChevronLeft, Upload, X, MapPin, Building,
    Home, Bed, Bath, Car, Maximize, Calendar, Shield, Wifi,
    Dumbbell, Camera, Globe, FileText, Save, ArrowLeft,
    CheckCircle, Target, Sparkles, Building2, Layers, DollarSign
} from 'lucide-react';
import AddressSection, { AddressFormData } from '@/components/ui/AddressSection';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

export default function AddPropertyPage() {
    const { user } = useAuth();
    const toast = useToast();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        title: '',
        type: 'apartment',
        listingType: 'rent',
        price: '',
        area: '',
        bedrooms: '',
        bathrooms: '',
        description: '',
        amenities: [] as string[],
        images: [] as string[],
        address: {
            addressLine1: '',
            addressLine2: '',
            cityName: '',
            stateName: '',
            countryName: '',
            postalCode: '',
            countryId: '',
            stateId: '',
            cityId: '',
            countryCode: '',
            stateCode: '',
            neighborhood: '',
            landmark: ''
        } as AddressFormData
    });

    const nextStep = () => setStep(s => Math.min(s + 1, 4));
    const prevStep = () => setStep(s => Math.max(s - 1, 1));

    const handleAddressChange = (addressData: AddressFormData) => {
        setFormData(prev => ({ ...prev, address: addressData }));
    };

    const toggleAmenity = (amenity: string) => {
        setFormData(prev => ({
            ...prev,
            amenities: prev.amenities.includes(amenity)
                ? prev.amenities.filter(a => a !== amenity)
                : [...prev.amenities, amenity]
        }));
    };

    return (
        <div className="max-w-5xl mx-auto py-10 px-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Progress Header */}
            <div className="mb-12">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">Create Listing</h1>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-black text-gray-400 uppercase tracking-widest">Step {step} of 4</span>
                        <div className="flex gap-2">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className={`h-2 w-8 rounded-full transition-all duration-500 ${step >= i ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`}></div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                {/* Form Section */}
                <div className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-[3rem] p-10 shadow-2xl border dark:border-gray-700">
                    {step === 1 && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Basic Information</h2>
                                <p className="text-gray-500 font-medium">Start with the essentials of your property listing.</p>
                            </div>

                            <div className="space-y-6">
                                <div className="group">
                                    <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3 group-focus-within:text-orange-500 transition-colors">Property Title</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Modern Luxury View Penthouse"
                                        className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-orange-500 rounded-2xl px-6 py-4 outline-none font-bold text-gray-900 dark:text-white transition-all"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="group">
                                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Listing Type</label>
                                        <select
                                            className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-orange-500 rounded-2xl px-6 py-4 outline-none font-bold text-gray-900 dark:text-white transition-all appearance-none"
                                            value={formData.listingType}
                                            onChange={(e) => setFormData({ ...formData, listingType: e.target.value })}
                                        >
                                            <option value="rent">For Rent</option>
                                            <option value="sale">For Sale</option>
                                            <option value="lease">Leasehold</option>
                                        </select>
                                    </div>
                                    <div className="group">
                                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Rate / Price</label>
                                        <div className="relative">
                                            <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                placeholder="5,000"
                                                className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-orange-500 rounded-2xl pl-14 pr-6 py-4 outline-none font-bold text-gray-900 dark:text-white transition-all"
                                                value={formData.price}
                                                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Location</h2>
                                <p className="text-gray-500 font-medium">Where is this property located?</p>
                            </div>
                            <AddressSection
                                value={formData.address}
                                onChange={handleAddressChange}
                            />
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-8 animate-in fade-in duration-500">
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Property Details</h2>
                                <p className="text-gray-500 font-medium">Add more specifics and amenities.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div className="group">
                                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Bedrooms</label>
                                        <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900 p-2 rounded-2xl">
                                            <button className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center font-black">-</button>
                                            <span className="flex-1 text-center font-black">2</span>
                                            <button className="w-10 h-10 rounded-xl bg-orange-500 text-white shadow-lg flex items-center justify-center font-black">+</button>
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Bathrooms</label>
                                        <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900 p-2 rounded-2xl">
                                            <button className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center font-black">-</button>
                                            <span className="flex-1 text-center font-black">1.5</span>
                                            <button className="w-10 h-10 rounded-xl bg-orange-500 text-white shadow-lg flex items-center justify-center font-black">+</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <div className="group">
                                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Square Area</label>
                                        <div className="relative">
                                            <Maximize className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                            <input
                                                type="text"
                                                placeholder="1,200 sq ft"
                                                className="w-full bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-orange-500 rounded-2xl pl-14 pr-6 py-4 outline-none font-bold text-gray-900 dark:text-white transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-3">Parking</label>
                                        <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900 p-2 rounded-2xl">
                                            <button className="w-10 h-10 rounded-xl bg-white dark:bg-gray-800 shadow-sm flex items-center justify-center font-black">-</button>
                                            <span className="flex-1 text-center font-black">1</span>
                                            <button className="w-10 h-10 rounded-xl bg-orange-500 text-white shadow-lg flex items-center justify-center font-black">+</button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6">
                                <label className="block text-xs font-black uppercase tracking-widest text-gray-400 mb-4 text-center">Select Amenities</label>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {[
                                        { name: 'WiFi', icon: Wifi },
                                        { name: 'Gym', icon: Dumbbell },
                                        { name: 'Security', icon: Shield },
                                        { name: 'Garden', icon: Globe },
                                    ].map((amenity) => (
                                        <button
                                            key={amenity.name}
                                            onClick={() => toggleAmenity(amenity.name)}
                                            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${formData.amenities.includes(amenity.name)
                                                ? 'bg-orange-50 border-orange-500 text-orange-600'
                                                : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-700 text-gray-400'
                                                }`}
                                        >
                                            <amenity.icon size={24} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">{amenity.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="space-y-8 animate-in fade-in duration-500 text-center">
                            <div className="w-24 h-24 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center text-orange-500 mx-auto mb-8">
                                <Sparkles size={40} className="animate-pulse" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-gray-900 dark:text-white mb-2">Final Review</h2>
                                <p className="text-gray-500 font-medium">Your listing is ready to go global. Last check?</p>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-8 text-left space-y-4">
                                <div className="flex justify-between border-b dark:border-gray-800 pb-4">
                                    <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Title</span>
                                    <span className="font-black text-gray-900 dark:text-white">{formData.title || 'Untitled Property'}</span>
                                </div>
                                <div className="flex justify-between border-b dark:border-gray-800 pb-4">
                                    <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Type</span>
                                    <span className="font-black text-gray-900 dark:text-white uppercase text-xs">{formData.listingType}</span>
                                </div>
                                <div className="flex justify-between border-b dark:border-gray-800 pb-4">
                                    <span className="text-gray-400 font-bold uppercase text-[10px] tracking-widest">Rate</span>
                                    <span className="font-black text-orange-500">£{formData.price || '0.00'}</span>
                                </div>
                            </div>

                            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100 dark:border-blue-800 rounded-3xl text-left flex gap-4">
                                <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center text-white flex-shrink-0">
                                    <Target size={20} />
                                </div>
                                <div>
                                    <h4 className="font-black text-blue-900 dark:text-blue-200 text-sm">Boost Visibility</h4>
                                    <p className="text-xs text-blue-700 dark:text-blue-300 font-medium opacity-80">We noticed your photos are high-res! We'll feature this in our "Luxury Spotlight".</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="mt-12 flex items-center justify-between pt-8 border-t dark:border-gray-700">
                        <button
                            onClick={prevStep}
                            disabled={step === 1}
                            className="flex items-center gap-2 px-8 py-4 text-gray-400 hover:text-gray-900 dark:hover:text-white font-black uppercase text-xs tracking-widest disabled:opacity-30 transition-all"
                        >
                            <ChevronLeft size={20} /> Back
                        </button>
                        {step < 4 ? (
                            <button
                                onClick={nextStep}
                                className="flex items-center gap-2 px-10 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
                            >
                                Continue <ChevronRight size={20} />
                            </button>
                        ) : (
                            <button
                                className="flex items-center gap-2 px-12 py-4 bg-orange-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-orange-500/30"
                            >
                                Publish Listing <Save size={20} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Right Sidebar Hints */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] p-10 border dark:border-gray-800">
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-6 tracking-tight">Listing Score</h3>
                        <div className="relative w-40 h-40 mx-auto mb-8">
                            <svg className="w-full h-full" viewBox="0 0 100 100">
                                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-gray-200 dark:text-gray-800" strokeWidth="10" />
                                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-orange-500" strokeWidth="10" strokeDasharray="210 282" strokeLinecap="round" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-3xl font-black text-gray-900 dark:text-white">75%</span>
                                <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Optimized</span>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {[
                                { label: 'Basic Info', done: !!formData.title },
                                { label: 'Location Details', done: !!formData.address.cityName },
                                { label: 'High-res Photos', done: false },
                                { label: 'Detailed Description', done: false },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center justify-between text-xs font-bold">
                                    <span className={item.done ? 'text-gray-900 dark:text-white' : 'text-gray-400'}>{item.label}</span>
                                    {item.done ? <CheckCircle className="text-green-500" size={14} /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-200 dark:border-gray-700 font-bold"></div>}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="p-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-125 transition-transform duration-700">
                            <Sparkles size={100} />
                        </div>
                        <div className="relative z-10">
                            <h4 className="text-lg font-black mb-2">AI Enhancement</h4>
                            <p className="text-purple-50 text-xs font-medium opacity-90 leading-relaxed mb-6">Our AI can automatically generate a compelling description and optimize your price based on local market trends.</p>
                            <button className="w-full py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">
                                Try AI Optimizer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
