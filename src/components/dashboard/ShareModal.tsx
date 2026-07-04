"use client";

import React, { useState } from 'react';
import { X, Copy, Check, Share2, Mail, MessageCircle, Twitter, Facebook, Linkedin } from 'lucide-react';

interface ShareModalProps {
    property: {
        id: string;
        title: string;
        address_line_1?: string;
        city?: string;
    };
    onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ property, onClose }) => {
    const [copied, setCopied] = useState(false);
    const shareUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/property/${property.id}`
        : `https://estospaces.com/property/${property.id}`;
    const encodedSubject = encodeURIComponent(`Check out this property: ${property.title}`);
    const encodedText = encodeURIComponent(`Check out this property: ${property.title} - ${shareUrl}`);
    const encodedUrl = encodeURIComponent(shareUrl);

    const handleCopy = () => {
        navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const shareOptions = [
        { name: 'Email', icon: Mail, color: 'text-gray-600', bg: 'bg-gray-100', action: () => window.open(`mailto:?subject=${encodedSubject}&body=${encodedUrl}`) },
        { name: 'WhatsApp', icon: MessageCircle, color: 'text-green-600', bg: 'bg-green-100', action: () => window.open(`https://wa.me/?text=${encodedText}`) },
        { name: 'Twitter', icon: Twitter, color: 'text-blue-400', bg: 'bg-blue-50', action: () => window.open(`https://twitter.com/intent/tweet?text=${encodedSubject}&url=${encodedUrl}`) },
        { name: 'Facebook', icon: Facebook, color: 'text-blue-600', bg: 'bg-blue-100', action: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`) },
        { name: 'LinkedIn', icon: Linkedin, color: 'text-blue-700', bg: 'bg-blue-50', action: () => window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`) },
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="share-property-title"
                aria-describedby="share-property-description"
                className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md p-6 shadow-2xl relative transition-all transform scale-100"
            >
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close share property dialog"
                    className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="mb-6">
                    <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-4">
                        <Share2 className="text-orange-600 dark:text-orange-400" size={24} />
                    </div>
                    <h3 id="share-property-title" className="text-xl font-bold text-gray-900 dark:text-white">Share this property</h3>
                    <p id="share-property-description" className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        {property.title}
                    </p>
                </div>

                {/* Copy Link Section */}
                <div className="mb-6">
                    <label htmlFor="share-property-link" className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                        Property Link
                    </label>
                    <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                        <input
                            id="share-property-link"
                            type="text"
                            readOnly
                            value={shareUrl}
                            className="flex-1 bg-transparent text-sm text-gray-600 dark:text-gray-300 outline-none w-full"
                        />
                        <button
                            type="button"
                            onClick={handleCopy}
                            aria-label={copied ? 'Property link copied' : 'Copy property link'}
                            className={`p-2 rounded-md transition-all ${copied
                                    ? 'bg-green-500 text-white'
                                    : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 shadow-sm'
                                }`}
                        >
                            {copied ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                    </div>
                </div>

                {/* Social Share Options */}
                <div className="grid grid-cols-5 gap-2">
                    {shareOptions.map((option) => (
                        <button
                            type="button"
                            key={option.name}
                            onClick={option.action}
                            aria-label={`Share property via ${option.name}`}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className={`w-12 h-12 flex items-center justify-center rounded-full transition-transform group-hover:scale-110 ${option.bg} ${option.color}`}>
                                <option.icon size={20} />
                            </div>
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">{option.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ShareModal;
