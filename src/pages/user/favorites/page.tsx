"use client";

import React from 'react';
import { Heart, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

const mockFavorites = [
    { id: '1', title: '2 Bed Apartment in Canary Wharf', address: 'Canary Wharf, London E14', price: 450000, bedrooms: 2, bathrooms: 1, area: 750 },
    { id: '2', title: '3 Bed Semi-Detached in Richmond', address: 'Richmond, London TW10', price: 875000, bedrooms: 3, bathrooms: 2, area: 1200 },
    { id: '3', title: 'Studio Flat in Shoreditch', address: 'Shoreditch, London E1', price: 320000, bedrooms: 1, bathrooms: 1, area: 450 },
];

const FavoritesPage = () => {
    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Saved Properties</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Properties you&apos;ve saved for later</p>
            </div>

            {mockFavorites.length === 0 ? (
                <div className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-zinc-800 p-12 text-center">
                    <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No saved properties</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-4">Start exploring and save properties you like!</p>
                    <Link to="/user/search" className="inline-flex px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
                        Explore Properties
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {mockFavorites.map(p => (
                        <div key={p.id} className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-zinc-800 p-4 hover:shadow-md transition-all group">
                            <div className="relative bg-gray-100 dark:bg-zinc-800 rounded-lg h-40 mb-3 flex items-center justify-center">
                                <MapPin className="w-8 h-8 text-gray-300" />
                                <button className="absolute top-2 right-2 p-1.5 bg-white/90 dark:bg-zinc-900/90 rounded-full shadow hover:bg-red-50 transition-colors">
                                    <Heart className="w-4 h-4 text-red-500 fill-red-500" />
                                </button>
                            </div>
                            <h3 className="font-semibold text-gray-900 dark:text-white mb-1 truncate">{p.title}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{p.address}</p>
                            <div className="flex items-center justify-between">
                                <span className="text-lg font-bold text-indigo-600">£{p.price.toLocaleString()}</span>
                                <span className="text-xs text-gray-500">{p.bedrooms} bed · {p.bathrooms} bath · {p.area} sqft</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FavoritesPage;

