
"use client";

import React from 'react';
import { VirtualTourScene } from '../../mocks/virtualTourMock';

interface VirtualTourSceneListProps {
    scenes: VirtualTourScene[];
    activeSceneId: string;
    onSceneChange: (sceneId: string) => void;
}

const VirtualTourSceneList: React.FC<VirtualTourSceneListProps> = ({
    scenes,
    activeSceneId,
    onSceneChange,
}) => {
    return (
        <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 bg-black/50 backdrop-blur-sm rounded-lg p-3 max-h-[400px] overflow-y-auto w-64">
            <h3 className="text-white text-sm font-semibold mb-3 px-2">Rooms</h3>
            <div className="space-y-2">
                {scenes.map((scene) => (
                    <button
                        key={scene.id}
                        onClick={() => onSceneChange(scene.id)}
                        className={`w-full text-left px-4 py-3 rounded-lg transition-all ${scene.id === activeSceneId
                            ? 'bg-orange-500 text-white shadow-lg'
                            : 'bg-white/10 text-gray-300 hover:bg-white/20 hover:text-white'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className={`w-2 h-2 rounded-full ${scene.id === activeSceneId ? 'bg-white' : 'bg-gray-400'
                                    }`}
                            ></div>
                            <span className="font-medium">{scene.name}</span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default VirtualTourSceneList;
