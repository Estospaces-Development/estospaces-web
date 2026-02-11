"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Search, Globe, MapPin, Eye, Bath, Bed, ArrowRight, X, Filter,
    DollarSign, Building2, Key, Home, ChevronDown, Video, Phone, Mail,
    Languages, Star, TrendingUp, Clock, Sparkles, Loader2, ArrowLeft
} from 'lucide-react';

const COUNTRIES = [
    { code: 'ALL', name: 'Global', flag: '🌍' },
    { code: 'AE', name: 'UAE', flag: '🇦🇪' },
    { code: 'ES', name: 'Spain', flag: '🇪🇸' },
    { code: 'FR', name: 'France', flag: '🇫🇷' },
    { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
];

export default function OverseasPage() {
    const router = useRouter();
    const [selectedCountry, setSelectedCountry] = useState('ALL');
    const [propertyType, setPropertyType] = useState('buy');

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-10">
                    <button
                        onClick={() => router.push('/user/dashboard')}
                        className="mb-6 flex items-center gap-2 text-gray-400 hover:text-orange-500 transition-all group"
                    >
                        <div className="p-2 rounded-xl group-hover:bg-orange-50 dark:group-hover:bg-orange-900/20 transition-all">
                            <ArrowLeft size={18} />
                        </div>
                        <span className="font-bold text-sm">Dashboard</span>
                    </button>

                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight leading-none mb-3">
                                Overseas
                            </h1>
                            <p className="text-gray-500 dark:text-gray-400 font-medium">
                                Exclusive international listings across the globe
                            </p>
                        </div>

                        <div className="flex gap-2">
                            {['buy', 'rent'].map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setPropertyType(t)}
                                    className={`px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${propertyType === t
                                            ? 'bg-orange-500 text-white shadow-xl shadow-orange-500/30'
                                            : 'bg-white dark:bg-gray-800 text-gray-400 dark:text-gray-500 border dark:border-gray-700'
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Hero Search Section */}
                <div className="relative rounded-[3rem] overflow-hidden bg-gray-900 dark:bg-white mb-16 shadow-2xl">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=2600&auto=format&fit=crop')] bg-cover bg-center opacity-40 dark:opacity-10 group-hover:scale-105 transition-transform duration-1000"></div>
                    <div className="relative z-10 px-10 py-20 text-center max-w-3xl mx-auto">
                        <h2 className="text-4xl md:text-5xl font-black text-white dark:text-gray-900 mb-6 tracking-tight">
                            Find Your Dream <span className="text-orange-500">Global</span> Sanctuary
                        </h2>
                        <p className="text-gray-400 dark:text-gray-500 font-bold mb-10 text-lg">Curated properties in the world's most desired locations.</p>

                        <div className="flex flex-col md:flex-row gap-4 p-4 bg-white/10 dark:bg-gray-100 backdrop-blur-xl rounded-[2.5rem] border border-white/20 dark:border-gray-200">
                            <div className="flex-1 relative">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Which city are you dreaming of?"
                                    className="w-full bg-white dark:bg-white border-none rounded-[2rem] pl-16 pr-6 py-5 outline-none font-bold text-gray-900 dark:text-gray-900 shadow-sm"
                                />
                            </div>
                            <div className="relative min-w-[180px]">
                                <Globe className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <select
                                    className="w-full h-full bg-white dark:bg-white border-none rounded-[2rem] pl-16 pr-10 py-5 outline-none font-bold text-gray-900 dark:text-gray-900 appearance-none shadow-sm cursor-pointer"
                                    value={selectedCountry}
                                    onChange={(e) => setSelectedCountry(e.target.value)}
                                >
                                    {COUNTRIES.map(c => (
                                        <option key={c.code} value={c.code}>{c.flag} {c.name}</option>
                                    ))}
                                </select>
                                <ChevronDown size={18} className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            </div>
                            <button className="px-10 py-5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-[2rem] shadow-xl shadow-orange-500/30 transition-all active:scale-95">
                                Explore
                            </button>
                        </div>
                    </div>
                </div>

                {/* Categories Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
                    {[
                        { title: 'Dubai Penthouse', count: 12, bg: 'bg-gold', icon: Sparkles },
                        { title: 'Spanish Villas', count: 45, bg: 'bg-sunset', icon: Home },
                        { title: 'Paris Apartments', count: 28, bg: 'bg-pearl', icon: Building2 },
                        { title: 'Phuket Resorts', count: 19, bg: 'bg-aqua', icon: Globe },
                    ].map((cat) => (
                        <div key={cat.title} className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] shadow-xl border dark:border-gray-700 hover:scale-[1.05] transition-all cursor-pointer group">
                            <div className="w-16 h-16 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center text-orange-500 mb-6 group-hover:bg-orange-500 group-hover:text-white transition-all">
                                <cat.icon size={28} />
                            </div>
                            <h4 className="text-xl font-black text-gray-900 dark:text-white mb-1 tracking-tight">{cat.title}</h4>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{cat.count} Listings</p>
                        </div>
                    ))}
                </div>

                {/* Call to Action */}
                <div className="bg-orange-500 rounded-[3rem] p-12 text-center text-white relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="relative z-10">
                        <h3 className="text-3xl font-black mb-4 tracking-tight">Need help with international relocation?</h3>
                        <p className="text-orange-100 font-bold mb-10 max-w-xl mx-auto">Our specialist agents handle visas, legal paperwork, and currency exchange to make your global move seamless.</p>
                        <button className="px-12 py-5 bg-white text-orange-600 font-black rounded-[2rem] shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 mx-auto">
                            <Phone size={20} /> Speak to an Advisor
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
