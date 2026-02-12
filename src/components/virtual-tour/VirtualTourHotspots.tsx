
"use client";

import React, { useState } from 'react';
import { MoveRight } from 'lucide-react';
import { VirtualTourHotspot } from '../../mocks/virtualTourMock';

interface VirtualTourHotspotsProps {
    hotspots: VirtualTourHotspot[];
    onHotspotClick: (targetSceneId: string) => void;
}

const VirtualTourHotspots: React.FC<VirtualTourHotspotsProps> = ({
    hotspots,
    onHotspotClick,
}) => {
    const [hoveredHotspot, setHoveredHotspot] = useState<string | null>(null);

    return (
        <>
            {hotspots.map((hotspot) => (
                <div
                    key={hotspot.id}
                    className="absolute z-10 cursor-pointer"
                    style={{
                        left: `${hotspot.position.x}%`,
                        top: `${hotspot.position.y}%`,
                        transform: 'translate(-50%, -50%)',
                    }}
                    onMouseEnter={() => setHoveredHotspot(hotspot.id)}
                    onMouseLeave={() => setHoveredHotspot(null)}
                    onClick={(e) => {
                        e.stopPropagation();
                        onHotspotClick(hotspot.targetSceneId);
                    }}
                >
                    {/* Hotspot Marker */}
                    <div className="relative">
                        {/* Pulsing Ring Animation */}
                        <div className="absolute inset-0 animate-ping">
                            <div className="w-12 h-12 bg-orange-500/30 rounded-full"></div>
                        </div>

                        {/* Main Hotspot Circle */}
                        <div
                            className={`relative w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center shadow-lg transition-all ${hoveredHotspot === hotspot.id ? 'scale-125' : 'scale-100'
                                }`}
                        >
                            <MoveRight className="w-6 h-6 text-white" />
                        </div>

                        {/* Label Tooltip */}
                        {hoveredHotspot === hotspot.id && (
                            <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-black/90 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-xl">
                                {hotspot.label}
                                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-black/90"></div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </>
    );
};

export default VirtualTourHotspots;
