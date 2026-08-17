import {
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
    type CSSProperties,
    type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import L, {
    type CircleMarkerOptions,
    type DivIcon,
    type Icon,
    type LatLngExpression,
    type LeafletEvent,
    type LeafletEventHandlerFnMap,
    type Map as LeafletMap,
    type Marker as LeafletMarker,
    type PathOptions,
} from 'leaflet';

const MapContext = createContext<LeafletMap | null>(null);
const LayerContext = createContext<L.Layer | null>(null);

interface MapContainerProps {
    center: LatLngExpression;
    zoom: number;
    children?: ReactNode;
    className?: string;
    style?: CSSProperties;
    dragging?: boolean;
    fadeAnimation?: boolean;
    markerZoomAnimation?: boolean;
    scrollWheelZoom?: boolean;
    zoomAnimation?: boolean;
    zoomControl?: boolean;
}

export function MapContainer({
    center,
    zoom,
    children,
    className,
    style,
    dragging = true,
    fadeAnimation = true,
    markerZoomAnimation = true,
    scrollWheelZoom = true,
    zoomAnimation = true,
    zoomControl = true,
}: MapContainerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<LeafletMap | null>(null);
    const initialOptions = useRef({
        center,
        zoom,
        dragging,
        fadeAnimation,
        markerZoomAnimation,
        scrollWheelZoom,
        zoomAnimation,
        zoomControl,
    });

    useEffect(() => {
        if (!containerRef.current) return;

        const nextMap = L.map(containerRef.current, initialOptions.current);
        setMap(nextMap);

        return () => {
            nextMap.remove();
        };
    }, []);

    return (
        <div ref={containerRef} className={className} style={style}>
            {map ? <MapContext.Provider value={map}>{children}</MapContext.Provider> : null}
        </div>
    );
}

export function useMap() {
    const map = useContext(MapContext);
    if (!map) throw new Error('Map components must be rendered inside MapContainer.');
    return map;
}

export function useMapEvent(event: string, handler: (event: LeafletEvent) => void) {
    const map = useMap();

    useEffect(() => {
        map.on(event, handler);
        return () => {
            map.off(event, handler);
        };
    }, [event, handler, map]);

    return map;
}

export function useMapEvents(handlers: LeafletEventHandlerFnMap) {
    const map = useMap();

    useEffect(() => {
        map.on(handlers);
        return () => {
            map.off(handlers);
        };
    }, [handlers, map]);

    return map;
}

interface TileLayerProps {
    url: string;
    attribution?: string;
    noWrap?: boolean;
}

export function TileLayer({ url, attribution, noWrap = false }: TileLayerProps) {
    const map = useMap();

    useEffect(() => {
        const layer = L.tileLayer(url, { attribution, noWrap }).addTo(map);
        return () => {
            layer.remove();
        };
    }, [attribution, map, noWrap, url]);

    return null;
}

interface MarkerProps {
    position: LatLngExpression;
    children?: ReactNode;
    icon?: Icon | DivIcon;
    draggable?: boolean;
    eventHandlers?: LeafletEventHandlerFnMap;
    title?: string;
    alt?: string;
    keyboard?: boolean;
}

export function Marker({
    position,
    children,
    icon,
    draggable = false,
    eventHandlers,
    title,
    alt,
    keyboard = true,
}: MarkerProps) {
    const map = useMap();
    const [marker, setMarker] = useState<LeafletMarker | null>(null);
    const initialPosition = useRef(position);
    const initialOptions = useRef({ icon, draggable, title, alt, keyboard });
    const latLng = L.latLng(position);

    useEffect(() => {
        const nextMarker = L.marker(initialPosition.current, initialOptions.current).addTo(map);
        setMarker(nextMarker);
        return () => {
            nextMarker.remove();
        };
    }, [map]);

    useEffect(() => {
        marker?.setLatLng([latLng.lat, latLng.lng]);
    }, [latLng.lat, latLng.lng, marker]);

    useEffect(() => {
        if (marker && icon) marker.setIcon(icon);
    }, [icon, marker]);

    useEffect(() => {
        if (!marker) return;
        if (draggable) marker.dragging?.enable();
        else marker.dragging?.disable();
    }, [draggable, marker]);

    useEffect(() => {
        if (!marker || !eventHandlers) return;
        marker.on(eventHandlers);
        return () => {
            marker.off(eventHandlers);
        };
    }, [eventHandlers, marker]);

    return marker ? <LayerContext.Provider value={marker}>{children}</LayerContext.Provider> : null;
}

interface CircleMarkerProps {
    center: LatLngExpression;
    radius?: number;
    pathOptions?: PathOptions;
    eventHandlers?: LeafletEventHandlerFnMap;
    children?: ReactNode;
}

export function CircleMarker({
    center,
    radius = 10,
    pathOptions,
    eventHandlers,
    children,
}: CircleMarkerProps) {
    const map = useMap();
    const [marker, setMarker] = useState<L.CircleMarker | null>(null);
    const initialCenter = useRef(center);
    const initialOptions = useRef<CircleMarkerOptions>({ ...pathOptions, radius });
    const latLng = L.latLng(center);

    useEffect(() => {
        const nextMarker = L.circleMarker(initialCenter.current, initialOptions.current).addTo(map);
        setMarker(nextMarker);
        return () => {
            nextMarker.remove();
        };
    }, [map]);

    useEffect(() => {
        marker?.setLatLng([latLng.lat, latLng.lng]);
    }, [latLng.lat, latLng.lng, marker]);

    useEffect(() => {
        marker?.setRadius(radius);
        if (pathOptions) marker?.setStyle(pathOptions);
    }, [marker, pathOptions, radius]);

    useEffect(() => {
        if (!marker || !eventHandlers) return;
        marker.on(eventHandlers);
        return () => {
            marker.off(eventHandlers);
        };
    }, [eventHandlers, marker]);

    return marker ? <LayerContext.Provider value={marker}>{children}</LayerContext.Provider> : null;
}

export function Popup({ children }: { children: ReactNode }) {
    const layer = useContext(LayerContext);
    const [container] = useState<HTMLDivElement | null>(() =>
        typeof document === 'undefined' ? null : document.createElement('div'),
    );

    useEffect(() => {
        if (!layer || !container || !('bindPopup' in layer)) return;
        const popupLayer = layer as LeafletMarker | L.CircleMarker;
        popupLayer.bindPopup(container);
        return () => {
            popupLayer.unbindPopup();
        };
    }, [container, layer]);

    return container ? createPortal(children, container) : null;
}
