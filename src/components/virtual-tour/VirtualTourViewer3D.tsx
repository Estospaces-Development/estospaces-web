
"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { VirtualTourScene } from '../../mocks/virtualTourMock';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

interface VirtualTourViewer3DProps {
    scene: VirtualTourScene;
    onHotspotClick: (targetSceneId: string) => void;
    initialRotation?: { x: number; y: number };
}

const VirtualTourViewer3D: React.FC<VirtualTourViewer3DProps> = ({
    scene,
    onHotspotClick,
    initialRotation = { x: 0, y: 0 }
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const controlsRef = useRef<OrbitControls | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Initialize Scene
        const scene3D = new THREE.Scene();
        sceneRef.current = scene3D;

        // Initialize Camera
        const camera = new THREE.PerspectiveCamera(
            75,
            containerRef.current.clientWidth / containerRef.current.clientHeight,
            0.1,
            1000
        );
        camera.position.set(0, 0, 0.1); // Inside the sphere
        cameraRef.current = camera;

        // Initialize Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        // Important for EXR (HDR)
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        // Initialize Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.rotateSpeed = -0.5; // Invert drag for "looking around" feel
        controls.enableZoom = true;
        controls.zoomSpeed = 1.2;
        controls.maxDistance = 1; // Keep inside
        controls.minDistance = 0.1;
        controlsRef.current = controls;

        // Handle Window Resize
        const handleResize = () => {
            if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
            const width = containerRef.current.clientWidth;
            const height = containerRef.current.clientHeight;
            cameraRef.current.aspect = width / height;
            cameraRef.current.updateProjectionMatrix();
            rendererRef.current.setSize(width, height);
        };
        window.addEventListener('resize', handleResize);

        // Animation Loop
        const animate = () => {
            requestAnimationFrame(animate);
            controls.update();
            if (rendererRef.current && sceneRef.current && cameraRef.current) {
                rendererRef.current.render(sceneRef.current, cameraRef.current);
            }
            // updateHotspotPositions(); // Not implemented in port yet
        };
        animate();

        return () => {
            window.removeEventListener('resize', handleResize);
            if (containerRef.current && rendererRef.current) {
                containerRef.current.removeChild(rendererRef.current.domElement);
            }
            renderer.dispose();
            controls.dispose();
        };
    }, []);

    // Load Texture when scene changes
    useEffect(() => {
        if (!sceneRef.current || !scene.panoramaUrl) return;

        setLoading(true);
        setError(null);

        // Clear previous mesh
        while (sceneRef.current.children.length > 0) {
            sceneRef.current.remove(sceneRef.current.children[0]);
        }

        const loadTexture = () => {
            if (scene.type === 'exr') {
                const loader = new EXRLoader();
                loader.load(
                    scene.panoramaUrl,
                    (texture) => {
                        texture.mapping = THREE.EquirectangularReflectionMapping;

                        // Create Sphere
                        const geometry = new THREE.SphereGeometry(500, 60, 40);
                        geometry.scale(-1, 1, 1); // Invert scale to view from inside

                        const material = new THREE.MeshBasicMaterial({ map: texture });
                        const mesh = new THREE.Mesh(geometry, material);

                        sceneRef.current?.add(mesh);
                        setLoading(false);

                    },
                    (xhr) => {
                        // console.log((xhr.loaded / xhr.total * 100) + '% loaded');
                    },
                    (err) => {
                        console.error('An error occurred loading EXR', err);
                        setError('Failed to load high-quality 360 view');
                        setLoading(false);
                    }
                );
            } else {
                // Fallback for standard images (JPG/PNG)
                const textureLoader = new THREE.TextureLoader();
                textureLoader.load(
                    scene.panoramaUrl,
                    (texture) => {
                        const geometry = new THREE.SphereGeometry(500, 60, 40);
                        geometry.scale(-1, 1, 1);
                        const material = new THREE.MeshBasicMaterial({ map: texture });
                        const mesh = new THREE.Mesh(geometry, material);
                        sceneRef.current?.add(mesh);
                        setLoading(false);
                    },
                    undefined,
                    (err) => {
                        console.error('Error loading texture', err);
                        setError('Failed to load 360 view');
                        setLoading(false);
                    }
                );
            }
        };

        loadTexture();

    }, [scene]);

    // Hotspots (simplified port - using Sprites or just overlay)
    useEffect(() => {
        if (!sceneRef.current || !scene.hotspots) return;

        const hotspotGroup = new THREE.Group();
        sceneRef.current.add(hotspotGroup);

        scene.hotspots.forEach(hotspot => {
            // Convert percent x,y to spherical coordinates
            const phi = THREE.MathUtils.degToRad(90 - (hotspot.position.y / 100 * 180 - 90)); // vertical
            const theta = THREE.MathUtils.degToRad(hotspot.position.x / 100 * 360); // horizontal

            const radius = 400;

            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.cos(phi);
            const z = radius * Math.sin(phi) * Math.sin(theta);

            // Simple Circle Geometry for hotspot
            const geometry = new THREE.CircleGeometry(15, 32);
            const material = new THREE.MeshBasicMaterial({
                color: 0xff6b00,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
            });
            const circle = new THREE.Mesh(geometry, material);

            circle.position.set(-x, y, z);
            circle.lookAt(0, 0, 0);

            circle.userData = { isHotspot: true, targetId: hotspot.targetSceneId, label: hotspot.label };

            hotspotGroup.add(circle);
        });

        return () => {
            sceneRef.current?.remove(hotspotGroup);
        };

    }, [scene]);

    // Raycaster for clicks
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleMouseClick = (event: React.MouseEvent) => {
        if (!containerRef.current || !cameraRef.current || !sceneRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, cameraRef.current);

        const intersects = raycaster.intersectObjects(sceneRef.current.children, true);

        for (let i = 0; i < intersects.length; i++) {
            if (intersects[i].object.userData.isHotspot) {
                onHotspotClick(intersects[i].object.userData.targetId);
                return;
            }
        }
    };


    return (
        <div ref={containerRef} className="w-full h-full relative" onClick={handleMouseClick}>
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
                    <div className="text-white text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
                        <p>Loading High-Quality Experience...</p>
                    </div>
                </div>
            )}
            {error && (
                <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
                    <p className="text-red-500">{error}</p>
                </div>
            )}
        </div>
    );
};

export default VirtualTourViewer3D;
