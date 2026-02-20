'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface Appointment {
    id?: string;
    clientName: string;
    date: string;
    time: string;
    description: string;
    status: string;
    property?: string;
    phone?: string;
    email?: string;
}

interface AddAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (appointment: Omit<Appointment, 'id'>) => void;
    selectedDate?: Date;
    existingAppointment?: Appointment | null;
}

const AddAppointmentModal = ({
    isOpen,
    onClose,
    onSave,
    selectedDate,
    existingAppointment,
}: AddAppointmentModalProps) => {
    const [formData, setFormData] = useState<Omit<Appointment, 'id'>>({
        clientName: existingAppointment?.clientName || '',
        date: existingAppointment?.date || (selectedDate ? selectedDate.toISOString().split('T')[0] : ''),
        time: existingAppointment?.time || '',
        description: existingAppointment?.description || '',
        status: existingAppointment?.status || 'Pending',
        property: existingAppointment?.property || '',
        phone: existingAppointment?.phone || '',
        email: existingAppointment?.email || '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    const handleInputChange = (field: keyof typeof formData, value: string) => {
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
        if (!formData.clientName.trim()) newErrors.clientName = 'Client name is required';
        if (!formData.date) newErrors.date = 'Date is required';
        if (!formData.time) newErrors.time = 'Time is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            onSave(formData);
            setFormData({
                clientName: '',
                date: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
                time: '',
                description: '',
                status: 'Pending',
                property: '',
                phone: '',
                email: '',
            });
            onClose();
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
            <div className="bg-white dark:bg-gray-900 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800 shadow-2xl">
                <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-6 flex items-center justify-between z-10">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">
                        {existingAppointment ? 'Edit Appointment' : 'Add New Appointment'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Client Name *</label>
                            <input type="text" value={formData.clientName} onChange={(e) => handleInputChange('clientName', e.target.value)} className={`w-full px-4 py-2 bg-white dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:text-white ${errors.clientName ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`} placeholder="Enter client name" />
                            {errors.clientName && <p className="text-red-500 text-xs mt-1">{errors.clientName}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status *</label>
                            <select value={formData.status} onChange={(e) => handleInputChange('status', e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:text-white">
                                <option value="Pending">Pending</option>
                                <option value="Confirmed">Confirmed</option>
                                <option value="Completed">Completed</option>
                                <option value="Cancelled">Cancelled</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date *</label>
                            <input type="date" value={formData.date} onChange={(e) => handleInputChange('date', e.target.value)} className={`w-full px-4 py-2 bg-white dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:text-white ${errors.date ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`} />
                            {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Time *</label>
                            <input type="time" value={formData.time} onChange={(e) => handleInputChange('time', e.target.value)} className={`w-full px-4 py-2 bg-white dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:text-white ${errors.time ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`} />
                            {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Property</label>
                            <input type="text" value={formData.property} onChange={(e) => handleInputChange('property', e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:text-white" placeholder="Enter property name" />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone</label>
                            <input type="tel" value={formData.phone} onChange={(e) => handleInputChange('phone', e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:text-white" placeholder="Enter phone number" />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                            <input type="email" value={formData.email} onChange={(e) => handleInputChange('email', e.target.value)} className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:text-white" placeholder="Enter email address" />
                        </div>

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description *</label>
                            <textarea value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} rows={4} className={`w-full px-4 py-2 bg-white dark:bg-gray-800 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary dark:text-white ${errors.description ? 'border-red-500' : 'border-gray-300 dark:border-gray-700'}`} placeholder="Enter appointment description" />
                            {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-800">
                        <button type="button" onClick={onClose} className="px-6 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                            Cancel
                        </button>
                        <button type="submit" className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors">
                            {existingAppointment ? 'Update Appointment' : 'Create Appointment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body,
    );
};

export default AddAppointmentModal;
