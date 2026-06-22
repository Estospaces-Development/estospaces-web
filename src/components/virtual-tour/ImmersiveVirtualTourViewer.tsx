import React, { useMemo, useState } from 'react';
import { Aperture, Compass, Layers3, Map, Maximize2, Navigation, Share2 } from 'lucide-react';

export interface PublicVirtualTourRoom {
    id: string;
    tour_id: string;
    room_name: string;
    panorama_url: string;
    thumbnail_url?: string;
    source_capture_type?: 'uploaded_360' | 'phone_sphere' | 'photo_ring' | 'room_photo';
    stitch_status?: 'queued' | 'processing' | 'stitched' | 'failed';
    stitched_panorama_url?: string;
    stitched_thumbnail_url?: string;
    stitch_quality_score?: number;
    top_view_x?: number;
    top_view_y?: number;
    top_view_rotation?: number;
    sort_order: number;
    initial_yaw?: number;
    initial_pitch?: number;
}

export interface PublicVirtualTourHotspot {
    id: string;
    tour_id: string;
    from_room_id: string;
    to_room_id: string;
    label: string;
    x_position: number;
    y_position: number;
}

export interface PublicVirtualTour {
    id: string;
    property_id: string;
    manager_id?: string;
    status: 'draft' | 'published';
    public_url?: string;
    cover_room_id?: string;
    rooms: PublicVirtualTourRoom[];
    hotspots: PublicVirtualTourHotspot[];
}

interface ImmersiveVirtualTourViewerProps {
    tour: PublicVirtualTour;
    propertyTitle?: string;
}

function clampPercent(value: number) {
    return Math.min(96, Math.max(4, value));
}

function yawPitchToScreenPosition(yaw: number, pitch: number) {
    return {
        left: clampPercent(((yaw + 180) / 360) * 100),
        top: clampPercent(((90 - pitch) / 180) * 100),
    };
}

function getTrue360Url(room?: PublicVirtualTourRoom) {
    if (!room) return '';
    if (room.stitch_status === 'stitched') {
        return room.stitched_panorama_url || room.panorama_url;
    }
    if (!room.stitch_status && !room.source_capture_type) {
        return room.panorama_url;
    }
    return '';
}

function pannellumUrl(panoramaUrl: string, title: string) {
    const params = new URLSearchParams({
        panorama: panoramaUrl,
        autoLoad: 'true',
        autoRotate: '-2',
        title,
        hfov: '95',
    });
    return `https://cdn.pannellum.org/2.5/pannellum.htm#${params.toString()}`;
}

function roomNodePosition(room: PublicVirtualTourRoom, index: number, total: number) {
    if (typeof room.top_view_x === 'number' && typeof room.top_view_y === 'number') {
        return {
            left: clampPercent(room.top_view_x),
            top: clampPercent(room.top_view_y),
        };
    }
    const angle = total <= 1 ? -Math.PI / 2 : (index / total) * Math.PI * 2 - Math.PI / 2;
    const radius = total <= 2 ? 24 : 34;
    return {
        left: 50 + Math.cos(angle) * radius,
        top: 50 + Math.sin(angle) * radius,
    };
}

export default function ImmersiveVirtualTourViewer({ tour, propertyTitle = 'Estospaces property' }: ImmersiveVirtualTourViewerProps) {
    const orderedRooms = useMemo(
        () => [...(tour.rooms || [])].sort((left, right) => left.sort_order - right.sort_order),
        [tour.rooms],
    );
    const initialRoomIndex = Math.max(
        0,
        orderedRooms.findIndex((room) => room.id === tour.cover_room_id),
    );
    const [activeRoomId, setActiveRoomId] = useState(orderedRooms[initialRoomIndex]?.id || orderedRooms[0]?.id || '');
    const [mode, setMode] = useState<'explore' | 'floorplan'>('explore');

    const activeRoom = orderedRooms.find((room) => room.id === activeRoomId) || orderedRooms[0];
    const roomHotspots = (tour.hotspots || []).filter((hotspot) => hotspot.from_room_id === activeRoom?.id);
    const activePanoramaUrl = getTrue360Url(activeRoom);

    if (!activeRoom) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-950 px-6 text-center text-white">
                <div>
                    <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-300">
                        <Layers3 />
                    </div>
                    <h1 className="text-2xl font-black">Tour is not ready yet</h1>
                    <p className="mt-3 max-w-md text-sm font-medium text-gray-400">
                        The manager has not added any 360 rooms to this Estospaces tour.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <main className="relative min-h-screen overflow-hidden bg-gray-950 text-white">
            <div className="absolute inset-0 bg-gray-950" />

            <header className="relative z-20 flex items-center justify-between px-4 py-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-3 rounded-full bg-black/35 px-4 py-3 backdrop-blur-md">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500 text-white">
                        <Compass size={20} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-200">
                            Estospaces 360
                        </p>
                        <h1 className="truncate text-base font-black sm:text-lg">{propertyTitle}</h1>
                    </div>
                </div>

                <div className="flex items-center gap-2 rounded-full bg-black/35 p-1 backdrop-blur-md">
                    <button
                        type="button"
                        onClick={() => setMode('explore')}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition ${
                            mode === 'explore' ? 'bg-orange-500 text-white' : 'text-white/75 hover:bg-white/10'
                        }`}
                    >
                        <Navigation size={15} />
                        Explore
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('floorplan')}
                        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black transition ${
                            mode === 'floorplan' ? 'bg-orange-500 text-white' : 'text-white/75 hover:bg-white/10'
                        }`}
                    >
                        <Map size={15} />
                        Top view
                    </button>
                </div>
            </header>

            {mode === 'explore' ? (
                <section className="relative z-10 min-h-[calc(100vh-180px)]">
                    {activePanoramaUrl ? (
                        <iframe
                            title={`${activeRoom.room_name} true 360 viewer`}
                            src={pannellumUrl(activePanoramaUrl, activeRoom.room_name)}
                            className="absolute inset-0 h-full w-full border-0"
                            allow="fullscreen; gyroscope; accelerometer; xr-spatial-tracking"
                            allowFullScreen
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-gray-950 px-6 text-center">
                            <div>
                                <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/15 text-orange-300">
                                    <Aperture />
                                </div>
                                <h2 className="text-2xl font-black">360 panorama is processing</h2>
                                <p className="mt-3 max-w-md text-sm font-semibold text-gray-400">
                                    This room will unlock spherical rotation after the stitched 2:1 panorama is ready.
                                </p>
                            </div>
                        </div>
                    )}

                    <div className="absolute left-4 bottom-4 z-20 h-32 w-32 rounded-[1.5rem] border border-white/25 bg-white/90 p-2 text-gray-950 shadow-2xl backdrop-blur">
                        <p className="mb-1 text-[9px] font-black uppercase tracking-[0.18em] text-orange-600">Mini map</p>
                        <div className="relative h-[5.75rem] rounded-2xl bg-orange-50">
                            {orderedRooms.map((room, index) => {
                                const position = roomNodePosition(room, index, orderedRooms.length);
                                const active = room.id === activeRoom.id;
                                return (
                                    <button
                                        key={room.id}
                                        type="button"
                                        aria-label={`Open ${room.room_name}`}
                                        onClick={() => setActiveRoomId(room.id)}
                                        className={`absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-black transition ${
                                            active ? 'bg-orange-500 text-white' : 'bg-white text-gray-700 shadow'
                                        }`}
                                        style={{ left: `${position.left}%`, top: `${position.top}%` }}
                                    >
                                        {index + 1}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {activePanoramaUrl && roomHotspots.map((hotspot) => {
                        const targetRoom = orderedRooms.find((room) => room.id === hotspot.to_room_id);
                        const position = yawPitchToScreenPosition(hotspot.x_position, hotspot.y_position);
                        return (
                            <button
                                key={hotspot.id}
                                type="button"
                                aria-label={`Go to ${hotspot.label}`}
                                onClick={() => setActiveRoomId(hotspot.to_room_id)}
                                className="absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500 px-4 py-3 text-sm font-black text-white shadow-2xl shadow-black/40 ring-4 ring-white/25 transition hover:scale-105"
                                style={{ left: `${position.left}%`, top: `${position.top}%` }}
                            >
                                {targetRoom?.room_name || hotspot.label}
                            </button>
                        );
                    })}
                </section>
            ) : (
                <section className="relative z-10 flex min-h-[calc(100vh-180px)] items-center justify-center px-4">
                    <div className="grid w-full max-w-4xl gap-3 rounded-[2rem] border border-white/15 bg-black/45 p-5 shadow-2xl backdrop-blur-md sm:grid-cols-2 lg:grid-cols-3">
                        {orderedRooms.map((room, index) => (
                            <button
                                key={room.id}
                                type="button"
                                onClick={() => {
                                    setActiveRoomId(room.id);
                                    setMode('explore');
                                }}
                                className={`flex items-center justify-between rounded-2xl border px-4 py-4 text-left transition ${
                                    room.id === activeRoom.id
                                        ? 'border-orange-400 bg-orange-500 text-white'
                                        : 'border-white/10 bg-white/10 text-white hover:bg-white/15'
                                }`}
                            >
                                <span>
                                    <span className="block text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
                                        Room {index + 1}
                                    </span>
                                    <span className="mt-1 block text-sm font-black">{room.room_name}</span>
                                </span>
                                <Maximize2 size={18} />
                            </button>
                        ))}
                    </div>
                </section>
            )}

            <footer className="relative z-20 border-t border-white/10 bg-black/45 px-4 py-4 backdrop-blur-md sm:px-6">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-orange-200">
                            Current room
                        </p>
                        <h2 className="mt-1 text-2xl font-black">{activeRoom.room_name}</h2>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {orderedRooms.map((room) => (
                            <button
                                key={room.id}
                                type="button"
                                onClick={() => setActiveRoomId(room.id)}
                                className={`whitespace-nowrap rounded-full px-4 py-3 text-sm font-bold transition ${
                                    room.id === activeRoom.id
                                        ? 'bg-orange-500 text-white'
                                        : 'bg-white/10 text-white/75 hover:bg-white/15'
                                }`}
                            >
                                {room.room_name}
                            </button>
                        ))}
                    </div>

                    {tour.public_url ? (
                        <a
                            href={tour.public_url}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-black text-gray-950 transition hover:bg-orange-50"
                        >
                            <Share2 size={16} />
                            Share tour
                        </a>
                    ) : null}
                </div>
            </footer>
        </main>
    );
}
