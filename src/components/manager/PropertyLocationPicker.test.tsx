import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { Window } from 'happy-dom';

test('property map permits first-pin placement and resets its viewport when country changes', async () => {
  const window = new Window({ url: 'https://estospaces.test' });
  const globals = { window, document: window.document, navigator: window.navigator,
    HTMLElement: window.HTMLElement, Element: window.Element, Node: window.Node,
    getComputedStyle: window.getComputedStyle.bind(window), IS_REACT_ACT_ENVIRONMENT: true };
  const originals = new Map(Object.keys(globals).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(globals)) Object.defineProperty(globalThis, key, { configurable: true, value });
  const require = createRequire(import.meta.url);
  const originalCSS = require.extensions['.css'];
  require.extensions['.css'] = () => undefined;
  const { default: L } = await import('leaflet');
  const { default: Picker } = await import('./PropertyLocationPicker');
  let map: L.Map | undefined;
  const originalAddLayer = L.Map.prototype.addLayer;
  L.Map.prototype.addLayer = function (...args: Parameters<typeof originalAddLayer>) {
    map = this;
    return originalAddLayer.apply(this, args);
  };
  const host = window.document.createElement('div');
  window.document.body.append(host);
  const root = createRoot(host as unknown as HTMLDivElement);
  const changes: number[][] = [];
  const props = { busy: false, onFindAddress: () => undefined, onUseCurrentLocation: () => undefined,
    onLocationChange: (lat: number, lng: number) => changes.push([lat, lng]) };
  try {
    await act(async () => root.render(<Picker {...props} latitude={null} longitude={null} countryCode="IN" />));
    assert.ok(map);
    const placeAtCenter = [...host.querySelectorAll('button')].find(button => button.textContent === 'Place pin at map center');
    assert.ok(placeAtCenter, 'Keyboard users must have a first-pin placement action');
    map.setView([13.09, 80.28], 16, { animate: false });
    await act(async () => placeAtCenter.click());
    assert.deepEqual(changes, [[13.09, 80.28]], 'The action uses the panned map center, not a default coordinate');
    changes.length = 0;
    await act(async () => { map!.fire('click', { latlng: L.latLng(13.08, 80.27) }); });
    assert.deepEqual(changes, [[13.08, 80.27]], 'first click must work even when lookup is unavailable');
    await act(async () => root.render(<Picker {...props} latitude={13.08} longitude={80.27} countryCode="IN" />));
    const markers: L.Marker[] = [];
    map.eachLayer(layer => { if (layer instanceof L.Marker) markers.push(layer); });
    assert.equal(markers.length, 1);
    assert.equal(markers[0].dragging?.enabled(), true);
    await act(async () => { markers[0].setLatLng([13.081, 80.271]).fire('dragend'); });
    assert.deepEqual(changes[1], [13.081, 80.271]);
    await act(async () => root.render(<Picker {...props} latitude={null} longitude={null} countryCode="GB" />));
    assert.equal(map.getCenter().lat, 54.5);
    assert.equal(map.getCenter().lng, -3.4);
    assert.equal(map.getZoom(), 5);
    await act(async () => root.render(<Picker {...props} busy latitude={null} longitude={null} countryCode="GB" />));
    map.fire('click', { latlng: L.latLng(51.5, -0.1) });
    assert.equal(changes.length, 2, 'pending lookup must not accept clicks');
    const busyPlacement = [...host.querySelectorAll('button')].find(button => button.textContent === 'Place pin at map center');
    assert.equal(busyPlacement?.disabled, true);
    await act(async () => busyPlacement?.click());
    assert.equal(changes.length, 2, 'pending lookup must not accept keyboard placement');
    await act(async () => root.render(<Picker {...props} disabled latitude={null} longitude={null} countryCode="GB" />));
    assert.equal([...host.querySelectorAll('button')].find(button => button.textContent === 'Place pin at map center')?.disabled, true);
    await act(async () => root.render(<Picker {...props} latitude={null} longitude={null} countryCode="" />));
    assert.equal([...host.querySelectorAll('button')].find(button => button.textContent === 'Place pin at map center')?.disabled, true);
  } finally {
    await act(async () => root.unmount());
    L.Map.prototype.addLayer = originalAddLayer;
    if (originalCSS) require.extensions['.css'] = originalCSS;
    else delete require.extensions['.css'];
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
    await window.happyDOM.close();
  }
});
