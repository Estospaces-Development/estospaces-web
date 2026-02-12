'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
    X, Loader2, Home, User, Briefcase, DollarSign, Calendar,
    Phone, Mail, Building2, FileText, CheckCircle, Search,
    ArrowRight, ArrowLeft, Sparkles, MapPin, Bed, Bath, Edit2,
} from 'lucide-react';
import { useApplications } from '@/contexts/ApplicationsContext';
import { useAuth } from '@/contexts/AuthContext';

interface Property {
    id: string;
    title?: string;
    address_line_1?: string;
    city?: string;
    postcode?: string;
    price?: number;
    property_type?: string;
    listing_type?: string;
    image_urls?: string[] | string;
    bedrooms?: number;
    bathrooms?: number;
    contact_name?: string;
    contact_email?: string;
    contact_phone?: string;
    company?: string;
}

interface FormDataState {
    fullName: string;
    email: string;
    phone: string;
    employmentStatus: string;
    employer: string;
    jobTitle: string;
    annualIncome: string;
    moveInDate: string;
    notes: string;
}

interface NewApplicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    preSelectedProperty?: Property | null;
}

const NewApplicationModal = ({ isOpen, onClose, preSelectedProperty = null }: NewApplicationModalProps) => {
    const { createApplication } = useApplications();
    const { user, profile } = useAuth();
    const searchInputRef = useRef<HTMLInputElement>(null);
    const nameInputRef = useRef<HTMLInputElement>(null);

    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [animateStep, setAnimateStep] = useState(false);

    // Property selection
    const [searchQuery, setSearchQuery] = useState('');
    const [properties, setProperties] = useState<Property[]>([]);
    const [recentProperties, setRecentProperties] = useState<Property[]>([]);
    const [loadingProperties, setLoadingProperties] = useState(false);
    const [loadingRecent, setLoadingRecent] = useState(true);
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(preSelectedProperty);

    // Form data with validation
    const [formData, setFormData] = useState<FormDataState>({
        fullName: '',
        email: '',
        phone: '',
        employmentStatus: 'employed',
        employer: '',
        jobTitle: '',
        annualIncome: '',
        moveInDate: '',
        notes: '',
    });

    const [formErrors, setFormErrors] = useState<Record<string, string | null>>({});

    // Focus on search input when modal opens
    useEffect(() => {
        if (isOpen && step === 1 && searchInputRef.current) {
            setTimeout(() => searchInputRef.current?.focus(), 300);
        }
        if (isOpen && step === 2 && nameInputRef.current) {
            setTimeout(() => nameInputRef.current?.focus(), 300);
        }
    }, [isOpen, step]);

    // Load recent properties on modal open using direct REST API
    useEffect(() => {
        const fetchRecentProperties = async () => {
            if (!isOpen) {
                setLoadingRecent(false);
                return;
            }

            setLoadingRecent(true);
            try {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yydtsteyknbpfpxjtlxe.supabase.co';
                const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5ZHRzdGV5a25icGZweGp0bHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3OTkzODgsImV4cCI6MjA3OTM3NTM4OH0.QTUVmTdtnoFhzZ0G6XjdzhFDxcFae0hDSraFhazdNsU';

                const response = await fetch(
                    `${supabaseUrl}/rest/v1/properties?status=eq.online&order=created_at.desc&limit=6&select=id,title,address_line_1,city,postcode,price,property_type,listing_type,image_urls,bedrooms,bathrooms,contact_name,contact_email,contact_phone,company`,
                    {
                        headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`,
                        },
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    console.log('[NewApplication] Fetched recent properties:', data?.length);
                    setRecentProperties(data || []);
                } else {
                    console.error('[NewApplication] Failed to fetch properties:', response.status);
                    setRecentProperties([]);
                }
            } catch (err) {
                console.error('[NewApplication] Error fetching recent properties:', err);
                setRecentProperties([]);
            } finally {
                setLoadingRecent(false);
            }
        };

        fetchRecentProperties();
    }, [isOpen]);

    // Search properties with debounce using direct REST API
    useEffect(() => {
        const fetchProperties = async () => {
            if (!searchQuery.trim()) {
                setProperties([]);
                return;
            }

            setLoadingProperties(true);
            try {
                const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://yydtsteyknbpfpxjtlxe.supabase.co';
                const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl5ZHRzdGV5a25icGZweGp0bHhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3OTkzODgsImV4cCI6MjA3OTM3NTM4OH0.QTUVmTdtnoFhzZ0G6XjdzhFDxcFae0hDSraFhazdNsU';

                const encodedQuery = encodeURIComponent(searchQuery);
                const response = await fetch(
                    `${supabaseUrl}/rest/v1/properties?status=eq.online&or=(title.ilike.*${encodedQuery}*,city.ilike.*${encodedQuery}*,postcode.ilike.*${encodedQuery}*,address_line_1.ilike.*${encodedQuery}*)&limit=6&select=id,title,address_line_1,city,postcode,price,property_type,listing_type,image_urls,bedrooms,bathrooms,contact_name,contact_email,contact_phone,company`,
                    {
                        headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`,
                        },
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    console.log('[NewApplication] Search results:', data?.length);
                    setProperties(data || []);
                } else {
                    console.error('[NewApplication] Search failed:', response.status);
                    setProperties([]);
                }
            } catch (err) {
                console.error('[NewApplication] Error searching properties:', err);
                setProperties([]);
            } finally {
                setLoadingProperties(false);
            }
        };

        const debounce = setTimeout(fetchProperties, 300);
        return () => clearTimeout(debounce);
    }, [searchQuery]);

    // Pre-fill user data from profile
    useEffect(() => {
        if (profile || user) {
            setFormData(prev => ({
                ...prev,
                fullName: (profile as any)?.full_name || (user as any)?.user_metadata?.full_name || prev.fullName,
                email: (profile as any)?.email || (user as any)?.email || prev.email,
                phone: (profile as any)?.phone || prev.phone,
            }));
        }
    }, [profile, user]);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setTimeout(() => {
                setStep(1);
                setSubmitSuccess(false);
                setSubmitError(null);
                setSelectedProperty(preSelectedProperty);
                setSearchQuery('');
                setProperties([]);
                setFormErrors({});
            }, 300);
        }
    }, [isOpen, preSelectedProperty]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user starts typing
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handlePropertySelect = (property: Property) => {
        setSelectedProperty(property);
        setSearchQuery('');
        setProperties([]);
        // Auto-advance to next step after selection
        setTimeout(() => handleNextStep(), 300);
    };

    const validateStep2 = () => {
        const errors: Record<string, string> = {};
        if (!formData.fullName.trim()) errors.fullName = 'Name is required';
        if (!formData.email.trim()) errors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Invalid email format';

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleNextStep = () => {
        if (step === 1 && !selectedProperty) {
            return;
        }
        if (step === 2 && !validateStep2()) {
            return;
        }

        setAnimateStep(true);
        setTimeout(() => {
            setStep(prev => prev + 1);
            setAnimateStep(false);
        }, 150);
    };

    const handlePrevStep = () => {
        setAnimateStep(true);
        setTimeout(() => {
            setStep(prev => prev - 1);
            setAnimateStep(false);
        }, 150);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (step < 3) {
                handleNextStep();
            }
        }
    };

    const handleSubmit = async () => {
        if (!selectedProperty) {
            setSubmitError('Please select a property');
            return;
        }

        setIsSubmitting(true);
        setSubmitError(null);

        try {
            let images: string[] = [];
            try {
                images = selectedProperty.image_urls
                    ? (Array.isArray(selectedProperty.image_urls) ? selectedProperty.image_urls : JSON.parse(selectedProperty.image_urls as string))
                    : [];
            } catch {
                images = [];
            }

            const applicationData = {
                property_id: selectedProperty.id,
                property_title: selectedProperty.title,
                property_address: selectedProperty.address_line_1 || `${selectedProperty.city || ''} ${selectedProperty.postcode || ''}`.trim(),
                property_price: selectedProperty.price,
                property_type: selectedProperty.property_type,
                listing_type: selectedProperty.listing_type,
                property_image: images[0] || null,
                agent_name: selectedProperty.contact_name,
                agent_email: selectedProperty.contact_email,
                agent_phone: selectedProperty.contact_phone,
                agent_company: selectedProperty.company,
                personal_info: {
                    full_name: formData.fullName,
                    email: formData.email,
                    phone: formData.phone,
                },
                financial_info: {
                    employment_status: formData.employmentStatus,
                    employer: formData.employer,
                    job_title: formData.jobTitle,
                    annual_income: formData.annualIncome ? parseFloat(formData.annualIncome) : null,
                },
                move_in_date: formData.moveInDate || null,
                notes: formData.notes,
            };

            const result = await createApplication(applicationData);

            if (!result.success) {
                throw new Error(result.error || 'Failed to submit application');
            }

            setSubmitSuccess(true);

            setTimeout(() => {
                onClose();
            }, 2500);
        } catch (err: unknown) {
            console.error('Error submitting application:', err);
            setSubmitError((err as Error).message || 'Failed to submit application');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getPropertyImage = (property: Property | null) => {
        const fallbackImage = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400';

        if (!property) return fallbackImage;

        try {
            let images: string[] = [];

            if (property.image_urls) {
                if (Array.isArray(property.image_urls)) {
                    images = property.image_urls;
                } else if (typeof property.image_urls === 'string') {
                    try {
                        images = JSON.parse(property.image_urls);
                    } catch {
                        images = [property.image_urls];
                    }
                }
            }

            const validImage = images.filter(img => img && typeof img === 'string')[0];
            return validImage || fallbackImage;
        } catch (e) {
            console.error('[NewApplication] Error getting property image:', e);
            return fallbackImage;
        }
    };

    if (!isOpen) return null;

    const stepLabels = ['Select Property', 'Your Details', 'Review & Submit'];

    return createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fadeIn">
            <div
                className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
                style={{ animation: 'scaleIn 0.2s ease-out' }}
            >
                {/* Header */}
                <div className="p-5 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gradient-to-r from-orange-500 to-orange-600">
                    <div>
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <Sparkles size={20} />
                            New Application
                        </h2>
                        <p className="text-orange-100 text-sm mt-0.5">
                            {stepLabels[step - 1]}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X size={20} className="text-white" />
                    </button>
                </div>

                {/* Progress Steps */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                        {[1, 2, 3].map((s) => (
                            <React.Fragment key={s}>
                                <div className="flex flex-col items-center">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300 ${s === step
                                            ? 'bg-orange-500 text-white scale-110 shadow-lg shadow-orange-500/30'
                                            : s < step
                                                ? 'bg-green-500 text-white'
                                                : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                                            }`}
                                    >
                                        {s < step ? <CheckCircle size={18} /> : s}
                                    </div>
                                    <span className={`text-xs mt-1.5 font-medium ${s === step ? 'text-orange-600' : 'text-gray-500'}`}>
                                        {stepLabels[s - 1]}
                                    </span>
                                </div>
                                {s < 3 && (
                                    <div className={`flex-1 h-1 mx-3 rounded-full transition-all duration-500 ${s < step ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-600'}`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className={`p-6 overflow-y-auto max-h-[50vh] transition-opacity duration-150 ${animateStep ? 'opacity-0' : 'opacity-100'}`}>
                    {submitSuccess ? (
                        <div className="text-center py-10">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-5 animate-bounce">
                                <CheckCircle size={40} className="text-green-600 dark:text-green-400" />
                            </div>
                            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                                Application Submitted! 🎉
                            </h3>
                            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                                Your application has been sent successfully. The agent will review it and contact you within 24-48 hours.
                            </p>
                        </div>
                    ) : (
                        <>
                            {/* Step 1: Property Selection */}
                            {step === 1 && (
                                <div className="space-y-5">
                                    {/* Search Input */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Search for a Property
                                        </label>
                                        <div className="relative">
                                            <Search size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                            <input
                                                ref={searchInputRef}
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                placeholder="Search by name, city, or postcode..."
                                                className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                            />
                                            {loadingProperties && (
                                                <Loader2 size={20} className="absolute right-4 top-1/2 -translate-y-1/2 text-orange-500 animate-spin" />
                                            )}
                                        </div>
                                    </div>

                                    {/* Search Results */}
                                    {searchQuery && properties.length > 0 && (
                                        <div className="border-2 border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                                            {properties.map((property) => (
                                                <button
                                                    key={property.id}
                                                    onClick={() => handlePropertySelect(property)}
                                                    className="w-full flex items-center gap-4 p-4 hover:bg-orange-50 dark:hover:bg-gray-700 text-left transition-colors"
                                                >
                                                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                                        <img
                                                            src={getPropertyImage(property)}
                                                            alt={property.title || 'Property'}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400';
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${property.listing_type === 'rent'
                                                                ? 'bg-blue-100 text-blue-700'
                                                                : 'bg-green-100 text-green-700'
                                                                }`}>
                                                                {property.listing_type === 'rent' ? 'For Rent' : 'For Sale'}
                                                            </span>
                                                        </div>
                                                        <p className="font-semibold text-gray-900 dark:text-white truncate">
                                                            {property.title || 'Untitled Property'}
                                                        </p>
                                                        <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                            <MapPin size={12} />
                                                            {property.city || property.postcode || 'Unknown location'}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-lg font-bold text-orange-600">
                                                            £{property.price?.toLocaleString() || '0'}
                                                        </p>
                                                        <p className="text-xs text-gray-500">
                                                            {property.listing_type === 'rent' ? '/month' : ''}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    {/* No Results */}
                                    {searchQuery && !loadingProperties && properties.length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            <Search size={32} className="mx-auto mb-2 opacity-50" />
                                            <p>No properties found for &quot;{searchQuery}&quot;</p>
                                        </div>
                                    )}

                                    {/* Selected Property */}
                                    {selectedProperty && !searchQuery && (
                                        <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-xl border-2 border-orange-200 dark:border-orange-800">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-sm font-semibold text-orange-700 dark:text-orange-300 flex items-center gap-1">
                                                    <CheckCircle size={16} />
                                                    Selected Property
                                                </span>
                                                <button
                                                    onClick={() => setSelectedProperty(null)}
                                                    className="text-orange-600 hover:text-orange-700 text-sm font-medium flex items-center gap-1"
                                                >
                                                    <Edit2 size={14} />
                                                    Change
                                                </button>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="w-24 h-24 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 shadow-md">
                                                    <img
                                                        src={getPropertyImage(selectedProperty)}
                                                        alt={selectedProperty.title || 'Property'}
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400';
                                                        }}
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full mb-2 ${selectedProperty.listing_type === 'rent'
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-green-100 text-green-700'
                                                        }`}>
                                                        {selectedProperty.listing_type === 'rent' ? 'For Rent' : 'For Sale'}
                                                    </span>
                                                    <p className="font-semibold text-gray-900 dark:text-white text-lg">
                                                        {selectedProperty.title}
                                                    </p>
                                                    <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1 mb-1">
                                                        <MapPin size={14} />
                                                        {selectedProperty.address_line_1 || `${selectedProperty.city || ''} ${selectedProperty.postcode || ''}`}
                                                    </p>
                                                    <div className="flex items-center gap-3 text-sm text-gray-500">
                                                        {selectedProperty.bedrooms && (
                                                            <span className="flex items-center gap-1"><Bed size={14} /> {selectedProperty.bedrooms} beds</span>
                                                        )}
                                                        {selectedProperty.bathrooms && (
                                                            <span className="flex items-center gap-1"><Bath size={14} /> {selectedProperty.bathrooms} baths</span>
                                                        )}
                                                    </div>
                                                    <p className="text-xl font-bold text-orange-600 dark:text-orange-400 mt-2">
                                                        £{selectedProperty.price?.toLocaleString()}
                                                        {selectedProperty.listing_type === 'rent' && <span className="text-sm font-normal">/month</span>}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Recent Properties */}
                                    {!searchQuery && !selectedProperty && (
                                        <div>
                                            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                                <Sparkles size={16} className="text-orange-500" />
                                                Recent Properties
                                            </h4>
                                            {loadingRecent ? (
                                                <div className="grid grid-cols-2 gap-3">
                                                    {[1, 2, 3, 4].map((i) => (
                                                        <div key={i} className="animate-pulse bg-gray-100 dark:bg-gray-700 rounded-xl h-32" />
                                                    ))}
                                                </div>
                                            ) : recentProperties.length > 0 ? (
                                                <div className="grid grid-cols-2 gap-3">
                                                    {recentProperties.map((property) => (
                                                        <button
                                                            key={property.id}
                                                            onClick={() => handlePropertySelect(property)}
                                                            className="group text-left p-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-gray-700 transition-all"
                                                        >
                                                            <div className="w-full h-20 rounded-lg overflow-hidden bg-gray-100 mb-2">
                                                                <img
                                                                    src={getPropertyImage(property)}
                                                                    alt={property.title || 'Property'}
                                                                    className="w-full h-full object-cover"
                                                                    onError={(e) => {
                                                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400';
                                                                    }}
                                                                />
                                                            </div>
                                                            <p className="font-medium text-gray-900 dark:text-white text-sm truncate group-hover:text-orange-600">
                                                                {property.title || 'Untitled Property'}
                                                            </p>
                                                            <p className="text-xs text-gray-500 truncate">{property.city || property.postcode || 'Unknown location'}</p>
                                                            <p className="text-sm font-bold text-orange-600 mt-1">
                                                                £{property.price?.toLocaleString() || '0'}
                                                            </p>
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-center text-gray-500 py-8">No properties available</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Step 2: Personal Details */}
                            {step === 2 && (
                                <div className="space-y-5">
                                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                                        <p className="text-sm text-blue-800 dark:text-blue-300">
                                            💡 Your details help agents process your application faster. Required fields are marked with *
                                        </p>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Full Name *
                                            </label>
                                            <div className="relative">
                                                <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    ref={nameInputRef}
                                                    type="text"
                                                    name="fullName"
                                                    value={formData.fullName}
                                                    onChange={handleInputChange}
                                                    onKeyDown={handleKeyDown}
                                                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors ${formErrors.fullName ? 'border-red-500' : 'border-gray-200 dark:border-gray-600 focus:border-orange-500'
                                                        }`}
                                                    placeholder="John Smith"
                                                />
                                            </div>
                                            {formErrors.fullName && <p className="text-xs text-red-500 mt-1">{formErrors.fullName}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Email *
                                            </label>
                                            <div className="relative">
                                                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleInputChange}
                                                    onKeyDown={handleKeyDown}
                                                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors ${formErrors.email ? 'border-red-500' : 'border-gray-200 dark:border-gray-600 focus:border-orange-500'
                                                        }`}
                                                    placeholder="john@example.com"
                                                />
                                            </div>
                                            {formErrors.email && <p className="text-xs text-red-500 mt-1">{formErrors.email}</p>}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Phone Number
                                            </label>
                                            <div className="relative">
                                                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="tel"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleInputChange}
                                                    onKeyDown={handleKeyDown}
                                                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-orange-500"
                                                    placeholder="+44 7XXX XXXXXX"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Preferred Move-in Date
                                            </label>
                                            <div className="relative">
                                                <Calendar size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                <input
                                                    type="date"
                                                    name="moveInDate"
                                                    value={formData.moveInDate}
                                                    onChange={handleInputChange}
                                                    min={new Date().toISOString().split('T')[0]}
                                                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-orange-500"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-5">
                                        <h4 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                            <Briefcase size={18} className="text-orange-500" />
                                            Employment Information
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Employment Status
                                                </label>
                                                <select
                                                    name="employmentStatus"
                                                    value={formData.employmentStatus}
                                                    onChange={handleInputChange}
                                                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-orange-500"
                                                >
                                                    <option value="employed">Employed</option>
                                                    <option value="self-employed">Self-employed</option>
                                                    <option value="student">Student</option>
                                                    <option value="retired">Retired</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Annual Income (£)
                                                </label>
                                                <div className="relative">
                                                    <DollarSign size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="number"
                                                        name="annualIncome"
                                                        value={formData.annualIncome}
                                                        onChange={handleInputChange}
                                                        onKeyDown={handleKeyDown}
                                                        placeholder="e.g. 45000"
                                                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-orange-500"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Employer
                                                </label>
                                                <div className="relative">
                                                    <Building2 size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        name="employer"
                                                        value={formData.employer}
                                                        onChange={handleInputChange}
                                                        onKeyDown={handleKeyDown}
                                                        placeholder="Company name"
                                                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-orange-500"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                    Job Title
                                                </label>
                                                <div className="relative">
                                                    <Briefcase size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                                    <input
                                                        type="text"
                                                        name="jobTitle"
                                                        value={formData.jobTitle}
                                                        onChange={handleInputChange}
                                                        onKeyDown={handleKeyDown}
                                                        placeholder="Your role"
                                                        className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-orange-500"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                            Additional Notes
                                        </label>
                                        <textarea
                                            name="notes"
                                            value={formData.notes}
                                            onChange={handleInputChange}
                                            rows={3}
                                            placeholder="Any additional information you'd like to share with the agent..."
                                            className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none focus:border-orange-500"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Review */}
                            {step === 3 && (
                                <div className="space-y-4">
                                    {/* Property Summary */}
                                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-700/30 rounded-xl">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                <Home size={18} className="text-orange-500" />
                                                Property
                                            </h4>
                                            <button onClick={() => setStep(1)} className="text-orange-600 text-sm font-medium flex items-center gap-1 hover:underline">
                                                <Edit2 size={14} /> Edit
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 shadow-md">
                                                <img
                                                    src={getPropertyImage(selectedProperty)}
                                                    alt={selectedProperty?.title || 'Property'}
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400';
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white">{selectedProperty?.title || 'Property'}</p>
                                                <p className="text-sm text-gray-500 flex items-center gap-1">
                                                    <MapPin size={12} />
                                                    {selectedProperty?.address_line_1 || selectedProperty?.city || 'Unknown location'}
                                                </p>
                                                <p className="text-lg font-bold text-orange-600 mt-1">
                                                    £{selectedProperty?.price?.toLocaleString() || '0'}
                                                    {selectedProperty?.listing_type === 'rent' && '/month'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Personal Info Summary */}
                                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-700/30 rounded-xl">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                                <User size={18} className="text-orange-500" />
                                                Your Details
                                            </h4>
                                            <button onClick={() => setStep(2)} className="text-orange-600 text-sm font-medium flex items-center gap-1 hover:underline">
                                                <Edit2 size={14} /> Edit
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Name:</span>
                                                <span className="text-gray-900 dark:text-white font-medium">{formData.fullName}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Email:</span>
                                                <span className="text-gray-900 dark:text-white font-medium">{formData.email}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Phone:</span>
                                                <span className="text-gray-900 dark:text-white">{formData.phone || '—'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Move-in:</span>
                                                <span className="text-gray-900 dark:text-white">{formData.moveInDate || 'Flexible'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Employment Summary */}
                                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-700/30 rounded-xl">
                                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                            <Briefcase size={18} className="text-orange-500" />
                                            Employment
                                        </h4>
                                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Status:</span>
                                                <span className="text-gray-900 dark:text-white capitalize">{formData.employmentStatus}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Income:</span>
                                                <span className="text-gray-900 dark:text-white">
                                                    {formData.annualIncome ? `£${parseInt(formData.annualIncome).toLocaleString()}` : '—'}
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Employer:</span>
                                                <span className="text-gray-900 dark:text-white">{formData.employer || '—'}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Job:</span>
                                                <span className="text-gray-900 dark:text-white">{formData.jobTitle || '—'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {formData.notes && (
                                        <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700/50 dark:to-gray-700/30 rounded-xl">
                                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                                <FileText size={18} className="text-orange-500" />
                                                Notes
                                            </h4>
                                            <p className="text-sm text-gray-600 dark:text-gray-400">{formData.notes}</p>
                                        </div>
                                    )}

                                    {submitError && (
                                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                                            <p className="text-sm text-red-700 dark:text-red-400">{submitError}</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                {!submitSuccess && (
                    <div className="p-5 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between bg-gray-50 dark:bg-gray-800">
                        {step > 1 ? (
                            <button
                                onClick={handlePrevStep}
                                className="px-5 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl font-medium transition-colors flex items-center gap-2"
                            >
                                <ArrowLeft size={18} />
                                Back
                            </button>
                        ) : (
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 text-gray-500 hover:text-gray-700 font-medium transition-colors"
                            >
                                Cancel
                            </button>
                        )}

                        {step < 3 ? (
                            <button
                                onClick={handleNextStep}
                                disabled={step === 1 && !selectedProperty}
                                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
                            >
                                Continue
                                <ArrowRight size={18} />
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl font-semibold transition-all flex items-center gap-2 shadow-lg shadow-green-500/25"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle size={18} />
                                        Submit Application
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};

export default NewApplicationModal;
