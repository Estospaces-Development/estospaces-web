"use client";

import React, { useState, useMemo } from 'react';
import { Search, SlidersHorizontal, MapPin, X, Grid3X3, List } from 'lucide-react';
import PropertyCard from '../../../../components/dashboard/PropertyCard';
import Select from '../../../../components/ui/Select';
import Spinner from '../../../../components/ui/Spinner';

// Mock property data for search results
const mockProperties = [
    { id: '1', title: '2 Bed Apartment in Canary Wharf', address: 'Canary Wharf, London E14', price: 450000, type: 'apartment', bedrooms: 2, bathrooms: 1, area: 750, image: '', status: 'available' as const },
    { id: '2', title: '3 Bed Semi-Detached in Richmond', address: 'Richmond, London TW10', price: 875000, type: 'house', bedrooms: 3, bathrooms: 2, area: 1200, image: '', status: 'available' as const },
    { id: '3', title: 'Studio Flat in Shoreditch', address: 'Shoreditch, London E1', price: 320000, type: 'apartment', bedrooms: 1, bathrooms: 1, area: 450, image: '', status: 'available' as const },
    { id: '4', title: '4 Bed Detached in Kensington', address: 'Kensington, London W8', price: 2100000, type: 'house', bedrooms: 4, bathrooms: 3, area: 2500, image: '', status: 'available' as const },
    { id: '5', title: '1 Bed Flat in Brixton', address: 'Brixton, London SW2', price: 375000, type: 'apartment', bedrooms: 1, bathrooms: 1, area: 550, image: '', status: 'available' as const },
    { id: '6', title: '3 Bed Terraced in Wimbledon', address: 'Wimbledon, London SW19', price: 725000, type: 'house', bedrooms: 3, bathrooms: 2, area: 1100, image: '', status: 'available' as const },
];

const PropertySearch = () => {
    const [query, setQuery] = useState('');
    const [propertyType, setPropertyType] = useState('');
    const [minPrice, setMinPrice] = useState('');
    const [maxPrice, setMaxPrice] = useState('');
    const [bedrooms, setBedrooms] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    const filteredProperties = useMemo(() => {
        return mockProperties.filter(p => {
            if (query && !p.title.toLowerCase().includes(query.toLowerCase()) && !p.address.toLowerCase().includes(query.toLowerCase())) return false;
            if (propertyType && p.type !== propertyType) return false;
            if (minPrice && p.price < parseInt(minPrice)) return false;
            if (maxPrice && p.price > parseInt(maxPrice)) return false;
            if (bedrooms && p.bedrooms !== parseInt(bedrooms)) return false;
            return true;
        });
    }, [query, propertyType, minPrice, maxPrice, bedrooms]);

    const clearFilters = () => {
        setQuery('');
        setPropertyType('');
        setMinPrice('');
        setMaxPrice('');
        setBedrooms('');
    };

    const hasFilters = query || propertyType || minPrice || maxPrice || bedrooms;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-20">
            {/* Search Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Find Your Property</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Search through thousands of verified listings</p>
            </div>

            {/* Search Bar */}
            <div className="flex gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search by location, property name..."
                        className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-xl border transition-colors ${showFilters ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-zinc-900 border-gray-300 dark:border-zinc-700 text-gray-700 dark:text-gray-300 hover:border-indigo-400'
                        }`}
                >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="text-sm font-medium">Filters</span>
                </button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-zinc-800 p-5 animate-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Select
                            label="Property Type"
                            options={[
                                { value: 'apartment', label: 'Apartment' },
                                { value: 'house', label: 'House' },
                                { value: 'villa', label: 'Villa' },
                                { value: 'commercial', label: 'Commercial' },
                            ]}
                            value={propertyType}
                            onChange={setPropertyType}
                            placeholder="Any type"
                        />
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Min Price (£)</label>
                            <input
                                type="number"
                                value={minPrice}
                                onChange={(e) => setMinPrice(e.target.value)}
                                placeholder="No min"
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 block">Max Price (£)</label>
                            <input
                                type="number"
                                value={maxPrice}
                                onChange={(e) => setMaxPrice(e.target.value)}
                                placeholder="No max"
                                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <Select
                            label="Bedrooms"
                            options={[
                                { value: '1', label: '1 Bedroom' },
                                { value: '2', label: '2 Bedrooms' },
                                { value: '3', label: '3 Bedrooms' },
                                { value: '4', label: '4+ Bedrooms' },
                            ]}
                            value={bedrooms}
                            onChange={setBedrooms}
                            placeholder="Any"
                        />
                    </div>
                    {hasFilters && (
                        <button onClick={clearFilters} className="mt-4 flex items-center gap-1.5 text-sm text-red-600 hover:underline">
                            <X className="w-3.5 h-3.5" /> Clear all filters
                        </button>
                    )}
                </div>
            )}

            {/* Results Header */}
            <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    <span className="font-semibold text-gray-900 dark:text-white">{filteredProperties.length}</span> properties found
                </p>
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-zinc-800 rounded-lg p-1">
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-700 shadow-sm' : ''}`}>
                        <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-zinc-700 shadow-sm' : ''}`}>
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Results Grid */}
            {filteredProperties.length === 0 ? (
                <div className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-zinc-800 p-12 text-center">
                    <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No properties found</h3>
                    <p className="text-gray-500 dark:text-gray-400">Try adjusting your search criteria</p>
                </div>
            ) : (
                <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5' : 'space-y-4'}>
                    {filteredProperties.map(p => (
                        <div key={p.id} className="bg-white dark:bg-black rounded-xl border border-gray-200 dark:border-zinc-800 p-4 hover:shadow-md transition-all">
                            <div className="bg-gray-100 dark:bg-zinc-800 rounded-lg h-40 mb-3 flex items-center justify-center">
                                <MapPin className="w-8 h-8 text-gray-300" />
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

export default PropertySearch;
