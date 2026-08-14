import assert from 'node:assert/strict';
import test from 'node:test';

import { StrictMode, createElement, useEffect } from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';

test('Leaflet React adapter survives StrictMode and updates markers, events, popups, and accessibility', async () => {
    const browserWindow = new Window({ url: 'https://estospaces.test/' });
    const globals = globalThis as typeof globalThis & Record<string, unknown>;
    const globalKeys = [
        'window',
        'document',
        'navigator',
        'HTMLElement',
        'HTMLDivElement',
        'HTMLImageElement',
        'SVGElement',
        'Element',
        'Node',
        'getComputedStyle',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'IS_REACT_ACT_ENVIRONMENT',
    ] as const;
    const previousDescriptors = new Map(
        globalKeys.map((key) => [key, Object.getOwnPropertyDescriptor(globalThis, key)]),
    );
    const browserGlobals: Record<string, unknown> = {
        window: browserWindow,
        document: browserWindow.document,
        navigator: browserWindow.navigator,
        HTMLElement: browserWindow.HTMLElement,
        HTMLDivElement: browserWindow.HTMLDivElement,
        HTMLImageElement: browserWindow.HTMLImageElement,
        SVGElement: browserWindow.SVGElement,
        Element: browserWindow.Element,
        Node: browserWindow.Node,
        getComputedStyle: browserWindow.getComputedStyle.bind(browserWindow),
        requestAnimationFrame: browserWindow.requestAnimationFrame.bind(browserWindow),
        cancelAnimationFrame: browserWindow.cancelAnimationFrame.bind(browserWindow),
        IS_REACT_ACT_ENVIRONMENT: true,
    };
    Object.entries(browserGlobals).forEach(([key, value]) => {
        Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    });

    const ReactLeaflet = await import('./leafletReact');
    const { default: L } = await import('leaflet');
    const browserHost = browserWindow.document.createElement('div');
    browserHost.style.width = '800px';
    browserHost.style.height = '600px';
    browserWindow.document.body.append(browserHost);
    const host = browserHost as unknown as HTMLDivElement;

    let currentMap: L.Map | null = null;
    let firstClickCount = 0;
    let secondClickCount = 0;
    let removeCount = 0;
    let bindPopupCount = 0;
    let unbindPopupCount = 0;
    const originalRemove = L.Map.prototype.remove;
    const originalBindPopup = L.Marker.prototype.bindPopup;
    const originalUnbindPopup = L.Marker.prototype.unbindPopup;

    L.Map.prototype.remove = function remove() {
        removeCount += 1;
        return originalRemove.call(this);
    };
    L.Marker.prototype.bindPopup = function bindPopup(...args: Parameters<typeof originalBindPopup>) {
        bindPopupCount += 1;
        return originalBindPopup.apply(this, args);
    };
    L.Marker.prototype.unbindPopup = function unbindPopup() {
        unbindPopupCount += 1;
        return originalUnbindPopup.call(this);
    };

    const Probe = () => {
        const map = ReactLeaflet.useMap();
        useEffect(() => {
            currentMap = map;
        }, [map]);
        return null;
    };
    const markerIcon = L.divIcon({ className: 'test-marker', html: '<span>Property</span>' });
    const renderScenario = (updated: boolean) => createElement(
        StrictMode,
        null,
        createElement(
            ReactLeaflet.MapContainer,
            { center: [51.5, -0.1], zoom: 12, style: { width: '800px', height: '600px' } },
            createElement(Probe),
            createElement(
                ReactLeaflet.Marker,
                {
                    position: updated ? [19.076, 72.8777] : [51.5, -0.1],
                    icon: markerIcon,
                    title: 'Accessible property marker',
                    alt: 'Property map marker',
                    keyboard: true,
                    draggable: updated,
                    eventHandlers: {
                        click: updated
                            ? () => { secondClickCount += 1; }
                            : () => { firstClickCount += 1; },
                    },
                },
                createElement(
                    ReactLeaflet.Popup,
                    null,
                    createElement('button', { type: 'button', id: 'popup-action' }, 'Open property'),
                ),
            ),
        ),
    );

    const root = createRoot(host);
    try {
        act(() => {
            root.render(renderScenario(false));
        });
        assert.ok(currentMap, 'map instance should be available to descendants');

        const getMarker = (): L.Marker => {
            const map = currentMap;
            assert.ok(map, 'map instance should be available to descendants');
            const layers: L.Layer[] = [];
            map.eachLayer((layer) => layers.push(layer));
            const found = layers.find((layer): layer is L.Marker => layer instanceof L.Marker);
            assert.ok(found, 'marker should be attached to the map');
            return found;
        };
        const marker = getMarker();
        marker.fire('click');
        assert.equal(firstClickCount, 1);
        assert.equal(secondClickCount, 0);
        assert.equal(marker.getElement()?.getAttribute('title'), 'Accessible property marker');
        assert.equal(marker.getElement()?.getAttribute('tabindex'), '0');
        assert.equal(marker.getElement()?.getAttribute('role'), 'button');
        assert.ok(bindPopupCount >= 1, 'popup should bind to its marker');

        act(() => {
            root.render(renderScenario(true));
        });
        const updatedMarker = getMarker();
        assert.deepEqual(
            [Number(updatedMarker.getLatLng().lat.toFixed(4)), Number(updatedMarker.getLatLng().lng.toFixed(4))],
            [19.076, 72.8777],
        );
        updatedMarker.fire('click');
        assert.equal(firstClickCount, 1, 'old event handler should be detached');
        assert.equal(secondClickCount, 1, 'new event handler should be active');
        assert.equal(updatedMarker.dragging?.enabled(), true);

        updatedMarker.openPopup();
        assert.equal(browserWindow.document.querySelector('#popup-action')?.textContent, 'Open property');
    } finally {
        act(() => {
            root.unmount();
        });
        L.Map.prototype.remove = originalRemove;
        L.Marker.prototype.bindPopup = originalBindPopup;
        L.Marker.prototype.unbindPopup = originalUnbindPopup;
        browserWindow.close();
        previousDescriptors.forEach((descriptor, key) => {
            if (descriptor) Object.defineProperty(globalThis, key, descriptor);
            else delete globals[key];
        });
    }

    assert.ok(removeCount >= 1, 'map should be removed during StrictMode cleanup/unmount');
    assert.ok(unbindPopupCount >= 1, 'popup should unbind during cleanup');
});
