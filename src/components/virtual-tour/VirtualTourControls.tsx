
"use client";

import React from 'react';
import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';

interface VirtualTourControlsProps {
    onZoomIn: () => void;
    onZoomOut: () => void;
    onReset: () => void;
    onToggleFullscreen: () => void;
    isFullscreen: boolean;
}

const VirtualTourControls: React.FC<VirtualTourControlsProps> = ({
    onZoomIn,
    onZoomOut,
    onReset,
    onToggleFullscreen,
    isFullscreen,
}) => {
    return (
        <div className="absolute right-4 bottom-4 z-20 bg-black/50 backdrop-blur-sm rounded-lg p-2">
            <div className="flex flex-col gap-2">
                <button
                    onClick={onZoomIn}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"
                    title="Zoom In"
                >
                    <ZoomIn className="w-5 h-5" />
                </button>
                <button
                    onClick={onZoomOut}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"
                    title="Zoom Out"
                >
                    <ZoomOut className="w-5 h-5" />
                </button>
                <button
                    onClick={onReset}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"
                    title="Reset View"
                >
                    <RotateCcw className="w-5 h-5" />
                </button>
                <div className="h-px bg-white/20 my-1"></div>
                <button
                    onClick={onToggleFullscreen}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-all"
                    title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                >
                    {isFullscreen ? (
                        <Minimize2 className="w-5 h-5" />
                    ) : (
                        <Maximize2 className="w-5 h-5" />
                    )}
                </button>
            </div>
        </div>
    );
};

export default VirtualTourControls;
