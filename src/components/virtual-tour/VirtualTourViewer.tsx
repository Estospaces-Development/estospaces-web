
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { VirtualTour } from '../../mocks/virtualTourMock';
import VirtualTourSceneList from './VirtualTourSceneList';
import VirtualTourControls from './VirtualTourControls';
import VirtualTourHotspots from './VirtualTourHotspots';
import VirtualTourViewer3D from './VirtualTourViewer3D';

interface VirtualTourViewerProps {
    tour: VirtualTour;
    initialSceneId?: string;
    onClose?: () => void;
    embedded?: boolean;
}

const VirtualTourViewer: React.FC<VirtualTourViewerProps> = ({
    tour,
    initialSceneId,
    onClose,
    embedded = false,
}) => {
    const [currentSceneId, setCurrentSceneId] = useState<string>(
        initialSceneId || tour.scenes[0]?.id
    );
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [rotation, setRotation] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [loading, setLoading] = useState(true);
    const [transitioning, setTransitioning] = useState(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const lastMousePos = useRef({ x: 0, y: 0 });

    const currentScene = tour.scenes.find(s => s.id === currentSceneId);

    // Determine if scene is EXR/High-Quality 3D
    const is3DScene = currentScene?.type === 'exr' || currentScene?.panoramaUrl.endsWith('.exr');

    useEffect(() => {
        if (!currentScene) return;

        // Reset state on scene change
        setRotation({ x: 0, y: 0 });
        setZoom(1);

        if (!is3DScene) {
            setLoading(true);
            const img = new Image();
            img.src = currentScene.panoramaUrl || '';
            img.onload = () => setLoading(false);
            img.onerror = () => setLoading(false);
        } else {
            // 3D Viewer handles its own loading state
            setLoading(false);
        }
    }, [currentScene, is3DScene]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (is3DScene) return; // 3D viewer handles its own interaction
        setIsDragging(true);
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || is3DScene) return;

        const deltaX = e.clientX - lastMousePos.current.x;
        const deltaY = e.clientY - lastMousePos.current.y;

        setRotation(prev => ({
            x: Math.max(-30, Math.min(30, prev.x + deltaY * 0.2)),
            y: prev.y + deltaX * 0.3,
        }));

        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleSceneChange = (sceneId: string) => {
        if (sceneId === currentSceneId) return;
        setTransitioning(true);
        setTimeout(() => {
            setCurrentSceneId(sceneId);
            setTransitioning(false);
        }, 300);
    };

    const handleZoomIn = () => {
        setZoom(prev => Math.min(2, prev + 0.2));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(0.5, prev - 0.2));
    };

    const handleReset = () => {
        setRotation({ x: 0, y: 0 });
        setZoom(1);
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            containerRef.current?.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    if (!currentScene) {
        return (
            <div className={`flex items-center justify-center bg-black z-50 ${embedded ? 'relative w-full h-[600px] rounded-lg' : 'fixed inset-0'}`}>
                <div className="text-white text-center">
                    <p className="text-xl mb-4">Scene not found</p>
                    {!embedded && onClose && (
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`bg-black overflow-hidden ${isFullscreen
                ? 'fixed inset-0 z-[9999] w-screen h-screen'
                : embedded
                    ? 'relative w-full h-[600px] rounded-lg shadow-xl'
                    : 'fixed inset-0 z-50'
                }`}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        >
            {/* Close Button - Only show if not embedded */}
            {!embedded && onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-30 p-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full text-white transition-all"
                    title="Close Virtual Tour"
                >
                    <X className="w-6 h-6" />
                </button>
            )}

            {/* Tour Title */}
            <div className="absolute top-4 left-4 z-30 bg-black/50 backdrop-blur-sm px-6 py-3 rounded-lg">
                <h2 className="text-white text-lg font-semibold">{tour.tourName}</h2>
                <p className="text-gray-300 text-sm">{currentScene.name}</p>
                {is3DScene && <span className="text-orange-400 text-xs font-mono ml-2">HDR ENABLED</span>}
            </div>

            {/* Content Container */}
            <div
                className={`w-full h-full relative ${transitioning ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300`}
                onMouseDown={handleMouseDown}
            >
                {is3DScene ? (
                    /* 3D Viewer Implementation */
                    <VirtualTourViewer3D
                        scene={currentScene}
                        onHotspotClick={handleSceneChange}
                        initialRotation={currentScene.initialRotation}
                    />
                ) : (
                    /* Existing 2D Implementation */
                    <div className={`w-full h-full flex items-center justify-center cursor-grab ${isDragging ? 'cursor-grabbing' : ''}`}>
                        {loading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black">
                                <div className="text-white text-center">
                                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
                                    <p className="text-lg">Loading 360° View...</p>
                                </div>
                            </div>
                        )}
                        <div
                            className="relative w-full h-full overflow-hidden select-none"
                            style={{
                                transform: `scale(${zoom})`,
                                transition: 'transform 0.2s ease-out',
                            }}
                        >
                            <div
                                className="absolute inset-0"
                                style={{
                                    transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
                                    transformStyle: 'preserve-3d',
                                    transition: isDragging ? 'none' : 'transform 0.3s ease-out',
                                }}
                            >
                                <img
                                    src={currentScene.panoramaUrl}
                                    alt={currentScene.name}
                                    className="w-full h-full object-cover pointer-events-none"
                                    draggable={false}
                                    style={{
                                        minWidth: '100%',
                                        minHeight: '100%',
                                    }}
                                />
                            </div>

                            {/* Hotspots */}
                            <VirtualTourHotspots
                                hotspots={currentScene.hotspots}
                                onHotspotClick={handleSceneChange}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Scene List */}
            <VirtualTourSceneList
                scenes={tour.scenes}
                activeSceneId={currentSceneId}
                onSceneChange={handleSceneChange}
            />

            {/* Controls */}
            <VirtualTourControls
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onReset={handleReset}
                onToggleFullscreen={toggleFullscreen}
                isFullscreen={isFullscreen}
            />

            {/* Instructions Overlay (fades after 3 seconds) */}
            <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-sm px-6 py-3 rounded-lg text-white text-sm animate-pulse pointer-events-none">
                <p>🖱️ Drag to look around • Click hotspots to navigate</p>
            </div>
        </div>
    );
};

export default VirtualTourViewer;
