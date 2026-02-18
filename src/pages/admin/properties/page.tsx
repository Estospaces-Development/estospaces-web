"use client";

import React, { useState, Suspense } from 'react';
import {
    Plus, Edit, Trash2, Eye, Upload, MapPin, Home,
    Bed, Bath, DollarSign, Building, Save, X, CheckCircle,
    AlertCircle, Search, Filter, ChevronRight, Globe, Zap,
    Sparkles, Layers
} from 'lucide-react';
import { useProperties } from '@/contexts/PropertyContext';
import { useToast } from '@/contexts/ToastContext';

function PropertyManagementContent() {
    const { properties } = useProperties();
    const toast = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [filteringType, setFilteringType] = useState('all');

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-blue-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20">Inventory Hub</span>
                        <span className="text-gray-400 text-xs font-bold flex items-center gap-1">
                            <Globe size={12} /> Global Portfolio Management
                        </span>
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none text-balance">
                        Registry Control
                    </h1>
                </div>
                <div className="flex items-center gap-4">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search registry..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-12 pr-6 py-4 bg-white dark:bg-gray-800 rounded-2xl border dark:border-gray-700 outline-none focus:ring-4 focus:ring-blue-500/10 font-bold text-sm w-64 shadow-sm transition-all"
                        />
                    </div>
                    <button className="px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl flex items-center gap-2">
                        <Plus size={18} /> Add Property
                    </button>
                </div>
            </div>

            {/* Control Rail */}
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-[2rem] border dark:border-gray-700 shadow-xl shadow-gray-200/50 dark:shadow-none">
                <div className="flex gap-2">
                    {['all', 'sale', 'rent', 'commercial'].map((type) => (
                        <button
                            key={type}
                            onClick={() => setFilteringType(type)}
                            className={`px-6 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all ${filteringType === type ? 'bg-blue-500 text-white shadow-lg shadow-blue-500/20' : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-900'
                                }`}
                        >
                            {type}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-4 px-6 border-l dark:border-gray-700">
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Listed: <span className="text-gray-900 dark:text-white">{properties.length}</span></span>
                </div>
            </div>

            {/* Property Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {properties.map((property) => (
                    <div
                        key={property.id}
                        className="group bg-white dark:bg-gray-800 rounded-[3rem] border dark:border-gray-700 shadow-2xl shadow-gray-200/50 dark:shadow-none overflow-hidden hover:-translate-y-2 transition-all duration-500"
                    >
                        <div className="relative h-64">
                            <img
                                src={typeof property.images?.[0] === 'string' ? property.images[0] : 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80'}
                                alt={property.title}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                            />
                            <div className="absolute top-6 right-6">
                                <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest backdrop-blur-md shadow-lg ${property.status === 'online' ? 'bg-green-500/90 text-white' : 'bg-gray-900/90 text-white'
                                    }`}>
                                    {property.status}
                                </span>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-8">
                                <div className="flex gap-2 w-full">
                                    <button className="flex-1 py-3 bg-white text-gray-900 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-blue-500 hover:text-white transition-all shadow-xl">
                                        Edit Detail
                                    </button>
                                    <button className="p-3 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-all shadow-xl">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="p-8">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white tracking-tight mb-1">{property.title}</h3>
                                    <p className="flex items-center gap-1 text-gray-400 text-xs font-bold">
                                        <MapPin size={12} className="text-blue-500" /> {property.city || property.location?.city}
                                    </p>
                                </div>
                                <span className="text-xl font-black text-blue-500">£{property.price?.amount?.toLocaleString() || property.priceString || '0'}</span>
                            </div>

                            <div className="grid grid-cols-3 gap-4 py-6 border-y dark:border-gray-700 my-6">
                                <div className="text-center border-r dark:border-gray-700">
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Beds</p>
                                    <p className="font-black text-gray-900 dark:text-white">{property.bedrooms || property.rooms?.bedrooms}</p>
                                </div>
                                <div className="text-center border-r dark:border-gray-700">
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Baths</p>
                                    <p className="font-black text-gray-900 dark:text-white">{property.bathrooms || property.rooms?.bathrooms}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Type</p>
                                    <span className="text-[10px] font-black text-blue-500 uppercase">{property.propertyType}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-xs font-black text-gray-400">AG</div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-900 dark:text-white">Admin Group</p>
                                        <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Listing Owner</p>
                                    </div>
                                </div>
                                <button className="text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {properties.length === 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-[3rem] p-20 text-center border-2 border-dashed dark:border-gray-700">
                    <div className="w-24 h-24 bg-gray-50 dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-8 text-gray-300">
                        <Layers size={40} />
                    </div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2">No Properties Registered</h2>
                    <p className="text-gray-500 font-medium mb-8">The global registry is currently empty. Start by adding a featured listing.</p>
                    <button className="px-10 py-5 bg-blue-500 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-500/30">
                        Register First Property
                    </button>
                </div>
            )}
        </div>
    );
}

export default function AdminPropertyManagementPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center font-bold">Loading Properties...</div>}>
            <PropertyManagementContent />
        </Suspense>
    );
}
