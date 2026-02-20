"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X,
    Facebook,
    Twitter,
    Linkedin,
    MessageCircle,
    Mail,
    Link2,
    Copy,
    CheckCircle,
    Share2
} from 'lucide-react';
import Toast from '@/components/ui/Toast';
import { Property } from '@/contexts/PropertyContext'; // Import generic Property type if possible or define locally

interface SharePropertyModalProps {
    isOpen: boolean;
    onClose: () => void;
    property: Property | null;
    onShare?: (platform: string) => void;
}

const SharePropertyModal = ({ isOpen, onClose, property, onShare }: SharePropertyModalProps) => {
    const [copied, setCopied] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error'; visible: boolean }>({
        message: '',
        type: 'success',
        visible: false,
    });

    if (!property) return null;

    const url = typeof window !== 'undefined' ? `${window.location.origin}/manager/dashboard/properties/edit/${property.id}` : '';
    const propertyImage = property.media?.images?.[0]?.url || (typeof property.images?.[0] === 'string' ? property.images[0] : '') || '';
    const price = property.priceString || (property.price?.amount ? `${property.price?.currency} ${property.price?.amount}` : 'Price on Request');

    const locationStr = property.location
        ? `${property.location.city || ''}${property.location.city && property.location.state ? ', ' : ''}${property.location.state || ''}`
        : property.address || '';

    const description = property.description?.slice(0, 200) || `${property.title} - ${price}`;

    const sharePlatforms = [
        {
            id: 'facebook',
            name: 'Facebook',
            icon: Facebook,
            color: 'bg-blue-600 hover:bg-blue-700',
            iconColor: 'text-white',
        },
        {
            id: 'twitter',
            name: 'Twitter / X',
            icon: Twitter,
            color: 'bg-black dark:bg-gray-800 hover:bg-gray-900',
            iconColor: 'text-white',
        },
        {
            id: 'linkedin',
            name: 'LinkedIn',
            icon: Linkedin,
            color: 'bg-blue-700 hover:bg-blue-800',
            iconColor: 'text-white',
        },
        {
            id: 'whatsapp',
            name: 'WhatsApp',
            icon: MessageCircle,
            color: 'bg-green-600 hover:bg-green-700',
            iconColor: 'text-white',
        },
        {
            id: 'email',
            name: 'Email',
            icon: Mail,
            color: 'bg-gray-600 hover:bg-gray-700',
            iconColor: 'text-white',
        },
        {
            id: 'copy',
            name: 'Copy Link',
            icon: Copy,
            color: 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700',
            iconColor: 'text-gray-700 dark:text-gray-300',
        },
    ];

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({ message, type, visible: true });
        // Toast component handles auto-dismiss via duration prop
    };

    const handleToastClose = () => {
        setToast(prev => ({ ...prev, visible: false }));
    };

    const handleShare = async (platform: string, e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        try {
            switch (platform) {
                case 'copy': {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        try {
                            await navigator.clipboard.writeText(url);
                            setCopied(true);
                            showToast('Link copied to clipboard!', 'success');
                            setTimeout(() => setCopied(false), 2000);
                            if (onShare) onShare(platform);
                            return;
                        } catch (clipboardError) {
                            console.warn('Clipboard API failed', clipboardError);
                        }
                    }
                    // Fallback
                    const textArea = document.createElement('textarea');
                    textArea.value = url;
                    textArea.style.position = 'fixed';
                    textArea.style.left = '-999999px';
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    setCopied(true);
                    showToast('Link copied to clipboard!', 'success');
                    setTimeout(() => setCopied(false), 2000);
                    if (onShare) onShare(platform);
                    return;
                }
                case 'facebook': {
                    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
                    window.open(shareUrl, '_blank', 'width=626,height=436');
                    if (onShare) onShare(platform);
                    break;
                }
                case 'twitter': {
                    const text = `${property.title} - ${price}\n${url}`;
                    const shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
                    window.open(shareUrl, '_blank', 'width=550,height=420');
                    if (onShare) onShare(platform);
                    break;
                }
                case 'linkedin': {
                    const shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
                    window.open(shareUrl, '_blank', 'width=520,height=570');
                    if (onShare) onShare(platform);
                    break;
                }
                case 'whatsapp': {
                    const text = `🏠 *${property.title}*\n\n${price}\n${url}`;
                    const shareUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
                    window.open(shareUrl, '_blank');
                    if (onShare) onShare(platform);
                    break;
                }
                case 'email': {
                    const subject = encodeURIComponent(`${property.title} - Property Listing`);
                    const body = encodeURIComponent(`Check out this property:\n\n${property.title}\n${price}\n\nView property: ${url}`);
                    window.location.href = `mailto:?subject=${subject}&body=${body}`;
                    if (onShare) onShare(platform);
                    break;
                }
            }
        } catch (error: any) {
            console.error('Error sharing:', error);
            showToast('Failed to share', 'error');
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                        >
                            <div
                                className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto pointer-events-auto"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Header */}
                                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-800">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                            <Share2 className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Share Property</h2>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">Share this property with others</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Property Preview */}
                                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                                    <div className="flex gap-4">
                                        {propertyImage && (
                                            <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100 dark:bg-gray-800">
                                                <img
                                                    src={propertyImage}
                                                    alt={property.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1 line-clamp-2">
                                                {property.title}
                                            </h3>
                                            <p className="text-lg font-bold text-primary mb-2">
                                                {price}
                                            </p>
                                            {locationStr && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                    <Link2 className="w-3 h-3" />
                                                    {locationStr}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Share Platforms */}
                                <div className="p-6">
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Share on</h3>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {sharePlatforms.map((platform) => {
                                            const Icon = platform.icon;
                                            const isCopied = platform.id === 'copy' && copied;

                                            return (
                                                <button
                                                    key={platform.id}
                                                    type="button"
                                                    onClick={(e) => handleShare(platform.id, e)}
                                                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer ${isCopied
                                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                                        : 'border-gray-200 dark:border-gray-700 hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 active:scale-95'
                                                        }`}
                                                >
                                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${platform.color} transition-colors`}>
                                                        {isCopied ? (
                                                            <CheckCircle className="w-6 h-6 text-white" />
                                                        ) : (
                                                            <Icon className={`w-6 h-6 ${platform.iconColor}`} />
                                                        )}
                                                    </div>
                                                    <span className={`text-sm font-medium ${isCopied ? 'text-green-600 dark:text-green-400' : 'text-gray-700 dark:text-gray-300'}`}>
                                                        {isCopied ? 'Copied!' : platform.name}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {/* Copy Link Section */}
                                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                            Property URL
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                value={url}
                                                readOnly
                                                className="flex-1 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300"
                                            />
                                            <button
                                                type="button"
                                                onClick={(e) => handleShare('copy', e)}
                                                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 cursor-pointer active:scale-95 ${copied
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-primary text-white hover:bg-primary/90'
                                                    }`}
                                            >
                                                {copied ? (
                                                    <>
                                                        <CheckCircle className="w-4 h-4" />
                                                        Copied
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="w-4 h-4" />
                                                        Copy
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            <Toast
                id="share-modal-toast"
                message={toast.message}
                type={toast.type}
                isVisible={toast.visible}
                onClose={handleToastClose}
                duration={3000}
            />
        </>
    );
};

export default SharePropertyModal;
