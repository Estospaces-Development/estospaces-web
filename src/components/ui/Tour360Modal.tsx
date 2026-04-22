"use client";

import React from 'react';
import { X, ExternalLink } from 'lucide-react';

interface Tour360ModalProps {
    tourUrl?: string;
    onClose: () => void;
}

const Tour360Modal: React.FC<Tour360ModalProps> = ({ tourUrl, onClose }) => {

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-5xl bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[85vh] border border-gray-800">

                {/* Header */}
                <div className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-800 text-white">
                    <div className="flex items-center gap-2">
                        <div className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 text-xs font-bold uppercase tracking-wider border border-indigo-500/30">
                            Immersive 360°
                        </div>
                        <h3 className="font-bold text-lg">Virtual Property Tour</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        {tourUrl && (
                            <a
                                href={tourUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
                                title="Open in new tab"
                            >
                                <ExternalLink size={20} />
                            </a>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Viewer Container */}
                <div className="flex-1 bg-black relative flex flex-col items-center justify-center text-gray-400">
                    {tourUrl ? (
                        <iframe
                            width="100%"
                            height="100%"
                            src={tourUrl}
                            frameBorder="0"
                            allowFullScreen
                            allow="xr-spatial-tracking; gyroscope; accelerometer"
                            title="360 Tour"
                        ></iframe>
                    ) : (
                        <div className="text-center p-8">
                            <p className="text-xl font-bold text-white mb-2">Tour Not Available</p>
                            <p>A 360° virtual tour has not been uploaded for this property yet.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Tour360Modal;
