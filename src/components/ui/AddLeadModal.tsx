'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import {
    LeadScoreInputValue,
    normalizeLeadScoreInitialValue,
    normalizeLeadScoreInputValue,
    serializeLeadScoreInputValue,
} from '@/lib/leadScoreInput';
import { LAUNCH_CURRENCY_CODE } from '@/lib/launchLocale';

interface Lead {
    id?: string;
    name: string;
    email: string;
    phone?: string;
    propertyInterested: string;
    status: string;
    score: number;
    budget: string;
    lastContact: string;
}

interface AddLeadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (lead: Omit<Lead, 'id'>) => void;
    existingLead?: Lead | null;
    properties?: Array<{ id: string; title: string; address?: string; price?: string }>;
}

type LeadFormData = Omit<Lead, 'id' | 'score'> & {
    score: LeadScoreInputValue;
};

const emptyLeadForm = (): LeadFormData => ({
    name: '',
    email: '',
    phone: '',
    propertyInterested: '',
    status: 'New Lead',
    score: '',
    budget: '',
    lastContact: 'Just now',
});

const AddLeadModal = ({
    isOpen,
    onClose,
    onSave,
    existingLead,
    properties = [],
}: AddLeadModalProps) => {
    const [formData, setFormData] = useState<LeadFormData>(() => ({
        ...emptyLeadForm(),
        name: existingLead?.name || '',
        email: existingLead?.email || '',
        phone: existingLead?.phone || '',
        propertyInterested: existingLead?.propertyInterested || '',
        status: existingLead?.status || 'New Lead',
        score: normalizeLeadScoreInitialValue(existingLead?.score),
        budget: existingLead?.budget || '',
        lastContact: existingLead?.lastContact || 'Just now',
    }));

    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (existingLead) {
            setFormData({
                name: existingLead.name,
                email: existingLead.email,
                phone: existingLead.phone || '',
                propertyInterested: existingLead.propertyInterested,
                status: existingLead.status,
                score: normalizeLeadScoreInitialValue(existingLead.score),
                budget: existingLead.budget,
                lastContact: existingLead.lastContact,
            });
        } else {
            setFormData(emptyLeadForm());
        }
        setErrors({});
    }, [existingLead, isOpen]);

    const handleInputChange = (field: keyof typeof formData, value: string | number) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }
        if (!formData.propertyInterested.trim()) {
            newErrors.propertyInterested = 'Property interested is required';
        }
        const score = serializeLeadScoreInputValue(formData.score);
        if (score < 0 || score > 100) {
            newErrors.score = 'Score must be between 0 and 100';
        }
        if (!formData.budget.trim()) {
            newErrors.budget = 'Budget is required';
        }
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!validate()) {
            return;
        }

        onSave({
            ...formData,
            score: serializeLeadScoreInputValue(formData.score),
        });
        setFormData(emptyLeadForm());
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="manual-lead-modal-title"
                className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-800 shadow-xl"
            >
                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 p-6 flex items-center justify-between z-10">
                    <h2 id="manual-lead-modal-title" className="text-xl font-bold text-gray-800 dark:text-white">
                        {existingLead ? 'Edit Lead' : 'Add New Lead'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                        aria-label="Close manual lead modal"
                    >
                        <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="manual-lead-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name *</label>
                            <input
                                id="manual-lead-name"
                                type="text"
                                value={formData.name}
                                onChange={(event) => handleInputChange('name', event.target.value)}
                                aria-invalid={Boolean(errors.name)}
                                aria-describedby={errors.name ? 'manual-lead-name-error' : undefined}
                                className={`w-full px-4 py-2 bg-white dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:text-white dark:placeholder-gray-500 ${errors.name ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                                placeholder="Enter lead name"
                            />
                            {errors.name && <p id="manual-lead-name-error" role="alert" className="text-red-600 dark:text-red-300 text-xs mt-1">{errors.name}</p>}
                        </div>

                        <div>
                            <label htmlFor="manual-lead-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email *</label>
                            <input
                                id="manual-lead-email"
                                type="email"
                                value={formData.email}
                                onChange={(event) => handleInputChange('email', event.target.value)}
                                aria-invalid={Boolean(errors.email)}
                                aria-describedby={errors.email ? 'manual-lead-email-error' : undefined}
                                className={`w-full px-4 py-2 bg-white dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:text-white dark:placeholder-gray-500 ${errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                                placeholder="Enter email address"
                            />
                            {errors.email && <p id="manual-lead-email-error" role="alert" className="text-red-600 dark:text-red-300 text-xs mt-1">{errors.email}</p>}
                        </div>

                        <div>
                            <label htmlFor="manual-lead-phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                            <input
                                id="manual-lead-phone"
                                type="tel"
                                value={formData.phone}
                                onChange={(event) => handleInputChange('phone', event.target.value)}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:text-white dark:placeholder-gray-500"
                                placeholder="Enter phone number"
                            />
                        </div>

                        <div>
                            <label htmlFor="manual-lead-status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status *</label>
                            <select
                                id="manual-lead-status"
                                value={formData.status}
                                onChange={(event) => handleInputChange('status', event.target.value)}
                                className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:text-white"
                            >
                                <option value="New Lead">New Lead</option>
                                <option value="In Progress">In Progress</option>
                                <option value="Approved">Approved</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="manual-lead-property" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Property Interested *</label>
                            {properties.length > 0 ? (
                                <select
                                    id="manual-lead-property"
                                    value={formData.propertyInterested}
                                    onChange={(event) => handleInputChange('propertyInterested', event.target.value)}
                                    aria-invalid={Boolean(errors.propertyInterested)}
                                    aria-describedby={errors.propertyInterested ? 'manual-lead-property-error' : undefined}
                                    className={`w-full px-4 py-2 bg-white dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:text-white ${errors.propertyInterested ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                                >
                                    <option value="">Select a property</option>
                                    {properties.map((property) => {
                                        const displayText = property.address
                                            ? `${property.title} - ${property.address}${property.price ? ` (${property.price})` : ''}`
                                            : property.price
                                                ? `${property.title} (${property.price})`
                                                : property.title;
                                        return (
                                            <option key={property.id} value={property.title}>{displayText}</option>
                                        );
                                    })}
                                    {formData.propertyInterested && !properties.find((property) => property.title === formData.propertyInterested) && (
                                        <option value={formData.propertyInterested}>{formData.propertyInterested}</option>
                                    )}
                                </select>
                            ) : (
                                <div className="space-y-2">
                                    <input
                                        id="manual-lead-property"
                                        type="text"
                                        value={formData.propertyInterested}
                                        onChange={(event) => handleInputChange('propertyInterested', event.target.value)}
                                        aria-invalid={Boolean(errors.propertyInterested)}
                                        aria-describedby={errors.propertyInterested ? 'manual-lead-property-error' : 'manual-lead-property-hint'}
                                        className={`w-full px-4 py-2 bg-white dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:text-white dark:placeholder-gray-500 ${errors.propertyInterested ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                                        placeholder="Enter property name (no properties available)"
                                    />
                                    <p id="manual-lead-property-hint" className="text-xs text-gray-500 dark:text-gray-400">No properties available. Please add properties first or enter manually.</p>
                                </div>
                            )}
                            {errors.propertyInterested && <p id="manual-lead-property-error" role="alert" className="text-red-600 dark:text-red-300 text-xs mt-1">{errors.propertyInterested}</p>}
                        </div>

                        <div>
                            <label htmlFor="manual-lead-score" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Score (0-100) *</label>
                            <input
                                id="manual-lead-score"
                                type="number"
                                min="0"
                                max="100"
                                value={formData.score}
                                onChange={(event) => handleInputChange('score', normalizeLeadScoreInputValue(event.target.value))}
                                aria-invalid={Boolean(errors.score)}
                                aria-describedby={errors.score ? 'manual-lead-score-error' : undefined}
                                className={`w-full px-4 py-2 bg-white dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:text-white dark:placeholder-gray-500 ${errors.score ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                                placeholder="Enter score"
                            />
                            {errors.score && <p id="manual-lead-score-error" role="alert" className="text-red-600 dark:text-red-300 text-xs mt-1">{errors.score}</p>}
                        </div>

                        <div>
                            <label htmlFor="manual-lead-budget" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Budget *</label>
                            <input
                                id="manual-lead-budget"
                                type="text"
                                value={formData.budget}
                                onChange={(event) => handleInputChange('budget', event.target.value)}
                                aria-invalid={Boolean(errors.budget)}
                                aria-describedby={errors.budget ? 'manual-lead-budget-error' : undefined}
                                className={`w-full px-4 py-2 bg-white dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:text-white dark:placeholder-gray-500 ${errors.budget ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`}
                                placeholder={`e.g., ${LAUNCH_CURRENCY_CODE} 25,000/mo`}
                            />
                            {errors.budget && <p id="manual-lead-budget-error" role="alert" className="text-red-600 dark:text-red-300 text-xs mt-1">{errors.budget}</p>}
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-gray-100 dark:border-gray-800">
                        <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors">
                            {existingLead ? 'Update Lead' : 'Create Lead'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body,
    );
};

export default AddLeadModal;
