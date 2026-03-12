'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Bed, Bath, Maximize, Loader2, Home } from 'lucide-react';
import { getPropertyById, Property } from '../../../../services/propertyService';

const UserPropertyDetail = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [property, setProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchProperty = async () => {
            if (!id) return;
            setLoading(true);
            try {
                const { data, error: apiError } = await getPropertyById(id);
                if (apiError) {
                    setError(apiError);
                } else if (data) {
                    setProperty(data);
                } else {
                    setError('Property not found');
                }
            } catch (err) {
                setError('Failed to load property details');
            } finally {
                setLoading(false);
            }
        };

        fetchProperty();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] text-indigo-600">
                <Loader2 className="w-12 h-12 animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Loading property details...</p>
            </div>
        );
    }

    if (error || !property) {
        return (
            <div className="max-w-4xl mx-auto py-20 px-4 text-center">
                <div className="bg-red-50 dark:bg-red-900/20 p-8 rounded-2xl border border-red-100 dark:border-red-900/30">
                    <Home className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{error || 'Property Not Found'}</h2>
                    <p className="text-gray-500 dark:text-gray-400 mb-8">The property you are looking for might have been removed or is temporarily unavailable.</p>
                    <button 
                        onClick={() => navigate('/user/search')}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-md"
                    >
                        Back to Search
                    </button>
                </div>
            </div>
        );
    }

    // Helper for images
    const images = property.image_urls || [];
    const coverImage = images.length > 0 ? images[0] : null;

    return (
        <div className="max-w-6xl mx-auto px-4 py-8 pb-20">
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-8 transition-colors group"
            >
                <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span>Back</span>
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Media & Info */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Image Gallery Placeholder */}
                    <div className="aspect-video bg-gray-100 dark:bg-zinc-800 rounded-3xl overflow-hidden relative group">
                        {coverImage ? (
                            <img 
                                src={coverImage} 
                                alt={property.title} 
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                <Home size={64} />
                            </div>
                        )}
                        <div className="absolute top-4 left-4">
                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-lg ${
                                property.listing_type === 'rent' ? 'bg-blue-600 text-white' : 'bg-green-600 text-white'
                            }`}>
                                For {property.listing_type}
                            </span>
                        </div>
                    </div>

                    <div>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{property.title}</h1>
                            <div className="text-3xl font-bold text-indigo-600">
                                {property.currency || '£'}{property.price.toLocaleString()}
                                {property.listing_type === 'rent' && <span className="text-lg font-normal text-gray-500 ml-1">/mo</span>}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-6">
                            <MapPin size={18} className="text-indigo-500" />
                            <span>{property.address_line_1 ? `${property.address_line_1}, ${property.city}, ${property.postcode}` : `${property.city}, ${property.postcode}`}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-4 p-6 bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 rounded-2xl mb-8">
                            <div className="flex flex-col items-center text-center">
                                <Bed className="w-6 h-6 text-indigo-500 mb-2" />
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{property.bedrooms}</span>
                                <span className="text-xs text-gray-500">Bedrooms</span>
                            </div>
                            <div className="flex flex-col items-center text-center border-x border-gray-100 dark:border-zinc-800">
                                <Bath className="w-6 h-6 text-indigo-500 mb-2" />
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{property.bathrooms}</span>
                                <span className="text-xs text-gray-500">Bathrooms</span>
                            </div>
                            <div className="flex flex-col items-center text-center">
                                <Maximize className="w-6 h-6 text-indigo-500 mb-2" />
                                <span className="text-sm font-bold text-gray-900 dark:text-white">{property.property_size_sqft || 0}</span>
                                <span className="text-xs text-gray-500">Sq Ft</span>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Description</h2>
                            <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-wrap">
                                {property.description || 'No description available for this property.'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Column: Actions */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 p-6 rounded-2xl shadow-sm sticky top-8">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Interested in this property?</h3>
                        
                        <div className="space-y-4">
                            <button className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 dark:shadow-none">
                                Request Fast-Track Viewing
                            </button>
                            <button className="w-full py-4 border border-indigo-600 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all">
                                Send Message
                            </button>
                        </div>

                        <div className="mt-8 pt-8 border-t border-gray-100 dark:border-zinc-800">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center text-gray-400 font-bold">
                                    {property.agent_name?.charAt(0) || 'B'}
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-gray-900 dark:text-white">{property.agent_name || 'Verified Broker'}</div>
                                    <div className="text-xs text-green-500 font-medium">SLA: {'< 15 mins'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserPropertyDetail;
