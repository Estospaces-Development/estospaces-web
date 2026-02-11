"use client";

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
    ArrowLeft,
    Clock,
    CheckCircle2,
    FileText,
    User,
    Shield,
    Activity,
    MessageSquare,
    Phone,
    Mail,
    Send,
    PenTool,
    FileSignature,
    Eye
} from 'lucide-react';
import { FastTrackCase, FastTrackStep } from '../../../mocks/fastTrackCases';

interface FastTrackCaseDetailProps {
    caseData: FastTrackCase;
    onClose: () => void;
    onUpdate: (updatedCase: FastTrackCase) => void;
}

const FastTrackCaseDetail: React.FC<FastTrackCaseDetailProps> = ({ caseData, onClose, onUpdate }) => {
    const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'esignature'>('overview');

    // Create Envelope Modal State
    const [showEnvelopeModal, setShowEnvelopeModal] = useState(false);
    const [newEnvelope, setNewEnvelope] = useState({ name: '', recipient: caseData.clientName, type: 'agreement' });

    // Helper to calculate time elapsed/remaining
    const getTimeStatus = () => {
        if (caseData.finalStatus === 'expired') return 'expired';
        if (caseData.finalStatus === 'completed') return 'completed';
        return caseData.hoursRemaining > 0 ? 'active' : 'expired';
    };

    const timeStatus = getTimeStatus();

    // Mock timeline generation based on steps
    const getTimeline = () => {
        const steps: { step: FastTrackStep; label: string; description: string }[] = [
            { step: 'documents', label: 'Documents Verification', description: 'Identity and income proof checks' },
            { step: 'owner_approval', label: 'Owner Approval', description: 'Property owner confirmation pending' },
            { step: 'legal_check', label: 'Legal Check', description: 'Contract and compliance verification' },
            { step: 'payment_ready', label: 'Payment Processing', description: 'Initial deposit and fee handling' },
            { step: 'completed', label: 'Ready for Handover', description: 'Process completed successfully' }
        ];

        const currentIndex = steps.findIndex(s => s.step === caseData.currentStep);

        return steps.map((s, index) => ({
            ...s,
            status: index < currentIndex ? 'completed' : index === currentIndex ? 'current' : 'pending',
            date: index <= currentIndex ? new Date(new Date(caseData.submittedAt).getTime() + index * 3600000).toISOString() : null
        }));
    };

    const timeline = getTimeline();

    // Mock E-Signature Documents
    const [esignDocs, setEsignDocs] = useState([
        { id: 1, name: 'Tenancy Agreement', status: 'pending', recipient: caseData.clientName },
        { id: 2, name: 'Direct Debit Mandate', status: 'signed', recipient: caseData.clientName },
        { id: 3, name: 'Inventory Check-in', status: 'pending', recipient: caseData.clientName }
    ]);

    const handleSignRequest = (id: number) => {
        setEsignDocs(prev => prev.map(doc => doc.id === id ? { ...doc, status: 'sent' as string } : doc));
    };

    // Handle Document Verification
    const toggleDocument = (docType: keyof typeof caseData.documents) => {
        const newStatus = caseData.documents[docType] === 'verified' ? 'pending' : 'verified';
        const updatedDocs = { ...caseData.documents, [docType]: newStatus };

        const updatedCase = {
            ...caseData,
            documents: updatedDocs,
            // Simple auto-advance for demo if current step is documents
            currentStep: (caseData.currentStep === 'documents' && Object.values(updatedDocs).every(s => s === 'verified'))
                ? 'owner_approval' as FastTrackStep
                : caseData.currentStep
        };

        onUpdate(updatedCase);
    };

    const advanceStep = () => {
        const steps: FastTrackStep[] = ['documents', 'owner_approval', 'legal_check', 'payment_ready', 'completed'];
        const currentIndex = steps.indexOf(caseData.currentStep);
        if (currentIndex < steps.length - 1) {
            const nextStep = steps[currentIndex + 1];
            const updatedCase = {
                ...caseData,
                currentStep: nextStep,
                finalStatus: nextStep === 'completed' ? 'completed' : caseData.finalStatus
            } as FastTrackCase; // Type assertion needed here
            onUpdate(updatedCase);
        }
    };

    return (
        <div className="bg-white dark:bg-black rounded-2xl shadow-sm border border-gray-200 dark:border-zinc-800 flex flex-col h-full animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 dark:border-zinc-800 sticky top-0 bg-white/80 dark:bg-black/80 backdrop-blur-md z-10 rounded-t-2xl">
                <div className="flex flex-col gap-4">
                    {/* Top Row */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                            </button>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                    {caseData.propertyTitle}
                                    <span className={`px-2.5 py-0.5 text-xs rounded-full font-medium border ${caseData.propertyType === 'rent' ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' :
                                        caseData.propertyType === 'buy' ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800' :
                                            'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
                                        }`}>
                                        {caseData.propertyType.toUpperCase()}
                                    </span>
                                </h2>
                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                    ID: {caseData.caseId} • Submitted {new Date(caseData.submittedAt).toLocaleDateString()}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border ${timeStatus === 'expired' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:border-red-800' :
                                timeStatus === 'completed' ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:border-green-800' :
                                    'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
                                }`}>
                                {timeStatus === 'completed' ? <CheckCircle2 size={18} /> : <Clock size={18} className={timeStatus === 'active' ? 'animate-pulse' : ''} />}
                                <span className="font-bold">
                                    {timeStatus === 'completed' ? 'Completed' :
                                        timeStatus === 'expired' ? 'Expired' :
                                            `${caseData.hoursRemaining}h remaining`}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-2 border-b border-gray-100 dark:border-zinc-800 pb-1">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'overview' ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            <Activity size={16} />
                            Overview & Tracking
                        </button>
                        <button
                            onClick={() => setActiveTab('documents')}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'documents' ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            <Shield size={16} />
                            Documents
                        </button>
                        <button
                            onClick={() => setActiveTab('esignature')}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 ${activeTab === 'esignature' ? 'bg-gray-100 dark:bg-zinc-800 text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
                        >
                            <PenTool size={16} />
                            E-Signature
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Main Content Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">

                    {/* Overview Tab Content */}
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* Status Tracker (Timeline) */}
                            <div className="bg-gray-50 dark:bg-zinc-900/50 rounded-2xl p-6 border border-gray-100 dark:border-zinc-800">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                        <Activity className="text-indigo-500" size={20} />
                                        Application Tracking
                                    </h3>
                                    <span className="text-xs font-medium px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" />
                                        Live Updates
                                    </span>
                                </div>

                                <div className="relative pl-4">
                                    {/* Vertical Line */}
                                    <div className="absolute left-[19px] top-4 bottom-4 w-0.5 bg-gray-200 dark:bg-zinc-800" />

                                    <div className="space-y-8 relative">
                                        {timeline.map((step, idx) => (
                                            <div key={idx} className="flex gap-4 relative">
                                                {/* Status Dot */}
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-4 z-10 bg-white dark:bg-black transition-all duration-500 ${step.status === 'completed' ? 'border-green-500 text-green-500' :
                                                    step.status === 'current' ? 'border-indigo-500 text-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.2)]' :
                                                        'border-gray-200 dark:border-zinc-700 text-gray-300 dark:text-zinc-600'
                                                    }`}>
                                                    {step.status === 'completed' ? <CheckCircle2 size={20} /> :
                                                        step.status === 'current' ? <div className="w-3 h-3 bg-indigo-500 rounded-full animate-ping" /> :
                                                            <div className="w-3 h-3 bg-gray-200 dark:bg-zinc-700 rounded-full" />
                                                    }
                                                </div>

                                                {/* Content */}
                                                <div className={`flex-1 pt-1 ${step.status === 'pending' ? 'opacity-50' : ''}`}>
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className={`font-semibold text-base ${step.status === 'current' ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-900 dark:text-white'}`}>
                                                                {step.label}
                                                            </h4>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{step.description}</p>
                                                        </div>
                                                        {step.date && (
                                                            <span className="text-xs font-medium text-gray-400 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
                                                                {new Date(step.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Action Button for Current Step */}
                                                    {step.status === 'current' && (
                                                        <div className="mt-3">
                                                            <button
                                                                onClick={advanceStep}
                                                                className="text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                                                            >
                                                                Mark as Complete
                                                                <ArrowLeft className="w-4 h-4 rotate-180" />
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Client Info */}
                            <div className="bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-2xl p-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                    <User className="text-blue-500" size={20} />
                                    Client Details
                                </h3>
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gray-200 dark:bg-zinc-800 rounded-full flex items-center justify-center text-xl font-bold text-gray-600 dark:text-gray-400">
                                        {caseData.clientName.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white text-lg">{caseData.clientName}</p>
                                        <p className="text-sm text-gray-500">Premium Client</p>
                                    </div>
                                </div>
                                <div className="flex gap-2 mt-4">
                                    <button className="flex-1 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
                                        <Phone size={16} />
                                        Call
                                    </button>
                                    <button className="flex-1 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
                                        <MessageSquare size={16} />
                                        Chat
                                    </button>
                                    <button className="flex-1 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
                                        <Mail size={16} />
                                        Email
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Documents Tab Content */}
                    {activeTab === 'documents' && (
                        <div className="bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-2xl p-6">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Shield className="text-orange-500" size={20} />
                                Required Documents
                            </h3>
                            <div className="space-y-3">
                                {Object.entries(caseData.documents).map(([key, status]) => (
                                    <div key={key} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-zinc-900/50 rounded-xl border border-gray-100 dark:border-zinc-800">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${status === 'verified' ? 'bg-green-100 dark:bg-green-900/30 text-green-600' : 'bg-gray-200 dark:bg-zinc-700 text-gray-500'
                                                }`}>
                                                <FileText size={18} />
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 dark:text-white capitalize">
                                                    {key.replace(/([A-Z])/g, ' $1').trim()}
                                                </p>
                                                <p className="text-xs text-gray-500">{status}</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="p-2 text-gray-500 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-lg transition-colors">
                                                <Eye size={16} />
                                            </button>
                                            <button
                                                onClick={() => toggleDocument(key as keyof typeof caseData.documents)}
                                                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${status === 'verified'
                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400'
                                                    }`}
                                            >
                                                {status === 'verified' ? 'Verified' : 'Verify'}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* E-Signature Tab Content */}
                    {activeTab === 'esignature' && (
                        <div className="bg-white dark:bg-black border border-gray-200 dark:border-zinc-800 rounded-2xl p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <FileSignature className="text-purple-500" size={20} />
                                    Digital Signatures
                                </h3>
                                <button
                                    onClick={() => setShowEnvelopeModal(true)}
                                    className="text-sm bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors font-medium shadow-md shadow-purple-500/20 flex items-center gap-2"
                                >
                                    <PenTool size={16} />
                                    Create New Envelope
                                </button>
                            </div>

                            <div className="space-y-4">
                                {esignDocs.map(doc => (
                                    <div key={doc.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-zinc-900/50 rounded-xl border border-gray-100 dark:border-zinc-800">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-xl">
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-semibold text-gray-900 dark:text-white">{doc.name}</h4>
                                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                                    Recipient: {doc.recipient}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${doc.status === 'signed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                                doc.status === 'sent' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                    'bg-gray-200 text-gray-600 dark:bg-zinc-800 dark:text-gray-400'
                                                }`}>
                                                {doc.status.toUpperCase()}
                                            </span>

                                            {doc.status === 'pending' && (
                                                <button
                                                    onClick={() => handleSignRequest(doc.id)}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 dark:bg-zinc-800 dark:border-zinc-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-zinc-700 transition-colors"
                                                >
                                                    <Send size={14} />
                                                    Send
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Create Envelope Modal */}
            {showEnvelopeModal && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-zinc-800 p-6 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <FileSignature className="text-purple-500" size={24} />
                                New Envelope
                            </h3>
                            <button
                                onClick={() => setShowEnvelopeModal(false)}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 rotate-180 text-gray-500" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Document Name
                                </label>
                                <input
                                    type="text"
                                    value={newEnvelope.name}
                                    onChange={(e) => setNewEnvelope({ ...newEnvelope, name: e.target.value })}
                                    placeholder="e.g. Lease Renewal Agreement"
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Recipient
                                </label>
                                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700">
                                    <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center text-purple-700 dark:text-purple-400 font-bold text-sm">
                                        {caseData.clientName.charAt(0)}
                                    </div>
                                    <span className="text-gray-900 dark:text-white font-medium">{caseData.clientName}</span>
                                    <span className="ml-auto text-xs text-gray-500">(Client)</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    Document Type
                                </label>
                                <select
                                    className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    value={newEnvelope.type}
                                    onChange={(e) => setNewEnvelope({ ...newEnvelope, type: e.target.value })}
                                >
                                    <option value="agreement">Tenancy Agreement</option>
                                    <option value="addendum">Addendum</option>
                                    <option value="inventory">Inventory Report</option>
                                    <option value="invoice">Invoice / Receipt</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8">
                            <button
                                onClick={() => setShowEnvelopeModal(false)}
                                className="flex-1 py-2.5 text-gray-600 dark:text-gray-400 font-medium hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    if (!newEnvelope.name) return;
                                    setEsignDocs([...esignDocs, {
                                        id: Date.now(),
                                        name: newEnvelope.name,
                                        status: 'pending',
                                        recipient: newEnvelope.recipient
                                    }]);
                                    setShowEnvelopeModal(false);
                                    setNewEnvelope({ name: '', recipient: caseData.clientName, type: 'agreement' });
                                }}
                                disabled={!newEnvelope.name}
                                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors shadow-lg shadow-purple-500/20"
                            >
                                Create & Send
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default FastTrackCaseDetail;
